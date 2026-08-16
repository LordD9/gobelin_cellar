import { Router } from 'express';
import { badRequest } from '../http/errors';
import { estimateApogee, listApogeeRules } from '../services/apogee';
import { optionalInt, optionalString, requiredWineType, validateMillesime } from '../validation';

export const apogeeRouter = Router();

apogeeRouter.get('/rules', async (_req, res) => {
  res.json(await listApogeeRules());
});

apogeeRouter.get('/estimate', async (req, res) => {
  const type = requiredWineType(req.query.type);
  const millesime = optionalInt(req.query.millesime, 'millesime') ?? null;
  validateMillesime(millesime);

  if (millesime == null) {
    throw badRequest('Le millésime est obligatoire pour estimer l\'apogée');
  }

  const estimate = await estimateApogee({
    type,
    region: optionalString(req.query.region, 'region') ?? null,
    appellation: optionalString(req.query.appellation, 'appellation') ?? null,
    millesime,
  });

  res.json({ estimate });
});
