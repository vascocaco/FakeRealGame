(() => {
  'use strict';

  const TOTAL_ROUNDS = 10;
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
    answered: false
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
    btnStart:     document.getElementById('btn-start'),
    btnNext:      document.getElementById('btn-next'),
    btnRestart:   document.getElementById('btn-restart'),
    finalScore:   document.getElementById('final-score'),
    finalCorrect: document.getElementById('final-correct'),
    finalStreak:  document.getElementById('final-streak'),
    rankBadge:    document.getElementById('rank-badge'),
    resultsTitle: document.getElementById('results-title'),
    resultsSubtitle: document.getElementById('results-subtitle'),
    trophy:       document.getElementById('trophy')
  };

  // ===== HELPERS =====
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

    updateHud();
  }

  function onAnswer(button, option) {
    if (state.answered) return;
    state.answered = true;

    const buttons = el.options.querySelectorAll('.option');
    buttons.forEach(b => {
      b.disabled = true;
      const isFake = b.dataset.fake === 'true';
      if (isFake) b.classList.add('correct');
      else if (b === button) b.classList.add('incorrect');
      else b.classList.add('dimmed');
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

  function startGame() {
    state.rounds = buildGame(TOTAL_ROUNDS);
    state.index = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.correct = 0;
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
  el.btnStart.addEventListener('click', startGame);
  el.btnRestart.addEventListener('click', startGame);
  el.btnNext.addEventListener('click', nextRound);

  // Keyboard support: A/B/C/D and Enter (solo mode only)
  document.addEventListener('keydown', (e) => {
    if (window.isMultiplayerMode && window.isMultiplayerMode()) return;
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
