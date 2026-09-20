import { randomUUID } from 'node:crypto';
import { all, get, getDb, run } from '../db';
import { badRequest } from '../http/errors';
import type { WineIdentification } from '../types/scan';
import { analyzeLabel } from './scan';

export type BatchItemStatus = 'queued' | 'running' | 'done' | 'error';

export interface BatchItem {
  id: string;
  status: BatchItemStatus;
  error: string | null;
  identification: WineIdentification | null;
  model: string | null;
}

export interface BatchJob {
  id: string;
  created_at: string;
  total: number;
  done: number;
  percent: number;
  items: BatchItem[];
}

interface JobRow {
  id: string;
  created_at: string;
  total: number;
  done: number;
}

interface ItemRow {
  id: string;
  job_id: string;
  position: number;
  status: BatchItemStatus;
  error: string | null;
  identification: string | null;
  model: string | null;
  image: string | null;
}

const MAX_BATCH = 20;
let pumping = false;

function percentOf(done: number, total: number): number {
  if (total <= 0) return 100;
  return Math.min(100, Math.round((done / total) * 100));
}

function parseIdent(raw: string | null): WineIdentification | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WineIdentification;
  } catch {
    return null;
  }
}

function toJob(job: JobRow, items: ItemRow[]): BatchJob {
  return {
    id: job.id,
    created_at: job.created_at,
    total: job.total,
    done: job.done,
    percent: percentOf(job.done, job.total),
    items: items.map((item) => ({
      id: item.id,
      status: item.status,
      error: item.error,
      identification: parseIdent(item.identification),
      model: item.model,
    })),
  };
}

async function loadJob(id: string): Promise<BatchJob | null> {
  const job = await get<JobRow>(getDb(), 'SELECT * FROM scan_jobs WHERE id = ?', [id]);
  if (!job) return null;
  const items = await all<ItemRow>(
    getDb(),
    'SELECT id, job_id, position, status, error, identification, model, image FROM scan_items WHERE job_id = ? ORDER BY position',
    [id],
  );
  return toJob(job, items);
}

export async function createBatchJob(images: unknown): Promise<BatchJob> {
  if (!Array.isArray(images) || images.length === 0) {
    throw badRequest('Envoie au moins une photo.');
  }
  if (images.length > MAX_BATCH) {
    throw badRequest(`Maximum ${MAX_BATCH} photos par lot.`);
  }
  const list = images.filter((item): item is string => typeof item === 'string' && item.length > 20);
  if (list.length === 0) {
    throw badRequest('Aucune image valide dans le lot.');
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  await run(getDb(), 'INSERT INTO scan_jobs (id, created_at, total, done) VALUES (?, ?, ?, 0)', [
    id,
    createdAt,
    list.length,
  ]);
  for (const [position, image] of list.entries()) {
    await run(
      getDb(),
      `INSERT INTO scan_items (id, job_id, position, status, error, identification, model, image)
       VALUES (?, ?, ?, 'queued', NULL, NULL, NULL, ?)`,
      [randomUUID(), id, position, image],
    );
  }
  void pump();
  const job = await loadJob(id);
  if (!job) throw new Error('Lot non créé');
  return job;
}

export async function getBatchJob(id: string): Promise<BatchJob | null> {
  return loadJob(id);
}

export async function listBatchJobs(limit = 20): Promise<BatchJob[]> {
  const jobs = await all<JobRow>(
    getDb(),
    'SELECT * FROM scan_jobs ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
  const result: BatchJob[] = [];
  for (const job of jobs) {
    const items = await all<ItemRow>(
      getDb(),
      'SELECT id, job_id, position, status, error, identification, model, image FROM scan_items WHERE job_id = ? ORDER BY position',
      [job.id],
    );
    result.push(toJob(job, items));
  }
  return result;
}

export async function resumeScanQueue(): Promise<void> {
  await run(getDb(), `UPDATE scan_items SET status = 'queued' WHERE status = 'running'`);
  void pump();
}

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    while (true) {
      const next = await all<ItemRow>(
        getDb(),
        `SELECT * FROM scan_items WHERE status = 'queued' ORDER BY rowid LIMIT 1`,
      );
      const item = next[0];
      if (!item) break;
      await run(getDb(), `UPDATE scan_items SET status = 'running' WHERE id = ?`, [item.id]);
      try {
        if (!item.image) throw new Error('Image manquante');
        const result = await analyzeLabel(item.image);
        await run(
          getDb(),
          `UPDATE scan_items SET status = 'done', identification = ?, model = ?, image = NULL, error = NULL WHERE id = ?`,
          [JSON.stringify(result.identification), result.model, item.id],
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Analyse impossible';
        await run(getDb(), `UPDATE scan_items SET status = 'error', error = ? WHERE id = ?`, [
          message,
          item.id,
        ]);
      }
      await run(
        getDb(),
        `UPDATE scan_jobs SET done = (
           SELECT COUNT(*) FROM scan_items WHERE job_id = scan_jobs.id AND status IN ('done', 'error')
         ) WHERE id = ?`,
        [item.job_id],
      );
    }
  } finally {
    pumping = false;
  }
}
