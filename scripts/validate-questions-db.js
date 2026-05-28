const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'data', 'questions.json');

function fail(message) {
  console.error(`Question database validation failed: ${message}`);
  process.exitCode = 1;
}

function readDatabase() {
  if (!fs.existsSync(dbPath)) {
    fail(`missing ${path.relative(process.cwd(), dbPath)}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (error) {
    fail(`invalid JSON: ${error.message}`);
    return null;
  }
}

function validateQuestion(question, index) {
  const label = `questions[${index}]`;

  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    fail(`${label} must be an object`);
    return;
  }

  if (typeof question.category !== 'string' || !question.category.trim()) {
    fail(`${label}.category must be a non-empty string`);
  }

  if (typeof question.hint !== 'string' || question.hint.trim().length < 20) {
    fail(`${label}.hint must be a helpful string`);
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    fail(`${label}.options must contain exactly 4 options`);
    return;
  }

  const words = new Set();
  const fakeCount = question.options.filter((option, optionIndex) => {
    const optionLabel = `${label}.options[${optionIndex}]`;
    if (!option || typeof option !== 'object' || Array.isArray(option)) {
      fail(`${optionLabel} must be an object`);
      return false;
    }
    if (typeof option.word !== 'string' || !option.word.trim()) {
      fail(`${optionLabel}.word must be a non-empty string`);
    } else {
      const normalized = option.word.trim().toLowerCase();
      if (words.has(normalized)) {
        fail(`${label} contains duplicate option word "${option.word}"`);
      }
      words.add(normalized);
    }
    if (typeof option.fake !== 'boolean') {
      fail(`${optionLabel}.fake must be boolean`);
    }
    return option.fake === true;
  }).length;

  if (fakeCount !== 1) {
    fail(`${label} must contain exactly one fake option`);
  }
}

const db = readDatabase();

if (db) {
  if (!Array.isArray(db.categories) || db.categories.length < 10) {
    fail('categories must contain at least 10 category names');
  }

  if (!Array.isArray(db.questions)) {
    fail('questions must be an array');
  } else {
    if (db.questions.length !== 250) {
      fail(`questions must contain exactly 250 entries, found ${db.questions.length}`);
    }
    db.questions.forEach(validateQuestion);
  }
}

if (process.exitCode) {
  process.exit();
}

console.log(`Question database OK: ${db.questions.length} questions across ${db.categories.length} categories.`);
