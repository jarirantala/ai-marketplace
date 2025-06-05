import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import "./App.css";

const client = generateClient<Schema>();

function App() {
  const [aiApps, setAiApps] = useState<Array<Schema["AIApp"]["type"]>>([]);

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
        const normalizedItems = data.items.map(item => {
          if (!item) return null;
          return {
            ...item,
            name: item.name || '',
            url: item.url || '',
            license: item.license || '',
            description: item.description || '',
            type: item.type || '',
            useCase: item.useCase || '',
            region: item.region || '',
            imageKey: item.imageKey || ''
          };
        });
        setAiApps(normalizedItems.filter(Boolean));
      },
    });
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    license: "",
    description: "",
    type: "",
    useCase: "",
    region: "",
    imageKey: ""
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Validate required fields client-side
    if (!formData.name || !formData.url || !formData.license || 
        !formData.description || !formData.type || !formData.useCase || !formData.region) {
      alert("Please fill in all required fields");
      return;
    }
    
    client.models.AIApp.create({
      name: formData.name,
      url: formData.url,
      license: formData.license,
      description: formData.description,
      type: formData.type,
      useCase: formData.useCase,
      region: formData.region,
      imageKey: formData.imageKey || undefined,
      active: false // Explicitly set to false for new items
    });
    setFormData({
      name: "",
      url: "",
      license: "",
      description: "",
      type: "",
      useCase: "",
      region: "",
      imageKey: ""
    });
    setShowForm(false);
  }

  return (
    <main>
      <h1>AI Marketplace Finland</h1>
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? "Cancel" : "+ new"}
      </button>
      
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
            />
          </div>
          <div>
            <label>License*: </label>
            <input 
              name="license" 
              value={formData.license} 
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Description*: </label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Type*: </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="">Select type</option>
              <option value="Business">Business</option>
              <option value="Consumer">Consumer</option>
            </select>
          </div>
          <div>
            <label>Use Case*: </label>
            <input 
              name="useCase" 
              value={formData.useCase} 
              onChange={handleChange}
              required
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
            />
          </div>
          <button type="submit">Submit</button>
        </form>
      )}
      
      <div className="app-list">
        {aiApps.filter(app => app !== null && app !== undefined).map((app) => (
          <div key={app.id} className="app-item">
            <img 
              src={app.imageKey && app.imageKey.trim() !== '' 
                ? app.imageKey 
                : "https://aimarketplace.s3.amazonaws.com/aimarketplace-logo.png"}
              alt={app.imageKey && app.imageKey.trim() !== '' ? `${app.name} Logo` : "AI Marketplace Logo"} 
              className="app-logo" 
            />
            <h3>{app?.name || ''}</h3>

            <p>{app?.description || ''}</p>
            <div className="app-details">
              <p><strong>URL:</strong> <a href={app?.url || '#'} target="_blank" rel="noopener noreferrer">{app?.url || ''}</a></p>
              <p><strong>License:</strong> {app?.license || ''}</p>
              <p><strong>Type:</strong> {app?.type || ''}</p>
              <p><strong>Use Case:</strong> {app?.useCase || ''}</p>
              <p><strong>Region:</strong> {app?.region || ''}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default App;
