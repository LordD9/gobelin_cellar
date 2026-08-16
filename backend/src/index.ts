import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import type { Server } from 'http';
import { closeDatabase, getTableNames, initDatabase, resolveDatabasePath } from './db';
import { errorHandler, HttpError } from './http/errors';
import { seedApogeeRules } from './services/apogee';
import { apogeeRouter } from './routes/apogee';
import { dashboardRouter } from './routes/dashboard';
import { locationsRouter } from './routes/locations';
import { winesRouter } from './routes/wines';
import { attachFrontend } from './static';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    const tables = await getTableNames();
    res.json({
      status: 'ok',
      message: 'Cave Manager API is running',
      database: resolveDatabasePath(),
      tables,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ status: 'error', message });
  }
});

app.use('/api/locations', locationsRouter);
app.use('/api/wines', winesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/apogee', apogeeRouter);

app.use('/api', (_req, _res, next) => {
  next(new HttpError(404, 'Route introuvable'));
});

const publicDir = attachFrontend(app);
app.use(errorHandler);

async function start(): Promise<void> {
  const dbPath = resolveDatabasePath();
  await initDatabase(dbPath);
  await seedApogeeRules();
  console.log(`Base SQLite prête : ${dbPath}`);
  if (publicDir) {
    console.log(`Frontend statique : ${publicDir}`);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Serveur démarré sur http://${HOST}:${PORT}`);
  });

  const stop = (signal: string) => {
    void shutdown(server, signal);
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}

async function shutdown(server: Server, signal: string): Promise<void> {
  console.log(`${signal} reçu, arrêt en cours…`);
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  try {
    await closeDatabase();
  } catch (error) {
    console.error('Fermeture SQLite :', error);
  }
  process.exit(0);
}

start().catch((error) => {
  console.error('Impossible de démarrer le serveur :', error);
  process.exit(1);
});
