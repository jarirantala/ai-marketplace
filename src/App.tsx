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
      next: (data) => setAiApps([...data.items]),
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
    client.models.AIApp.create({
      name: formData.name,
      url: formData.url,
      license: formData.license || undefined,
      description: formData.description || undefined,
      type: formData.type || undefined,
      useCase: formData.useCase || undefined,
      region: formData.region || undefined,
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
            <label>License: </label>
            <input 
              name="license" 
              value={formData.license} 
              onChange={handleChange} 
            />
          </div>
          <div>
            <label>Description: </label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
            />
          </div>
          <div>
            <label>Type: </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="">Select type</option>
              <option value="Business">Business</option>
              <option value="Consumer">Consumer</option>
            </select>
          </div>
          <div>
            <label>Use Case: </label>
            <input 
              name="useCase" 
              value={formData.useCase} 
              onChange={handleChange} 
            />
          </div>
          <div>
            <label>Region: </label>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
            >
              <option value="">Select region</option>
              <option value="Finland">Finland</option>
              <option value="Europe">Europe</option>
            </select>
          </div>
          <div>
            <label>Image URL: </label>
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
        {aiApps.map((app) => (
          <div key={app.id} className="app-item">
            <h3>{app.name}</h3>
            {app.imageKey && (
              <div className="app-image">
                <img src={app.imageKey} alt={app.name} />
              </div>
            )}
            {app.description && <p>{app.description}</p>}
            <div className="app-details">
              <p><strong>URL:</strong> <a href={app.url} target="_blank" rel="noopener noreferrer">{app.url}</a></p>
              {app.license && <p><strong>License:</strong> {app.license}</p>}
              {app.type && <p><strong>Type:</strong> {app.type}</p>}
              {app.useCase && <p><strong>Use Case:</strong> {app.useCase}</p>}
              {app.region && <p><strong>Region:</strong> {app.region}</p>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default App;
