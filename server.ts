import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import authRoutes from './server/routes/auth.js';
import categoriesRoutes from './server/routes/categories.js';
import itemsRoutes from './server/routes/items.js';
import repairKbRoutes from './server/routes/repair-kb.js';
import uploadRoutes from './server/routes/upload.js';
import { getDb } from './server/db.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure public/uploads exists and serve it statically
const uploadsDir = path.resolve(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
app.use('/assets', express.static(path.resolve(process.cwd(), 'public/assets')));

// System status and health check
app.get('/api/status', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    res.json({
      status: 'ok',
      engine: db.isFallback ? 'Local T-SQL Engine (Preview Mode)' : 'Microsoft SQL Server (mssql / tedious)',
      details: db.status,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Mount API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/repair-kb', repairKbRoutes);
app.use('/api/upload', uploadRoutes);

// Setup frontend serving
async function startServer() {
  // Pre-initialize DB so first request is instant
  try {
    await getDb();
  } catch (err) {
    console.error('Initial DB bootstrap error:', err);
  }

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Second-Hand Lifecycle Tracker server active at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
});
