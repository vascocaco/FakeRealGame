(function loadQuestionData(root) {
  'use strict';

  const database = typeof module !== 'undefined' && module.exports
    ? require('./data/questions.json')
    : root.QUESTIONS_DB;

  const RECENT_QUESTIONS_STORAGE_KEY = 'fakeRealRecentQuestionKeys';
  const ROUNDS = Array.isArray(database?.questions) ? database.questions : [];
  const CATEGORIES = Array.isArray(database?.categories) ? database.categories : [];
  let recentQuestionKeys = readRecentQuestionKeys();

  function randomInt(maxExclusive) {
    const cryptoApi = root.crypto;
    if (cryptoApi?.getRandomValues && Number.isInteger(maxExclusive) && maxExclusive > 0) {
      const values = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
      let value;
      do {
        cryptoApi.getRandomValues(values);
        value = values[0];
      } while (value >= limit);
      return value % maxExclusive;
    }

    return Math.floor(Math.random() * maxExclusive);
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function readRecentQuestionKeys() {
    try {
      const raw = root.sessionStorage?.getItem(RECENT_QUESTIONS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((key) => typeof key === 'string') : [];
    } catch (_error) {
      return [];
    }
  }

  function writeRecentQuestionKeys(keys) {
    recentQuestionKeys = keys;
    try {
      root.sessionStorage?.setItem(RECENT_QUESTIONS_STORAGE_KEY, JSON.stringify(keys));
    } catch (_error) {
      // Browsers can block storage in some modes; in-memory history still works for this page load.
    }
  }

  function questionKey(round) {
    const fake = round.options.find((option) => option.fake === true);
    return `${round.category}:${fake?.word || round.hint}`;
  }

  function groupRoundsByCategory(rounds) {
    return rounds.reduce((groups, round) => {
      const category = round.category || 'Mixed';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category).push(round);
      return groups;
    }, new Map());
  }

  function rememberSelectedQuestions(rounds, targetRounds) {
    const selectedKeys = rounds.map(questionKey);
    const maxRecent = Math.max(0, Math.min(ROUNDS.length - targetRounds, 100));
    writeRecentQuestionKeys([...selectedKeys, ...recentQuestionKeys]
      .filter((key, index, keys) => keys.indexOf(key) === index)
      .slice(0, maxRecent));
  }

  function buildBalancedRoundSet(targetRounds) {
    const selected = [];
    const selectedKeys = new Set();
    const recentKeys = new Set(recentQuestionKeys);
    const groups = groupRoundsByCategory(ROUNDS);

    while (selected.length < targetRounds && selectedKeys.size < ROUNDS.length) {
      let addedThisPass = false;

      shuffle([...groups.keys()]).forEach((category) => {
        if (selected.length >= targetRounds) return;

        const categoryRounds = groups.get(category) || [];
        const unused = categoryRounds.filter((round) => !selectedKeys.has(questionKey(round)));
        const fresh = unused.filter((round) => !recentKeys.has(questionKey(round)));
        const pool = fresh.length ? fresh : unused;
        const next = shuffle(pool)[0];

        if (next) {
          const key = questionKey(next);
          selected.push(next);
          selectedKeys.add(key);
          addedThisPass = true;
        }
      });

      if (!addedThisPass) break;
    }

    rememberSelectedQuestions(selected, targetRounds);
    return selected;
  }

  // Pick N rounds at random and shuffle their options.
  function buildGame(n = 15) {
    const targetRounds = Math.max(1, Math.min(Number(n) || 15, ROUNDS.length));
    const selected = buildBalancedRoundSet(targetRounds);
    return selected.map((round) => ({
      ...round,
      options: shuffle(round.options),
    }));
  }

  root.ROUNDS = ROUNDS;
  root.CATEGORIES = CATEGORIES;
  root.buildGame = buildGame;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ROUNDS, CATEGORIES, buildGame };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
