import express from 'express';
import aiappApi from './aiapp-api';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', aiappApi);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Example React hook for listing AIApps
export async function fetchAIApps() {
  const res = await fetch('http://localhost:4000/api/aiapps');
  return res.json();
}

// Example: create AIApp
export async function createAIApp(app: any) {
  const res = await fetch('http://localhost:4000/api/aiapps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(app),
  });
  return res.json();
}