const BASE = 'http://localhost:3001';

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, data };
}

function assert(cond, message) {
  if (!cond) {
    throw new Error(message);
  }
}

async function main() {
  const leftoverWines = await request('GET', '/api/wines');
  if (leftoverWines.status === 200) {
    for (const wine of leftoverWines.data) {
      if (['Château Test', 'Domaine Manuel', 'Duboeuf'].includes(wine.domaine)) {
        await request('DELETE', `/api/wines/${wine.id}`);
      }
    }
  }
  const leftoverLocs = await request('GET', '/api/locations');
  if (leftoverLocs.status === 200) {
    const extras = leftoverLocs.data
      .filter((loc) => loc.name === 'Ligne 3' || loc.name === 'Armoire gauche')
      .sort((a, b) => b.path.length - a.path.length);
    for (const loc of extras) {
      await request('DELETE', `/api/locations/${loc.id}`);
    }
  }

  const health = await request('GET', '/api/health');
  assert(health.status === 200 && health.data.status === 'ok', 'health failed');
  assert(health.data.tables.includes('apogee_rules'), 'apogee_rules table missing');
  console.log('OK health', health.data.tables);

  const rules = await request('GET', '/api/apogee/rules');
  assert(rules.status === 200 && rules.data.length > 10, 'rules seed failed');
  console.log('OK apogee rules', rules.data.length);

  const pauillac = await request(
    'GET',
    '/api/apogee/estimate?type=rouge&region=Bordeaux&appellation=Pauillac&millesime=2015',
  );
  assert(pauillac.status === 200, 'estimate pauillac failed');
  assert(pauillac.data.estimate.drink_from === 2023, `pauillac from ${pauillac.data.estimate.drink_from}`);
  assert(pauillac.data.estimate.drink_until === 2040, `pauillac until ${pauillac.data.estimate.drink_until}`);
  console.log('OK estimate Pauillac 2015', pauillac.data.estimate);

  const rose = await request('GET', '/api/apogee/estimate?type=rose&millesime=2024');
  assert(rose.data.estimate.drink_from === 2025 && rose.data.estimate.drink_until === 2027, 'rose generic failed');
  console.log('OK estimate rosé générique', rose.data.estimate);

  const missing = await request('GET', '/api/apogee/estimate?type=rouge');
  assert(missing.status === 400, 'missing millesime should 400');

  const locations = await request('GET', '/api/locations');
  assert(locations.status === 200 && locations.data.length >= 1, 'list locations failed');
  const caveId = locations.data[0].id;

  const armoire = await request('POST', '/api/locations', {
    name: 'Armoire gauche',
    parent_id: caveId,
    description: 'Rangée de test',
  });
  assert(armoire.status === 201, 'create location failed');
  assert(armoire.data.path.includes('Cave principale'), `path ${armoire.data.path}`);
  console.log('OK location', armoire.data.path);

  const ligne = await request('POST', '/api/locations', {
    name: 'Ligne 3',
    parent_id: armoire.data.id,
  });
  assert(ligne.status === 201 && ligne.data.path === 'Cave principale > Armoire gauche > Ligne 3', ligne.data.path);

  const cycle = await request('PUT', `/api/locations/${caveId}`, { parent_id: ligne.data.id });
  assert(cycle.status === 400, 'cycle should be rejected');

  const wineAuto = await request('POST', '/api/wines', {
    domaine: 'Château Test',
    cuvee: 'Grand Vin',
    type: 'rouge',
    region: 'Bordeaux',
    appellation: 'Pauillac',
    millesime: 2015,
    quantity: 6,
    location_id: ligne.data.id,
    cepages: 'Cabernet Sauvignon, Merlot',
    accords: 'Entrecôte, fromages affinés',
  });
  assert(wineAuto.status === 201, 'create wine auto failed');
  assert(wineAuto.data.apogee_source === 'auto', 'expected auto source');
  assert(wineAuto.data.drink_from === 2023 && wineAuto.data.drink_until === 2040, 'auto apogee window');
  assert(wineAuto.data.location_path === 'Cave principale > Armoire gauche > Ligne 3', wineAuto.data.location_path);
  console.log('OK wine auto', {
    drink_from: wineAuto.data.drink_from,
    drink_until: wineAuto.data.drink_until,
    potentiel: wineAuto.data.potentiel_garde,
  });

  const wineManual = await request('POST', '/api/wines', {
    domaine: 'Domaine Manuel',
    type: 'blanc',
    region: 'Loire',
    millesime: 2020,
    drink_from: 2021,
    drink_until: 2024,
    quantity: 2,
  });
  assert(wineManual.status === 201, 'create wine manual failed');
  assert(wineManual.data.apogee_source === 'manual', 'expected manual source');
  assert(wineManual.data.drink_from === 2021 && wineManual.data.drink_until === 2024, 'manual window kept');
  console.log('OK wine manual');

  const wineBeaujolais = await request('POST', '/api/wines', {
    domaine: 'Duboeuf',
    type: 'rouge',
    region: 'Beaujolais',
    millesime: 2023,
    quantity: 3,
  });
  assert(wineBeaujolais.data.drink_from === 2024 && wineBeaujolais.data.drink_until === 2027, 'beaujolais window');
  console.log('OK beaujolais vs bordeaux différenciés');

  const listed = await request('GET', '/api/wines?type=rouge');
  assert(listed.data.length >= 2, 'list filter failed');

  const search = await request('GET', '/api/wines?q=Pauillac');
  assert(search.data.some((w) => w.id === wineAuto.data.id), 'search failed');

  const updated = await request('PUT', `/api/wines/${wineAuto.data.id}`, { quantity: 5, notes: 'Magnum prévu' });
  assert(updated.data.quantity === 5 && updated.data.notes === 'Magnum prévu', 'update failed');
  assert(updated.data.drink_from === 2023, 'update should keep auto window');

  const recomputed = await request('POST', `/api/wines/${wineManual.data.id}/apogee`);
  assert(recomputed.data.apogee_source === 'auto', 'recompute source');
  assert(recomputed.data.drink_from === 2022 && recomputed.data.drink_until === 2027, 'loire blanc recompute');
  console.log('OK recompute', recomputed.data.potentiel_garde);

  const invalid = await request('POST', '/api/wines', { domaine: 'X', type: 'orange' });
  assert(invalid.status === 400, 'invalid type should 400');

  const notFound = await request('GET', '/api/wines/99999');
  assert(notFound.status === 404, 'missing wine should 404');

  const dash = await request('GET', '/api/dashboard');
  assert(dash.status === 200, 'dashboard failed');
  assert(dash.data.total_bottles >= 10, `bottles ${dash.data.total_bottles}`);
  assert(Array.isArray(dash.data.drink_this_year), 'drink_this_year missing');
  console.log('OK dashboard', {
    bottles: dash.data.total_bottles,
    refs: dash.data.total_references,
    drink_this_year: dash.data.drink_this_year.length,
    past_peak: dash.data.past_peak.length,
  });

  const blocked = await request('DELETE', `/api/locations/${armoire.data.id}`);
  assert(blocked.status === 400, 'delete parent with children should 400');

  await request('DELETE', `/api/wines/${wineAuto.data.id}`);
  await request('DELETE', `/api/wines/${wineManual.data.id}`);
  await request('DELETE', `/api/wines/${wineBeaujolais.data.id}`);
  await request('DELETE', `/api/locations/${ligne.data.id}`);
  await request('DELETE', `/api/locations/${armoire.data.id}`);

  const gone = await request('GET', `/api/wines/${wineAuto.data.id}`);
  assert(gone.status === 404, 'deleted wine should 404');
  console.log('OK delete cleanup');

  console.log('\nPhase 2 vérifiée : tous les scénarios passent.');
}

main().catch((err) => {
  console.error('FAILED', err);
  process.exit(1);
});
