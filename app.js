(() => {
  'use strict';

  const DEFAULT_QUESTION_COUNT = 15;
  const DEFAULT_HELPER_COUNT = 3;
  const POINTS_CORRECT = 100;
  const STREAK_BONUS = 25; // per streak level beyond first

  // ===== STATE =====
  const state = {
    rounds: [],
    index: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    answered: false,
    hintRevealed: false,
    guilleAiConfidence: null,
    guilleAiWord: '',
    helperCount: DEFAULT_HELPER_COUNT
  };

  // ===== ELEMENTS =====
  const el = {
    screens: {
      intro:   document.getElementById('screen-intro'),
      lobby:   document.getElementById('screen-lobby'),
      waiting: document.getElementById('screen-waiting'),
      game:    document.getElementById('screen-game'),
      results: document.getElementById('screen-results'),
      podium:  document.getElementById('screen-podium')
    },
    score:        document.getElementById('score'),
    streak:       document.getElementById('streak'),
    flame:        document.getElementById('flame'),
    round:        document.getElementById('round'),
    totalRounds:  document.getElementById('total-rounds'),
    progressFill: document.getElementById('progress-fill'),
    categoryTag:  document.getElementById('category-tag'),
    options:      document.getElementById('options'),
    feedback:     document.getElementById('feedback'),
    feedbackIcon: document.getElementById('feedback-icon'),
    feedbackTitle:document.getElementById('feedback-title'),
    feedbackDetail:document.getElementById('feedback-detail'),
    roundHint:     document.getElementById('round-hint'),
    btnStart:     document.getElementById('btn-start'),
    btnNext:      document.getElementById('btn-next'),
    btnRestart:   document.getElementById('btn-restart'),
    soloQuestionCount: document.getElementById('solo-question-count'),
    soloHelperCount: document.getElementById('solo-helper-count'),
    helperBar:    document.getElementById('helper-bar'),
    helper50:     document.getElementById('helper-50-50'),
    helperGuilleAi: document.getElementById('helper-guilleai'),
    helperExtraHint: document.getElementById('helper-extra-hint'),
    guilleAiPanel: document.getElementById('guilleai-panel'),
    guilleAiMessage: document.getElementById('guilleai-message'),
    btnDismissGuilleAi: document.getElementById('btn-guilleai-dismiss'),
    finalScore:   document.getElementById('final-score'),
    finalCorrect: document.getElementById('final-correct'),
    finalStreak:  document.getElementById('final-streak'),
    rankBadge:    document.getElementById('rank-badge'),
    resultsTitle: document.getElementById('results-title'),
    resultsSubtitle: document.getElementById('results-subtitle'),
    trophy:       document.getElementById('trophy')
  };

  const helperButtons = {
    'extra-hint': el.helperExtraHint,
    '50-50': el.helper50,
    guilleai: el.helperGuilleAi
  };

  // ===== HELPERS =====
  function clampInt(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isInteger(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function hideGuilleAiPanel() {
    el.guilleAiPanel.style.display = 'none';
  }

  function showGuilleAiPanel() {
    el.guilleAiPanel.style.display = '';
  }

  function setRoundHint(text, visible) {
    el.roundHint.textContent = text;
    el.roundHint.classList.toggle('visible', Boolean(visible));
  }

  function syncConfigBounds() {
    const hasRounds = typeof ROUNDS !== 'undefined' && Array.isArray(ROUNDS);
    const maxRounds = hasRounds ? ROUNDS.length : DEFAULT_QUESTION_COUNT;
    const defaultQuestions = Math.min(DEFAULT_QUESTION_COUNT, maxRounds);
    el.soloQuestionCount.max = String(maxRounds);
    el.soloQuestionCount.value = String(clampInt(el.soloQuestionCount.value, 1, maxRounds, defaultQuestions));
    el.soloHelperCount.value = String(clampInt(el.soloHelperCount.value, 0, 3, DEFAULT_HELPER_COUNT));
  }

  function readSoloConfig() {
    const hasRounds = typeof ROUNDS !== 'undefined' && Array.isArray(ROUNDS);
    const maxRounds = hasRounds ? ROUNDS.length : DEFAULT_QUESTION_COUNT;
    const defaultQuestions = Math.min(DEFAULT_QUESTION_COUNT, maxRounds);
    const questionCount = clampInt(el.soloQuestionCount.value, 1, maxRounds, defaultQuestions);
    const helperCount = clampInt(el.soloHelperCount.value, 0, 3, DEFAULT_HELPER_COUNT);
    el.soloQuestionCount.value = String(questionCount);
    el.soloHelperCount.value = String(helperCount);
    return { questionCount, helperCount };
  }

  function updateHelperButtons(locked) {
    if (!window.Helpers) {
      el.helperBar.style.display = 'none';
      return;
    }

    const activeTypes = window.Helpers.getActiveTypes();
    el.helperBar.style.display = activeTypes.length ? 'flex' : 'none';

    Object.entries(helperButtons).forEach(([typeKey, button]) => {
      const isActive = activeTypes.includes(typeKey);
      const isSpent = window.Helpers.isSpent(typeKey);

      button.classList.toggle('helper-btn--hidden', !isActive);
      button.classList.toggle('helper-btn--spent', isSpent);
      button.disabled = !isActive || isSpent || Boolean(locked);
    });
  }

  function resetRoundHelperState() {
    state.hintRevealed = false;
    state.guilleAiConfidence = null;
    state.guilleAiWord = '';
    setRoundHint('', false);
    hideGuilleAiPanel();
  }

  function showScreen(name) {
    Object.values(el.screens).forEach(s => s.classList.remove('active'));
    el.screens[name].classList.add('active');
  }

  function animateValue(node, from, to, duration = 600) {
    const start = performance.now();
    const step = now => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (to - from) * eased);
      node.textContent = val;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function updateHud() {
    el.round.textContent = state.index + 1;
    el.totalRounds.textContent = state.rounds.length;
    el.progressFill.style.width = `${(state.index / state.rounds.length) * 100}%`;
    el.streak.firstChild.textContent = state.streak;
    if (state.streak >= 2) el.flame.classList.add('active');
    else el.flame.classList.remove('active');
  }

  function renderRound() {
    const round = state.rounds[state.index];
    state.answered = false;
    resetRoundHelperState();
    el.categoryTag.textContent = round.category;
    el.feedback.classList.remove('visible', 'correct', 'incorrect');
    el.options.innerHTML = '';

    round.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.type = 'button';
      btn.dataset.fake = String(opt.fake);
      btn.innerHTML = `
        <span class="option-letter">${String.fromCharCode(65 + i)}</span>
        <span class="option-text">${opt.word}</span>
      `;
      btn.addEventListener('click', () => onAnswer(btn, opt));
      el.options.appendChild(btn);
    });

    updateHelperButtons(false);
    updateHud();
  }

  function onAnswer(button, option) {
    if (state.answered || button.disabled || button.classList.contains('option--disabled')) return;
    state.answered = true;
    updateHelperButtons(true);

    const buttons = el.options.querySelectorAll('.option');
    buttons.forEach(b => {
      b.disabled = true;
      const isFake = b.dataset.fake === 'true';
      if (isFake) b.classList.add('correct');
      else if (b === button) b.classList.add('incorrect');
      else if (!b.classList.contains('option--disabled')) b.classList.add('dimmed');
    });

    const wasCorrect = option.fake;
    const round = state.rounds[state.index];

    if (wasCorrect) {
      state.correct++;
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      const bonus = Math.max(0, state.streak - 1) * STREAK_BONUS;
      const gained = POINTS_CORRECT + bonus;
      const prev = state.score;
      state.score += gained;
      animateValue(el.score, prev, state.score, 700);

      el.feedback.classList.add('visible', 'correct');
      el.feedbackIcon.textContent = '✓';
      el.feedbackTitle.textContent = bonus > 0
        ? `Nailed it! +${gained} (streak bonus +${bonus})`
        : `Correct! +${gained}`;
    } else {
      state.streak = 0;
      const fake = round.options.find(o => o.fake);
      el.feedback.classList.add('visible', 'incorrect');
      el.feedbackIcon.textContent = '✕';
      el.feedbackTitle.textContent = `Not quite — the fake was “${fake.word}”`;
    }

    el.feedbackDetail.textContent = round.hint;
    if (!state.hintRevealed) {
      setRoundHint('', false);
    }
    updateHud();

    el.btnNext.textContent =
      state.index + 1 >= state.rounds.length ? 'See results →' : 'Next →';
    el.btnNext.focus();
  }

  function nextRound() {
    state.index++;
    if (state.index >= state.rounds.length) {
      showResults();
    } else {
      renderRound();
    }
  }

  function rankFor(score, correct, total) {
    const pct = correct / total;
    if (pct === 1)   return { rank: 'Master Detective 🕵️', title: 'Flawless victory!', sub: 'You saw through every disguise.', trophy: '👑' };
    if (pct >= 0.8)  return { rank: 'Word Sleuth',           title: 'Brilliantly done!',  sub: 'Few impostors slipped past you.',  trophy: '🏆' };
    if (pct >= 0.6)  return { rank: 'Sharp Eye',             title: 'Nicely played!',     sub: 'Solid intuition — keep training.',  trophy: '🎯' };
    if (pct >= 0.4)  return { rank: 'Curious Apprentice',    title: 'Not bad!',           sub: 'You\'re getting the hang of it.',    trophy: '🔍' };
    return                  { rank: 'Rookie Detective',      title: 'Tough round!',       sub: 'Even pros miss a few — try again!', trophy: '🌱' };
  }

  function showResults() {
    el.progressFill.style.width = '100%';
    hideGuilleAiPanel();
    const r = rankFor(state.score, state.correct, state.rounds.length);
    el.finalCorrect.textContent = `${state.correct}/${state.rounds.length}`;
    el.finalStreak.textContent = state.bestStreak;
    el.rankBadge.textContent = r.rank;
    el.resultsTitle.textContent = r.title;
    el.resultsSubtitle.textContent = r.sub;
    el.trophy.textContent = r.trophy;
    el.finalScore.textContent = '0';
    showScreen('results');
    animateValue(el.finalScore, 0, state.score, 1100);
  }

  function activateFiftyFifty() {
    if (window.isMultiplayerMode?.()) return;
    if (state.answered || !window.Helpers?.canActivate('50-50')) return;

    const nonFakeButtons = [...el.options.querySelectorAll('.option')]
      .filter((btn) => btn.dataset.fake !== 'true' && !btn.classList.contains('option--disabled'));

    const shuffled = nonFakeButtons.toSorted(() => Math.random() - 0.5);
    const toDisable = shuffled.slice(0, 2);
    toDisable.forEach((btn) => {
      btn.classList.add('option--disabled');
      btn.disabled = true;
    });

    window.Helpers.markSpent('50-50');
    updateHelperButtons(false);
  }

  function activateGuilleAi() {
    if (window.isMultiplayerMode?.()) return;
    if (state.answered || !window.Helpers?.canActivate('guilleai')) return;

    const round = state.rounds[state.index];
    const fake = round.options.find((opt) => opt.fake);
    if (!fake) return;

    state.guilleAiWord = fake.word;
    state.guilleAiConfidence = Math.floor(Math.random() * 31) + 65;

    el.guilleAiMessage.textContent = `GuilleAI analysed the category and is ${state.guilleAiConfidence}% confident that "${state.guilleAiWord}" is the impostor.`;
    showGuilleAiPanel();

    window.Helpers.markSpent('guilleai');
    updateHelperButtons(false);
  }

  function activateExtraHint() {
    if (window.isMultiplayerMode?.()) return;
    if (state.answered || !window.Helpers?.canActivate('extra-hint')) return;

    const round = state.rounds[state.index];
    state.hintRevealed = true;
    setRoundHint(round.hint, true);
    window.Helpers.markSpent('extra-hint');
    updateHelperButtons(false);
  }

  function startGame() {
    syncConfigBounds();
    const { questionCount, helperCount } = readSoloConfig();

    window.Helpers?.reset();
    window.Helpers?.init(helperCount);

    state.rounds = buildGame(questionCount);
    state.index = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.correct = 0;
    state.helperCount = helperCount;
    el.score.textContent = '0';
    // Hide multiplayer-only UI
    document.getElementById('timer-ring').style.display = 'none';
    document.getElementById('game-leaderboard').style.display = 'none';
    document.getElementById('waiting-indicator').style.display = 'none';
    el.btnNext.style.display = '';
    showScreen('game');
    renderRound();
  }

  // ===== EVENTS =====
  syncConfigBounds();
  el.btnStart.addEventListener('click', startGame);
  el.btnRestart.addEventListener('click', startGame);
  el.btnNext.addEventListener('click', nextRound);
  el.helper50.addEventListener('click', activateFiftyFifty);
  el.helperGuilleAi.addEventListener('click', activateGuilleAi);
  el.helperExtraHint.addEventListener('click', activateExtraHint);
  el.btnDismissGuilleAi.addEventListener('click', hideGuilleAiPanel);

  // Keyboard support: A/B/C/D and Enter (solo mode only)
  document.addEventListener('keydown', (e) => {
    if (window.isMultiplayerMode?.()) return;
    if (!el.screens.game.classList.contains('active')) return;
    const key = e.key.toLowerCase();
    if (['a','b','c','d','1','2','3','4'].includes(key)) {
      const idx = 'abcd'.includes(key) ? 'abcd'.indexOf(key) : parseInt(key, 10) - 1;
      const btn = el.options.querySelectorAll('.option')[idx];
      if (btn && !btn.disabled) btn.click();
    } else if (e.key === 'Enter' && state.answered) {
      nextRound();
    }
  });
})();
