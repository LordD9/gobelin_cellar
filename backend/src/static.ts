import fs from 'fs';
import path from 'path';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';

export function attachFrontend(app: Express): string | null {
  const publicDir = process.env.PUBLIC_DIR;
  if (!publicDir) {
    return null;
  }

  const resolved = path.resolve(publicDir);
  const indexFile = path.join(resolved, 'index.html');
  if (!fs.existsSync(indexFile)) {
    console.warn(`PUBLIC_DIR est défini mais index.html est introuvable : ${indexFile}`);
    return null;
  }

  app.use(
    express.static(resolved, {
      index: false,
      maxAge: '1y',
      setHeaders(res, filePath) {
        if (path.basename(filePath) === 'index.html') {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(indexFile);
  });

  return resolved;
}
