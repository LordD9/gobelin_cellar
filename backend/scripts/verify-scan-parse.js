const assert = require('node:assert/strict');
const {
  extractJsonObject,
  identificationFromModel,
  normalizeWineType,
  parseImagePayload,
} = require('../dist/services/scanParse');

function main() {
  const fromFence = extractJsonObject('Voici\n```json\n{"domaine":"Latour","type":"rouge"}\n```');
  assert.equal(fromFence.domaine, 'Latour');

  const noisy = extractJsonObject('Je pense que {"appellation":"Pauillac","millesime":2015} est correct.');
  assert.equal(noisy.appellation, 'Pauillac');

  assert.equal(normalizeWineType('Rosé'), 'rose');
  assert.equal(normalizeWineType('Champagne'), 'petillant');
  assert.equal(normalizeWineType('white'), 'blanc');
  assert.equal(normalizeWineType('inconnu'), null);

  const ident = identificationFromModel({
    domaine: '  Château Test ',
    type: 'Red',
    millesime: 'Millésime 2018',
    confidence: 80,
    raw_text: 'CHATEAU TEST 2018',
  });
  assert.equal(ident.domaine, 'Château Test');
  assert.equal(ident.type, 'rouge');
  assert.equal(ident.millesime, 2018);
  assert.equal(ident.confidence, 0.8);

  const { mime } = parseImagePayload(`data:image/jpeg;base64,${'A'.repeat(40)}`);
  assert.equal(mime, 'image/jpeg');

  console.log('OK scan parse');
}

main();
