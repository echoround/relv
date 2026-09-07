const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const paths = {
  active: path.join(root, 'questions.json'),
  activeMin: path.join(root, 'questions.min.json'),
  explanations: path.join(root, 'explanations.json'),
  explanationsMin: path.join(root, 'explanations.min.json'),
  canonical: path.join(root, 'question-sets', 'current-rewritten.json'),
  rejected: path.join(root, 'question-sets', 'new-original.json')
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const active = readJson(paths.active);
const activeMin = readJson(paths.activeMin);
const explanations = readJson(paths.explanations);
const explanationsMin = readJson(paths.explanationsMin);
const canonical = readJson(paths.canonical);
const rejected = readJson(paths.rejected);
const errors = [];

function normalized(value) {
  return String(value ?? '')
    .toLocaleLowerCase('et')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9õäöüšž]+/g, ' ')
    .trim();
}

function validateQuestions(questions, label, { requireReferences = false } = {}) {
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push(`${label}: questions peab olema mittetühi massiiv.`);
    return;
  }

  const ids = new Set();
  const texts = new Set();
  for (const [index, question] of questions.entries()) {
    const location = `${label}[${index}]`;
    const id = String(question.id ?? '');
    if (!id || ids.has(id)) errors.push(`${location}: puuduv või korduv id.`);
    ids.add(id);

    const questionText = normalized(question.text);
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
    if (requireReferences && (!Array.isArray(question.references) || question.references.length === 0)) {
      errors.push(`${location}: allikaviide puudub.`);
    }
  }
}

if (canonical.metadata?.status !== 'active') {
  errors.push('canonical: metadata.status peab olema "active".');
}
if (canonical.metadata?.questionCount !== canonical.questions?.length) {
  errors.push('canonical: metadata.questionCount ei vasta küsimuste tegelikule arvule.');
}
if (rejected.metadata?.status !== 'rejected-draft') {
  errors.push('rejected: metadata.status peab olema "rejected-draft".');
}
if (rejected.metadata?.questionCount !== rejected.questions?.length) {
  errors.push('rejected: metadata.questionCount ei vasta küsimuste tegelikule arvule.');
}

validateQuestions(canonical.questions, 'canonical', { requireReferences: true });
validateQuestions(rejected.questions, 'rejected', { requireReferences: true });
validateQuestions(active.questions, 'active');

if (canonical.questions?.length !== 71 || active.questions?.length !== 71) {
  errors.push('Aktiivses ja kanoonilises komplektis peab olema täpselt 71 küsimust.');
}

const expectedActive = {
  questions: canonical.questions.map((question) => ({
    id: question.legacyId,
    text: question.text,
    options: question.options,
    correct: question.correct,
    multiple: question.multiple,
    explanation: question.explanation
  }))
};
const expectedExplanations = {
  explanations: canonical.questions.map((question) => ({
    id: question.legacyId,
    text: question.explanation
  }))
};

if (JSON.stringify(active) !== JSON.stringify(expectedActive)) {
  errors.push('questions.json ei vasta current-rewritten.json aktiivsele teisendusele.');
}
if (JSON.stringify(explanations) !== JSON.stringify(expectedExplanations)) {
  errors.push('explanations.json ei vasta current-rewritten.json selgitustele.');
}
if (JSON.stringify(activeMin) !== JSON.stringify(active)) {
  errors.push('questions.min.json ei ole questions.json-iga semantiliselt identne.');
}
if (JSON.stringify(explanationsMin) !== JSON.stringify(explanations)) {
  errors.push('explanations.min.json ei ole explanations.json-iga semantiliselt identne.');
}
if (active.questions?.some((question) => String(question.id).startsWith('new-'))) {
  errors.push('Tagasilükatud new-* küsimus on sattunud aktiivsesse komplekti.');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`OK: ${active.questions.length} aktiivset küsimust; ${rejected.questions.length} lisaküsimust on eraldatud ja tagasi lükatud.`);
}
