import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import "./App.css";

const client = generateClient<Schema>();

function App() {
  const [aiApps, setAiApps] = useState<Array<Schema["AIApp"]["type"]>>([]);

  useEffect(() => {
    client.models.AIApp.observeQuery().subscribe({
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
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
      imageKey: formData.imageKey || undefined
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
            <input 
              name="type" 
              value={formData.type} 
              onChange={handleChange} 
            />
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
            <input 
              name="region" 
              value={formData.region} 
              onChange={handleChange} 
            />
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
      
      <ul>
        {aiApps.map((listing) => (
          <li key={listing.id}>{listing.name}</li>
        ))}
      </ul>
    </main>
  );
}

export default App;
