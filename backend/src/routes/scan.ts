import { Router } from 'express';
import { analyzeLabel, enrichIdentification } from '../services/scan';
import { asRecord } from '../validation';

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
