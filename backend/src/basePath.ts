import type { NextFunction, Request, Response } from 'express';
import { badRequest } from './http/errors';

/** Chemin d’URL type Sonarr : `/gobelincellar`, ou `''` si l’app est à la racine. */
export function normalizeBasePath(raw: string | undefined | null): string {
  if (raw == null) return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '/') return '';

  let value = trimmed;
  if (value.includes('://') || value.includes('?') || value.includes('#') || value.includes('\\')) {
    throw badRequest(
      'Le chemin d’URL doit être un préfixe simple, ex. /gobelincellar (pas une URL complète)',
    );
  }
  if (!value.startsWith('/')) value = `/${value}`;
  value = value.replace(/\/+$/, '');
  if (value.includes('..') || value.includes('//')) {
    throw badRequest('Le chemin d’URL contient un segment invalide');
  }
  if (!/^\/[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(value) || value.length > 64) {
    throw badRequest('Le chemin d’URL doit ressembler à /gobelincellar');
  }
  return value;
}

export function resolveBasePath(envValue: string | undefined, storedValue: string | null | undefined): string {
  if (envValue != null && envValue.trim() !== '') {
    return normalizeBasePath(envValue);
  }
  return normalizeBasePath(storedValue);
}

export function envLocksBasePath(): boolean {
  return Boolean(process.env.BASE_PATH?.trim());
}

/** Laisse `/api/health` à la racine (healthcheck Docker). Le reste est servi sous le préfixe. */
export function stripBasePath(basePath: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!basePath) {
      next();
      return;
    }
    if (req.path === '/api/health') {
      next();
      return;
    }

    const underBase = req.path === basePath || req.path.startsWith(`${basePath}/`);
    if (!underBase) {
      if (req.method === 'GET' && req.path !== '/api/health' && !req.path.startsWith('/api')) {
        res.redirect(`${basePath}${req.url}`);
        return;
      }
      next();
      return;
    }

    const restPath = req.path.slice(basePath.length) || '/';
    const queryIndex = req.url.indexOf('?');
    const query = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
    req.url = restPath + query;
    next();
  };
}

export function injectBasePath(html: string, basePath: string): string {
  const script = `<script>window.__GOBLIN_BASE_PATH__=${JSON.stringify(basePath)};</script>`;
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${script}`);
  }
  return script + html;
}
