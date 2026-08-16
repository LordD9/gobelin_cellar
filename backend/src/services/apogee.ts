import { all, get, getDb, run } from '../db';
import type { ApogeeEstimate, ApogeeProfile, ApogeeRule, WineType } from '../types';
import { APOGEE_RULE_SEEDS } from './apogeeRules.seed';

const REGION_ALIASES: Record<string, string[]> = {
  bordeaux: ['gironde'],
  bourgogne: ['burgundy'],
  'vallee du rhone': ['rhone', 'cotes du rhone', 'cote du rhone'],
  languedoc: ['occitanie', 'languedoc-roussillon'],
  champagne: ['champagne-ardenne'],
  loire: ['val de loire', 'vallee de la loire'],
  alsace: [],
  beaujolais: [],
  provence: ['cote de provence', 'cotes de provence'],
};

export function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function containsNormalized(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  return haystack.includes(needle) || needle.includes(haystack);
}

function regionMatches(inputRegion: string, inputAppellation: string, ruleRegion: string): boolean {
  if (containsNormalized(inputRegion, ruleRegion) || containsNormalized(inputAppellation, ruleRegion)) {
    return true;
  }

  const aliases = REGION_ALIASES[ruleRegion] ?? [];
  return aliases.some(
    (alias) => containsNormalized(inputRegion, alias) || containsNormalized(inputAppellation, alias),
  );
}

export function scoreRule(
  rule: Pick<ApogeeRule, 'type' | 'region' | 'appellation' | 'priority'>,
  profile: Pick<ApogeeProfile, 'type' | 'region' | 'appellation'>,
): number | null {
  if (rule.type && rule.type !== profile.type) {
    return null;
  }

  const inputRegion = normalizeText(profile.region);
  const inputAppellation = normalizeText(profile.appellation);
  const ruleRegion = normalizeText(rule.region);
  const ruleAppellation = normalizeText(rule.appellation);

  let score = rule.priority;

  if (ruleAppellation) {
    const appellationHit =
      containsNormalized(inputAppellation, ruleAppellation) || containsNormalized(inputRegion, ruleAppellation);
    if (!appellationHit) {
      return null;
    }
    score += 100;
  }

  if (ruleRegion) {
    const regionHit = regionMatches(inputRegion, inputAppellation, ruleRegion);
    if (!regionHit && !ruleAppellation) {
      return null;
    }
    if (regionHit) {
      score += 10;
    }
  }

  return score;
}

export function pickRule(
  profile: Pick<ApogeeProfile, 'type' | 'region' | 'appellation'>,
  rules: ApogeeRule[],
): ApogeeRule | null {
  let best: { rule: ApogeeRule; score: number } | null = null;

  for (const rule of rules) {
    const score = scoreRule(rule, profile);
    if (score === null) continue;
    if (!best || score > best.score) {
      best = { rule, score };
    }
  }

  return best?.rule ?? null;
}

export function formatPotentielGarde(fromOffset: number, untilOffset: number): string {
  if (fromOffset === untilOffset) {
    return `${fromOffset} an${fromOffset > 1 ? 's' : ''} après le millésime`;
  }
  return `${fromOffset} à ${untilOffset} ans après le millésime`;
}

export function estimateFromRule(millesime: number, rule: ApogeeRule): ApogeeEstimate {
  return {
    drink_from: millesime + rule.drink_from_offset,
    drink_until: millesime + rule.drink_until_offset,
    rule_name: rule.name,
    potentiel_garde: formatPotentielGarde(rule.drink_from_offset, rule.drink_until_offset),
  };
}

export async function listApogeeRules(): Promise<ApogeeRule[]> {
  return all<ApogeeRule>(
    getDb(),
    `SELECT id, name, type, region, appellation, drink_from_offset, drink_until_offset, priority
     FROM apogee_rules
     ORDER BY priority DESC, name ASC`,
  );
}

export async function estimateApogee(profile: ApogeeProfile): Promise<ApogeeEstimate | null> {
  if (profile.millesime == null) {
    return null;
  }

  const rules = await listApogeeRules();
  const rule = pickRule(profile, rules);
  if (!rule) {
    return null;
  }

  return estimateFromRule(profile.millesime, rule);
}

export async function seedApogeeRules(): Promise<void> {
  const existing = await get<{ count: number }>(getDb(), 'SELECT COUNT(*) AS count FROM apogee_rules');
  if ((existing?.count ?? 0) > 0) {
    return;
  }

  for (const rule of APOGEE_RULE_SEEDS) {
    await run(
      getDb(),
      `INSERT INTO apogee_rules (name, type, region, appellation, drink_from_offset, drink_until_offset, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        rule.name,
        rule.type,
        rule.region,
        rule.appellation,
        rule.drink_from_offset,
        rule.drink_until_offset,
        rule.priority,
      ],
    );
  }
}

export function isWineType(value: string): value is WineType {
  return value === 'rouge' || value === 'blanc' || value === 'rose' || value === 'petillant';
}
