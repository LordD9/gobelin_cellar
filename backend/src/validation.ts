import { APOGEE_SOURCES, WINE_TYPES, type ApogeeSource, type WineType } from './types';
import { badRequest } from './http/errors';

const CURRENT_YEAR = new Date().getFullYear();

export function parseId(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) {
    throw badRequest('Identifiant invalide');
  }
  return Number(raw);
}

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`Le champ « ${field} » est obligatoire`);
  }
  return value.trim();
}

export function optionalString(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw badRequest(`Le champ « ${field} » doit être une chaîne`);
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function optionalInt(value: unknown, field: string): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  throw badRequest(`Le champ « ${field} » doit être un entier`);
}

export function requiredWineType(value: unknown): WineType {
  if (typeof value !== 'string' || !WINE_TYPES.includes(value as WineType)) {
    throw badRequest(`Le type de vin doit être l'un de : ${WINE_TYPES.join(', ')}`);
  }
  return value as WineType;
}

export function optionalWineType(value: unknown): WineType | undefined {
  if (value === undefined) return undefined;
  return requiredWineType(value);
}

export function optionalApogeeSource(value: unknown): ApogeeSource | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !APOGEE_SOURCES.includes(value as ApogeeSource)) {
    throw badRequest(`apogee_source doit être l'un de : ${APOGEE_SOURCES.join(', ')}`);
  }
  return value as ApogeeSource;
}

export function validateQuantity(value: number | null | undefined): void {
  if (value === undefined || value === null) return;
  if (value < 0) {
    throw badRequest('La quantité ne peut pas être négative');
  }
}

export function validateMillesime(value: number | null | undefined): void {
  if (value === undefined || value === null) return;
  if (value < 1800 || value > CURRENT_YEAR + 1) {
    throw badRequest(`Le millésime doit être compris entre 1800 et ${CURRENT_YEAR + 1}`);
  }
}

export function validateDrinkWindow(from: number | null | undefined, until: number | null | undefined): void {
  if (from == null || until == null) return;
  if (from > until) {
    throw badRequest("L'année « à boire à partir de » ne peut pas dépasser « à boire avant »");
  }
}

export function asRecord(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Le corps de la requête doit être un objet JSON');
  }
  return body as Record<string, unknown>;
}

export { CURRENT_YEAR };
