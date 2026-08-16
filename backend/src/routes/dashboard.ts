import { Router } from 'express';
import { getDashboard } from '../services/dashboard';
import { parseId } from '../validation';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (req, res) => {
  const yearRaw = typeof req.query.year === 'string' ? req.query.year : undefined;
  const year = yearRaw ? parseId(yearRaw) : new Date().getFullYear();
  res.json(await getDashboard(year));
});
