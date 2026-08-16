import { Router } from 'express';
import { badRequest } from '../http/errors';
import { createLocation, deleteLocation, listLocations, listLocationTree, requireLocation, toLocationResponse, updateLocation } from '../services/locations';
import {
  asRecord,
  optionalInt,
  optionalString,
  parseId,
  requiredString,
} from '../validation';

export const locationsRouter = Router();

locationsRouter.get('/', async (req, res) => {
  if (req.query.tree === '1' || req.query.tree === 'true') {
    res.json(await listLocationTree());
    return;
  }
  res.json(await listLocations());
});

locationsRouter.get('/:id', async (req, res) => {
  const location = await requireLocation(parseId(req.params.id));
  res.json(await toLocationResponse(location));
});

locationsRouter.post('/', async (req, res) => {
  const body = asRecord(req.body);
  const location = await createLocation({
    name: requiredString(body.name, 'name'),
    parent_id: optionalInt(body.parent_id, 'parent_id') ?? null,
    description: optionalString(body.description, 'description') ?? null,
  });
  res.status(201).json(location);
});

locationsRouter.put('/:id', async (req, res) => {
  const body = asRecord(req.body);
  const name = optionalString(body.name, 'name');
  if (name === null) {
    throw badRequest('Le champ « name » ne peut pas être vide');
  }

  const location = await updateLocation(parseId(req.params.id), {
    name: name === undefined ? undefined : name,
    parent_id: optionalInt(body.parent_id, 'parent_id'),
    description: optionalString(body.description, 'description'),
  });
  res.json(location);
});

locationsRouter.delete('/:id', async (req, res) => {
  await deleteLocation(parseId(req.params.id));
  res.status(204).send();
});
