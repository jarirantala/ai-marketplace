import { useEffect, useState } from "react";
import "./styles.css";

// Define AIApp type (match your backend schema)
type AIApp = {
  id: string;
  name: string;
  url: string;
  description: string;
  useCase: string;
  region: string;
  imageKey?: string;
  addedBy: string;
  addedByEmail: string;
  active: boolean;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
};

const API_URL = "https://vvd7vbp3y9.execute-api.eu-central-1.amazonaws.com/default/items";

function App() {
  const [aiApps, setAiApps] = useState<AIApp[]>([]);
  const [filteredApps, setFilteredApps] = useState<AIApp[]>([]);
  const [selectedUseCase, setSelectedUseCase] = useState<string>("");

  // Load rate limit data from localStorage on component mount
  useEffect(() => {
    try {
      const storedRateLimit = localStorage.getItem('aiMarketplaceRateLimit');
      if (storedRateLimit) {
        const parsedData = JSON.parse(storedRateLimit);
        if (Array.isArray(parsedData)) {
          const now = Date.now();
          RATE_LIMIT.submissions = parsedData.filter(time => now - time < RATE_LIMIT.timeWindow);
        }
      }
    } catch (e) {}
  }, []);

  // Fetch AIApps from your backend API
  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        // Only show active apps
        const normalizedItems = data
          .filter((item: AIApp) => item && item.active)
          .map((item: AIApp) => ({
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
      });
  }, []);

  useEffect(() => {
    let filtered = selectedUseCase === "" 
      ? [...aiApps] 
      : aiApps.filter(app => {
          if (!app.useCase) return false;
          const useCases = app.useCase.split(',').map(uc => uc.trim().toLowerCase());
          return useCases.includes(selectedUseCase.toLowerCase());
        });
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

    const now = Date.now();
    RATE_LIMIT.submissions = RATE_LIMIT.submissions.filter(time => now - time < RATE_LIMIT.timeWindow);

    if (RATE_LIMIT.submissions.length >= RATE_LIMIT.maxSubmissions) {
      alert(`Rate limit exceeded. Please try again later. Maximum ${RATE_LIMIT.maxSubmissions} submissions per hour.`);
      return;
    }

    if (!formData.name || !formData.url || 
        !formData.description || !formData.useCase || !formData.region ||
        !formData.addedBy || !formData.addedByEmail) {
      alert("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.addedByEmail)) {
      alert("Please enter a valid email address");
      return;
    }

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
      active: false
    };

    if (!sanitizedData.url) {
      alert("Please enter a valid URL");
      return;
    }

    const submission = {
      ...sanitizedData,
      submittedAt: new Date().toISOString()
    };

    RATE_LIMIT.submissions.push(now);
    try {
      localStorage.setItem('aiMarketplaceRateLimit', JSON.stringify(RATE_LIMIT.submissions));
    } catch (e) {}

    // POST to your backend API
    fetch("https://vvd7vbp3y9.execute-api.eu-central-1.amazonaws.com/default/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission)
    })
      .then(res => res.json())
      .then(() => {
        // Optionally, refresh the list or show a message
      });

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
          <span className="add-label">Add a new one</span>
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

function validateUrl(url: string): boolean {
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

const RATE_LIMIT = {
  maxSubmissions: 10,
  timeWindow: 60 * 60 * 1000,
  submissions: [] as number[]
};