import { Router } from 'express';
import { WINE_TYPES, type NewWine, type WineUpdate } from '../types';
import { estimateApogee } from '../services/apogee';
import {
  createWine,
  deleteWine,
  listWines,
  recomputeWineApogee,
  requireWine,
  toWineResponse,
  updateWine,
  type WineListFilters,
} from '../services/wines';
import { badRequest } from '../http/errors';
import {
  asRecord,
  optionalApogeeSource,
  optionalInt,
  optionalString,
  optionalWineType,
  parseId,
  requiredString,
  requiredWineType,
  validateDrinkWindow,
  validateMillesime,
  validateQuantity,
} from '../validation';

export const winesRouter = Router();

function parseWineBody(body: Record<string, unknown>, mode: 'create' | 'update'): NewWine | WineUpdate {
  const domaine = mode === 'create'
    ? requiredString(body.domaine, 'domaine')
    : optionalString(body.domaine, 'domaine');
  if (mode === 'update' && domaine === null) {
    throw badRequest('Le champ « domaine » ne peut pas être vide');
  }

  const type = mode === 'create' ? requiredWineType(body.type) : optionalWineType(body.type);
  const millesime = optionalInt(body.millesime, 'millesime');
  const quantity = optionalInt(body.quantity, 'quantity');
  const drink_from = optionalInt(body.drink_from, 'drink_from');
  const drink_until = optionalInt(body.drink_until, 'drink_until');

  if (quantity === null) {
    throw badRequest('La quantité ne peut pas être nulle');
  }

  validateMillesime(millesime);
  validateQuantity(quantity);
  validateDrinkWindow(drink_from, drink_until);

  return {
    domaine: domaine ?? undefined,
    cuvee: optionalString(body.cuvee, 'cuvee'),
    type,
    region: optionalString(body.region, 'region'),
    appellation: optionalString(body.appellation, 'appellation'),
    millesime,
    quantity: mode === 'create' ? (quantity ?? 1) : quantity,
    location_id: optionalInt(body.location_id, 'location_id'),
    cepages: optionalString(body.cepages, 'cepages'),
    domaine_info: optionalString(body.domaine_info, 'domaine_info'),
    accords: optionalString(body.accords, 'accords'),
    potentiel_garde: optionalString(body.potentiel_garde, 'potentiel_garde'),
    drink_from,
    drink_until,
    apogee_source: optionalApogeeSource(body.apogee_source),
    notes: optionalString(body.notes, 'notes'),
  };
}

winesRouter.get('/', async (req, res) => {
  const type = typeof req.query.type === 'string' ? req.query.type : undefined;
  if (type && !WINE_TYPES.includes(type as (typeof WINE_TYPES)[number])) {
    throw badRequest(`Le type de vin doit être l'un de : ${WINE_TYPES.join(', ')}`);
  }

  const drinkRaw = typeof req.query.drink === 'string' ? req.query.drink : undefined;
  const drinkValues = ['this_year', 'past_peak', 'not_ready'] as const;
  if (drinkRaw && !drinkValues.includes(drinkRaw as (typeof drinkValues)[number])) {
    throw badRequest(`drink doit être l'un de : ${drinkValues.join(', ')}`);
  }

  const filters: WineListFilters = {
    type,
    location_id: req.query.location_id ? parseId(String(req.query.location_id)) : undefined,
    region: typeof req.query.region === 'string' ? req.query.region : undefined,
    q: typeof req.query.q === 'string' ? req.query.q : undefined,
    drink: drinkRaw as WineListFilters['drink'],
  };

  res.json(await listWines(filters));
});

winesRouter.get('/:id', async (req, res) => {
  res.json(await toWineResponse(await requireWine(parseId(req.params.id))));
});

winesRouter.post('/', async (req, res) => {
  const wine = await createWine(parseWineBody(asRecord(req.body), 'create') as NewWine);
  res.status(201).json(wine);
});

winesRouter.put('/:id', async (req, res) => {
  const wine = await updateWine(parseId(req.params.id), parseWineBody(asRecord(req.body), 'update'));
  res.json(wine);
});

winesRouter.delete('/:id', async (req, res) => {
  await deleteWine(parseId(req.params.id));
  res.status(204).send();
});

winesRouter.post('/:id/apogee', async (req, res) => {
  res.json(await recomputeWineApogee(parseId(req.params.id)));
});

winesRouter.get('/:id/apogee', async (req, res) => {
  const wine = await requireWine(parseId(req.params.id));
  const estimate = await estimateApogee({
    type: wine.type,
    region: wine.region,
    appellation: wine.appellation,
    millesime: wine.millesime,
  });
  res.json({ wine_id: wine.id, estimate });
});
