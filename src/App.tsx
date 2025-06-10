import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import "./styles.css";

const client = generateClient<Schema>();

function App() {
  const [aiApps, setAiApps] = useState<Array<Schema["AIApp"]["type"]>>([]);
  const [filteredApps, setFilteredApps] = useState<Array<Schema["AIApp"]["type"]>>([]);
  const [selectedUseCase, setSelectedUseCase] = useState<string>("");
  
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
        setFilteredApps(normalizedItems);
      },
    });
  }, []);
  
  // Filter apps when selected use case changes and sort by region (Finland first)
  useEffect(() => {
    let filtered = selectedUseCase === "" 
      ? [...aiApps] 
      : aiApps.filter(app => {
          if (!app.useCase) return false;
          
          // Split usecases by comma and check if any match the selected usecase
          const useCases = app.useCase.split(',').map(uc => uc.trim().toLowerCase());
          return useCases.includes(selectedUseCase.toLowerCase());
        });
    
    // Sort by region: Finland first, then Europe
    filtered.sort((a, b) => {
      if (a.region === "Finland" && b.region !== "Finland") return -1;
      if (a.region !== "Finland" && b.region === "Finland") return 1;
      return 0;
    });
    
    setFilteredApps(filtered);
  }, [selectedUseCase, aiApps]);

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
    
    client.models.AIApp.create(submission);
    
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
        <div className="filter-container">
          <select 
            value={selectedUseCase} 
            onChange={(e) => setSelectedUseCase(e.target.value)}
            className="use-case-filter"
          >
            <option value="">All Use Cases</option>
            {Array.from(
              // Create a case-insensitive map of lowercase -> display case
              aiApps.flatMap(app => 
                app.useCase ? 
                  app.useCase.split(',').map(uc => uc.trim()) : 
                  []
              )
              .filter(useCase => useCase)
              .reduce((map, useCase) => {
                const lowerCase = useCase.toLowerCase();
                // Keep the first occurrence or the capitalized version if it exists
                if (!map.has(lowerCase) || useCase.charAt(0) === useCase.charAt(0).toUpperCase()) {
                  map.set(lowerCase, useCase);
                }
                return map;
              }, new Map())
            )
              .sort((a, b) => a[1].localeCompare(b[1]))
              .map(([key, displayValue]) => (
                <option key={key} value={displayValue}>{displayValue}</option>
              ))
            }
          </select>
        </div>
        <div className="add-new-container">
          <span className="add-label">Add your own</span>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ new"}
          </button>
        </div>
      </div>
      
      {showForm && (
        <form onSubmit={handleSubmit} style={{ margin: "20px 0" }}>
          <p style={{ color: "red", marginBottom: "15px" }}>New entries go through a manual approval process before being visible on the site.</p>
          <div>
            <label>Name*: </label>
            <input 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              maxLength={40}
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
              maxLength={60}
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
          <div className="consent-checkbox" style={{ margin: "20px 0" }}>
            <label>
              <input type="checkbox" required />
              I consent to the processing of my email for publishing or contacting purposes, as described in the privacy policy.
            </label>
          </div>
          <button type="submit">Submit</button>
        </form>
      )}
      
      <div className="app-list">
        {filteredApps.map((app) => (
          <div key={app.id} className="app-item">
            <img 
              src={app.imageKey && app.imageKey.trim() !== '' 
                ? app.imageKey 
                : "/aimarketplace-logo.png"}
              alt={app.imageKey && app.imageKey.trim() !== '' ? `${app.name} Logo` : "AI Marketplace Logo"} 
              className="app-logo" 
            />
            <div className="app-header">
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
              <p className="app-description">{app?.description || ''}</p>
            </div>
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