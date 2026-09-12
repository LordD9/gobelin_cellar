import { Router } from 'express';
import { analyzeLabel, enrichIdentification } from '../services/scan';
import { createBatchJob, getBatchJob } from '../services/scanBatch';
import { asRecord } from '../validation';
import { HttpError } from '../http/errors';

export const scanRouter = Router();

scanRouter.post('/label', async (req, res) => {
  const body = asRecord(req.body);
  res.json(await analyzeLabel(body.image));
});

scanRouter.post('/enrich', async (req, res) => {
  const body = asRecord(req.body);
  const identification = body.identification ?? body;
  res.json(await enrichIdentification(identification));
});

scanRouter.post('/batch', async (req, res) => {
  const body = asRecord(req.body);
  res.status(202).json(await Promise.resolve(createBatchJob(body.images)));
});

scanRouter.get('/batch/:id', (req, res) => {
  const job = getBatchJob(String(req.params.id));
  if (!job) throw new HttpError(404, 'Lot introuvable');
  res.json(job);
});
