import { randomUUID } from 'node:crypto';
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
  items: BatchItem[];
}

const jobs = new Map<string, { job: BatchJob; images: Array<string | null> }>();
const MAX_BATCH = 20;
let pumping = false;

export function createBatchJob(images: unknown): BatchJob {
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
  const items: BatchItem[] = list.map(() => ({
    id: randomUUID(),
    status: 'queued',
    error: null,
    identification: null,
    model: null,
  }));
  const job: BatchJob = {
    id,
    created_at: new Date().toISOString(),
    total: items.length,
    done: 0,
    items,
  };
  jobs.set(id, { job, images: list });
  void pump();
  return publicJob(job);
}

export function getBatchJob(id: string): BatchJob | null {
  const found = jobs.get(id);
  return found ? publicJob(found.job) : null;
}

function publicJob(job: BatchJob): BatchJob {
  return {
    ...job,
    items: job.items.map((item) => ({ ...item })),
  };
}

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    while (true) {
      const next = findNext();
      if (!next) break;
      const { record, index } = next;
      const item = record.job.items[index];
      const image = record.images[index];
      item.status = 'running';
      try {
        if (!image) throw new Error('Image manquante');
        const result = await analyzeLabel(image);
        item.status = 'done';
        item.identification = result.identification;
        item.model = result.model;
      } catch (error) {
        item.status = 'error';
        item.error = error instanceof Error ? error.message : 'Analyse impossible';
      } finally {
        record.images[index] = null;
        record.job.done += 1;
      }
    }
  } finally {
    pumping = false;
  }
}

function findNext(): { record: { job: BatchJob; images: Array<string | null> }; index: number } | null {
  for (const record of jobs.values()) {
    const index = record.job.items.findIndex((item) => item.status === 'queued');
    if (index >= 0) return { record, index };
  }
  return null;
}
