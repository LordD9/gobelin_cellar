const FRONT = 'http://localhost:5173';

async function request(method, path, body) {
  const res = await fetch(FRONT + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* html or binary handled as text */
  }
  return { status: res.status, data, text };
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function main() {
  const html = await request('GET', '/');
  assert(html.status === 200, `frontend ${html.status}`);
  assert(html.text.includes('Goblin Cellar'), 'title Goblin Cellar missing');
  assert(html.text.includes('/logo.jpg') || html.text.includes('logo'), 'logo reference missing');
  console.log('OK page d\'accueil');

  const logo = await fetch(FRONT + '/logo.jpg');
  assert(logo.ok, 'logo.jpg not served');
  assert((logo.headers.get('content-type') || '').includes('image'), logo.headers.get('content-type'));
  console.log('OK logo public');

  const health = await request('GET', '/api/health');
  assert(health.status === 200 && health.data.status === 'ok', 'proxy API failed');
  console.log('OK proxy /api/health');

  const locations = await request('GET', '/api/locations');
  assert(Array.isArray(locations.data) && locations.data.length >= 1, 'locations missing');
  const caveId = locations.data[0].id;

  const existing = await request('GET', '/api/wines');
  if (existing.data.length === 0) {
    await request('POST', '/api/wines', {
      domaine: 'Château Margaux',
      cuvee: 'Grand Vin',
      type: 'rouge',
      region: 'Bordeaux',
      appellation: 'Margaux',
      millesime: 2016,
      quantity: 3,
      location_id: caveId,
      cepages: 'Cabernet Sauvignon, Merlot',
      accords: 'Agneau, pigeon, fromages affinés',
    });
    await request('POST', '/api/wines', {
      domaine: 'Domaine de l\'Aigle',
      cuvee: 'Chardonnay',
      type: 'blanc',
      region: 'Languedoc',
      millesime: 2024,
      quantity: 6,
      location_id: caveId,
      cepages: 'Chardonnay',
      accords: 'Poissons grillés, volaille à la crème',
    });
    await request('POST', '/api/wines', {
      domaine: 'Taittinger',
      cuvee: 'Brut Réserve',
      type: 'petillant',
      region: 'Champagne',
      appellation: 'Champagne',
      millesime: 2018,
      quantity: 2,
      location_id: caveId,
    });
    console.log('OK vins de démonstration créés');
  } else {
    console.log('OK cave déjà peuplée', existing.data.length);
  }

  const dash = await request('GET', '/api/dashboard');
  assert(dash.status === 200, 'dashboard failed');
  assert(dash.data.total_bottles > 0, 'dashboard empty');
  console.log('OK dashboard', {
    bottles: dash.data.total_bottles,
    refs: dash.data.total_references,
    drink: dash.data.drink_this_year.length,
  });

  const estimate = await request(
    'GET',
    '/api/apogee/estimate?type=rouge&region=Bordeaux&appellation=Margaux&millesime=2016',
  );
  assert(estimate.data.estimate.drink_from === 2023, 'estimate form preview');
  console.log('OK aperçu apogée formulaire');

  console.log('\nPhase 3 vérifiée (HTTP + proxy).');
}

main().catch((err) => {
  console.error('FAILED', err);
  process.exit(1);
});
