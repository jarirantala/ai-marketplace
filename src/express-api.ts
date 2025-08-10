import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const DATA_FILE = path.join(__dirname, 'aiapps.json');

// Helper to read/write data
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}
async function writeData(data: any) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// List AIApps
router.get('/aiapps', async (_req, res) => {
  const aiapps = await readData();
  res.json(aiapps);
});

// Create AIApp
router.post('/aiapps', async (req, res) => {
  const aiapps = await readData();
  const newApp = { id: Date.now().toString(), ...req.body };
  aiapps.push(newApp);
  await writeData(aiapps);
  res.status(201).json(newApp);
});

// Update AIApp
router.put('/aiapps/:id', async (req, res) => {
  const aiapps = await readData();
  const idx = aiapps.findIndex((a: any) => a.id === req.params.id);
  if (idx === -1) return res.status(404).send('Not found');
  aiapps[idx] = { ...aiapps[idx], ...req.body };
  await writeData(aiapps);
  res.json(aiapps[idx]);
});

// Delete AIApp
router.delete('/aiapps/:id', async (req, res) => {
  let aiapps = await readData();
  aiapps = aiapps.filter((a: any) => a.id !== req.params.id);
  await writeData(aiapps);
  res.status(204).send();
});

export default router;