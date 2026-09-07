const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const originalPath = path.join(root, 'questions.json');
const rewrittenPath = path.join(root, 'question-sets', 'current-rewritten.json');
const newPath = path.join(root, 'question-sets', 'new-original.json');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const original = readJson(originalPath).questions;
const rewritten = readJson(rewrittenPath);
const additions = readJson(newPath);
const errors = [];

function normalized(value) {
  return value
    .toLocaleLowerCase('et')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9õäöüšž]+/g, ' ')
    .trim();
}

function wordSet(value) {
  return new Set(normalized(value).split(' ').filter((word) => word.length > 2));
}

function jaccard(left, right) {
  const a = wordSet(left);
  const b = wordSet(right);
  const intersection = [...a].filter((word) => b.has(word)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function validateSet(document, label) {
  if (document.metadata?.status !== 'review') {
    errors.push(`${label}: metadata.status peab olema "review".`);
  }
  if (!Array.isArray(document.questions) || document.questions.length === 0) {
    errors.push(`${label}: questions peab olema mittetühi massiiv.`);
    return;
  }
  if (document.metadata?.questionCount !== document.questions.length) {
    errors.push(`${label}: metadata.questionCount ei vasta küsimuste tegelikule arvule.`);
  }

  const ids = new Set();
  const texts = new Set();
  for (const [index, question] of document.questions.entries()) {
    const location = `${label}[${index}]`;
    if (!question.id || ids.has(question.id)) errors.push(`${location}: puuduv või korduv id.`);
    ids.add(question.id);

    const questionText = normalized(question.text || '');
    if (!questionText || texts.has(questionText)) errors.push(`${location}: puuduv või korduv küsimusetekst.`);
    texts.add(questionText);

    if (!Array.isArray(question.options) || question.options.length < 2) {
      errors.push(`${location}: vaja on vähemalt kahte vastusevarianti.`);
      continue;
    }
    if (new Set(question.options.map(normalized)).size !== question.options.length) {
      errors.push(`${location}: korduvad vastusevariandid.`);
    }
    if (!Array.isArray(question.correct) || question.correct.length === 0) {
      errors.push(`${location}: vähemalt üks õige vastus on kohustuslik.`);
    } else if (question.correct.some((answer) => !Number.isInteger(answer) || answer < 0 || answer >= question.options.length)) {
      errors.push(`${location}: correct sisaldab vigast indeksit.`);
    }
    if (question.multiple !== (question.correct?.length > 1)) {
      errors.push(`${location}: multiple ei vasta õigete vastuste arvule.`);
    }
    if (!question.explanation?.trim()) errors.push(`${location}: selgitus puudub.`);
    if (!Array.isArray(question.references) || question.references.length === 0) {
      errors.push(`${location}: allikaviide puudub.`);
    }
  }
}

validateSet(rewritten, 'rewritten');
validateSet(additions, 'new');

const originalIds = original.map((question) => question.id).sort((a, b) => a - b);
const rewrittenLegacyIds = rewritten.questions.map((question) => question.legacyId).sort((a, b) => a - b);
if (rewritten.questions.length !== original.length) {
  errors.push(`rewritten: oodati ${original.length} küsimust, leiti ${rewritten.questions.length}.`);
}
if (JSON.stringify(originalIds) !== JSON.stringify(rewrittenLegacyIds)) {
  errors.push('rewritten: legacyId väärtused ei kattu täpselt algküsimuste id-dega.');
}

const originalById = new Map(original.map((question) => [question.id, question]));
for (const question of rewritten.questions) {
  const source = originalById.get(question.legacyId);
  if (source && normalized(source.text) === normalized(question.text)) {
    errors.push(`rewritten ${question.id}: tekst on algküsimusega identne.`);
  }
  if (source && jaccard(source.text, question.text) > 0.78) {
    errors.push(`rewritten ${question.id}: tekst on algküsimusega liiga sarnane.`);
  }
  if (source && jaccard(
    [source.text, ...source.options].join(' '),
    [question.text, ...question.options].join(' ')
  ) > 0.65) {
    errors.push(`rewritten ${question.id}: küsimus ja vastusevariandid on tervikuna algversiooniga liiga sarnased.`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`OK: ${original.length} algküsimust, ${rewritten.questions.length} asendusküsimust ja ${additions.questions.length} uut küsimust.`);
}
