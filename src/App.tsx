import { useEffect, useState, useRef } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import "./styles.css";
import ReCAPTCHA from "react-google-recaptcha";

const client = generateClient<Schema>();

function App() {
  const [aiApps, setAiApps] = useState<Array<Schema["AIApp"]["type"]>>([]);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  
  // Load rate limit data from localStorage on component mount
  useEffect(() => {
    try {
      const storedRateLimit = localStorage.getItem('aiMarketplaceRateLimit');
      if (storedRateLimit) {
        const parsedData = JSON.parse(storedRateLimit);
        if (Array.isArray(parsedData)) {
          // Filter out expired timestamps
          const now = Date.now();
          RATE_LIMIT.submissions = parsedData.filter(time => now - time < RATE_LIMIT.timeWindow);
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    client.models.AIApp.observeQuery({
      filter: {
        active: {
          eq: true
        }
      }
    }).subscribe({
      next: (data) => {
        // Normalize data to ensure no null/undefined values
        const normalizedItems = data.items
          .filter(item => item !== null && item !== undefined)
          .map(item => ({
            ...item,
            name: item.name || '',
            url: item.url || '',
            description: item.description || '',
            useCase: item.useCase || '',
            region: item.region || '',
            imageKey: item.imageKey || '',
            addedBy: item.addedBy || '',
            addedByEmail: item.addedByEmail || ''
          }));
        setAiApps(normalizedItems);
      },
    });
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    description: "",
    useCase: "",
    region: "",
    imageKey: "",
    addedBy: "",
    addedByEmail: ""
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Verify CAPTCHA
    if (!captchaToken) {
      alert("Please complete the CAPTCHA verification");
      return;
    }
    
    // Apply rate limiting
    const now = Date.now();
    // Remove submissions older than the time window
    RATE_LIMIT.submissions = RATE_LIMIT.submissions.filter(time => now - time < RATE_LIMIT.timeWindow);
    
    // Check if user has exceeded the rate limit
    if (RATE_LIMIT.submissions.length >= RATE_LIMIT.maxSubmissions) {
      alert(`Rate limit exceeded. Please try again later. Maximum ${RATE_LIMIT.maxSubmissions} submissions per hour.`);
      return;
    }
    
    // Validate required fields client-side
    if (!formData.name || !formData.url || 
        !formData.description || !formData.useCase || !formData.region ||
        !formData.addedBy || !formData.addedByEmail) {
      alert("Please fill in all required fields");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.addedByEmail)) {
      alert("Please enter a valid email address");
      return;
    }
    
    // Basic input sanitization
    const sanitizedData = {
      name: formData.name.trim().slice(0, 40),
      url: validateUrl(formData.url.trim()) ? 
        (/^https?:\/\//i.test(formData.url.trim()) ? formData.url.trim() : 'https://' + formData.url.trim()) : '',
      description: formData.description.trim().slice(0, 200),
      useCase: formData.useCase.trim().slice(0, 60),
      region: formData.region,
      imageKey: formData.imageKey ? validateUrl(formData.imageKey.trim()) ? 
        (/^https?:\/\//i.test(formData.imageKey.trim()) ? formData.imageKey.trim() : 'https://' + formData.imageKey.trim()) : '' : undefined,
      addedBy: formData.addedBy.trim().slice(0, 100),
      addedByEmail: formData.addedByEmail.trim().slice(0, 100),
      active: false // Explicitly set to false for new items - requires admin approval
    };
    
    // Validate URL format
    if (!sanitizedData.url) {
      alert("Please enter a valid URL");
      return;
    }
    
    // Honeypot check (would need to add a hidden honeypot field to the form)
    // if (honeypotField.value) return; // Bot detected
    
    // Add submission timestamp for audit
    const submission = {
      ...sanitizedData,
      submittedAt: new Date().toISOString()
    };
    
    // Record this submission for rate limiting
    RATE_LIMIT.submissions.push(now);
    
    // Store rate limit info in localStorage to persist between page refreshes
    try {
      localStorage.setItem('aiMarketplaceRateLimit', JSON.stringify(RATE_LIMIT.submissions));
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // Include captcha token with submission
    const submissionWithCaptcha = {
      ...submission,
      captchaToken // This could be verified server-side
    };
    
    client.models.AIApp.create(submissionWithCaptcha);
    
    // Reset captcha after submission
    setCaptchaToken(null);
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
    setFormData({
      name: "",
      url: "",
      description: "",
      useCase: "",
      region: "",
      imageKey: "",
      addedBy: "",
      addedByEmail: ""
    });
    setShowForm(false);
  }

  return (
    <main>
      <div className="header">
        <div className="title-container">
          <h1>AI Marketplace Finland</h1>
          <p className="subheader">A collection of Finnish and European AI services</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ new"}
        </button>
      </div>
      
      {showForm && (
        <form onSubmit={handleSubmit} style={{ margin: "20px 0" }}>
          <div>
            <label>Name*: </label>
            <input 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div>
            <label>URL*: </label>
            <input 
              name="url" 
              value={formData.url} 
              onChange={handleChange} 
              required 
              maxLength={200}
            />
          </div>
          <div>
            <label>Description*: </label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange}
              required
              maxLength={200}
            />
          </div>
          <div>
            <label>Use Case*: </label>
            <input 
              name="useCase" 
              value={formData.useCase} 
              onChange={handleChange}
              required
              title="Collaboration tool, chatbot etc"
            />
          </div>
          <div>
            <label>Region*: </label>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
              required
            >
              <option value="">Select region</option>
              <option value="Finland">Finland</option>
              <option value="Europe">Europe</option>
            </select>
          </div>
          <div>
            <label>Logo URL: </label>
            <input 
              name="imageKey" 
              value={formData.imageKey} 
              onChange={handleChange} 
              maxLength={200}
            />
          </div>
          <div>
            <label>Your name*: </label>
            <input 
              name="addedBy" 
              value={formData.addedBy} 
              onChange={handleChange}
              required
              maxLength={100}
            />
          </div>
          <div>
            <label>Your email*: </label>
            <input 
              name="addedByEmail" 
              type="email"
              value={formData.addedByEmail} 
              onChange={handleChange}
              required
              maxLength={100}
            />
          </div>
          <div style={{ margin: "20px 0" }}>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey="6Le_clcrAAAAAMXdyJPBfmYI36E3A_j-ZJcrt-DA" 
              onChange={(token: string | null) => setCaptchaToken(token)}
            />
          </div>
          <div className="consent-checkbox" style={{ margin: "20px 0" }}>
            <label>
              <input type="checkbox" required />
              I consent to the processing of my email for publishing or contacting purposes, as described in the <a href="/privacy-policy.html" target="_blank">privacy policy</a>.
            </label>
          </div>
          <button type="submit">Submit</button>
        </form>
      )}
      
      <div className="app-list">
        {aiApps.map((app) => (
          <div key={app.id} className="app-item">
            <img 
              src={app.imageKey && app.imageKey.trim() !== '' 
                ? app.imageKey 
                : "https://aimarketplacefi.s3.eu-central-1.amazonaws.com/aimarketplace-logo.png"}
              alt={app.imageKey && app.imageKey.trim() !== '' ? `${app.name} Logo` : "AI Marketplace Logo"} 
              className="app-logo" 
            />
            <h3>
              {app?.name || ''}
              {app?.region === 'Finland' && (
                <img 
                  src="/finnishflag.png" 
                  alt="Finnish flag" 
                  className="flag-icon" 
                />
              )}
            </h3>

            <p>{app?.description || ''}</p>
            <div className="app-details">
              <p><strong>URL:</strong> <a href={app?.url || '#'} target="_blank" rel="noopener noreferrer">{app?.url || ''}</a></p>
              <p><strong>Use Case:</strong> {app?.useCase || ''}</p>
              <p><strong>Region:</strong> {app?.region || ''}</p>
            </div>
          </div>
        ))}
      </div>
      
      <footer>
        © 2025 AI Marketplace Finland. All rights reserved. | <a href="/privacy-policy.html">Tietosuojaseloste</a> | <a href="/privacy-policy-en.html">Privacy Policy</a>
      </footer>
    </main>
  );
}

export default App;
// Function to validate URL format
function validateUrl(url: string): boolean {
  // Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch (e) {
    return false;
  }
}
// Simple rate limiting implementation
const RATE_LIMIT = {
  maxSubmissions: 10,
  timeWindow: 60 * 60 * 1000, // 1 hour in milliseconds
  submissions: [] as number[]
};