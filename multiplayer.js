// multiplayer.js — Client-side multiplayer game logic
(() => {
  'use strict';

  const socket = window.gameSocket;
  let multiplayerMode = false;
  let currentRound = null;
  let hasAnswered = false;

  // ===== ELEMENTS =====
  const el = {
    screenGame: document.getElementById('screen-game'),
    screenPodium: document.getElementById('screen-podium'),
    timerRing: document.getElementById('timer-ring'),
    timerFill: document.getElementById('timer-fill'),
    timerText: document.getElementById('timer-text'),
    waitingIndicator: document.getElementById('waiting-indicator'),
    answerProgressText: document.getElementById('answer-progress-text'),
    gameLeaderboard: document.getElementById('game-leaderboard'),
    lbList: document.getElementById('lb-list'),
    options: document.getElementById('options'),
    categoryTag: document.getElementById('category-tag'),
    feedback: document.getElementById('feedback'),
    feedbackIcon: document.getElementById('feedback-icon'),
    feedbackTitle: document.getElementById('feedback-title'),
    feedbackDetail: document.getElementById('feedback-detail'),
    btnNext: document.getElementById('btn-next'),
    progressFill: document.getElementById('progress-fill'),
    score: document.getElementById('score'),
    streak: document.getElementById('streak'),
    flame: document.getElementById('flame'),
    round: document.getElementById('round'),
    totalRounds: document.getElementById('total-rounds'),
    // Podium elements
    loserReveal: document.getElementById('loser-reveal'),
    loserName: document.getElementById('loser-name'),
    podiumSection: document.getElementById('podium-section'),
    podium1: document.getElementById('podium-1'),
    podium2: document.getElementById('podium-2'),
    podium3: document.getElementById('podium-3'),
    finalLbList: document.getElementById('final-lb-list'),
    btnPlayAgain: document.getElementById('btn-play-again'),
    btnLeavePodium: document.getElementById('btn-leave-podium'),
    crowdCheer: document.getElementById('crowd-cheer')
  };

  // Timer animation
  const TIMER_CIRCUMFERENCE = 2 * Math.PI * 45; // radius 45 from SVG

  function setTimer(seconds) {
    el.timerText.textContent = seconds;
    const fraction = seconds / 15;
    const offset = TIMER_CIRCUMFERENCE * (1 - fraction);
    el.timerFill.style.strokeDashoffset = offset;

    // Color changes
    if (seconds <= 5) {
      el.timerFill.classList.add('timer-danger');
      el.timerFill.classList.remove('timer-warning');
    } else if (seconds <= 10) {
      el.timerFill.classList.add('timer-warning');
      el.timerFill.classList.remove('timer-danger');
    } else {
      el.timerFill.classList.remove('timer-warning', 'timer-danger');
    }
  }

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${name}`).classList.add('active');
  }

  // ===== GAME STARTED =====
  socket.on('game-started', ({ totalRounds }) => {
    multiplayerMode = true;
    el.timerRing.style.display = '';
    el.gameLeaderboard.style.display = '';
    el.btnNext.style.display = 'none'; // Server controls progression
    el.totalRounds.textContent = totalRounds;
    el.score.textContent = '0';
    el.streak.firstChild.textContent = '0';
    el.flame.classList.remove('active');
    el.progressFill.style.width = '0%';
    showScreen('game');
  });

  // ===== ROUND START =====
  socket.on('round-start', (round) => {
    currentRound = round;
    hasAnswered = false;

    el.categoryTag.textContent = round.category;
    el.round.textContent = round.index + 1;
    el.progressFill.style.width = `${(round.index / round.total) * 100}%`;
    el.feedback.classList.remove('visible', 'correct', 'incorrect');
    el.waitingIndicator.style.display = 'none';
    el.options.innerHTML = '';

    // Reset timer
    el.timerFill.style.strokeDasharray = TIMER_CIRCUMFERENCE;
    el.timerFill.style.strokeDashoffset = 0;
    setTimer(15);

    // Render options
    round.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option';
      btn.type = 'button';
      btn.innerHTML = `
        <span class="option-letter">${String.fromCharCode(65 + i)}</span>
        <span class="option-text">${opt.word}</span>
      `;
      btn.addEventListener('click', () => onMultiplayerAnswer(btn, i));
      el.options.appendChild(btn);
    });
  });

  // ===== TIMER TICK =====
  socket.on('timer-tick', (seconds) => {
    if (multiplayerMode) setTimer(seconds);
  });

  // ===== ANSWER SUBMISSION =====
  function onMultiplayerAnswer(button, optionIndex) {
    if (hasAnswered) return;
    hasAnswered = true;

    // Highlight selected
    button.classList.add('selected');
    const buttons = el.options.querySelectorAll('.option');
    buttons.forEach(b => { b.disabled = true; });

    // Send to server
    socket.emit('submit-answer', { optionIndex });

    // Show waiting
    el.waitingIndicator.style.display = 'flex';
    el.answerProgressText.textContent = 'Waiting for others...';
  }

  // Keyboard support for multiplayer
  document.addEventListener('keydown', (e) => {
    if (!multiplayerMode) return;
    if (!el.screenGame.classList.contains('active')) return;
    if (hasAnswered) return;

    const key = e.key.toLowerCase();
    if (['a', 'b', 'c', 'd', '1', '2', '3', '4'].includes(key)) {
      const idx = 'abcd'.includes(key) ? 'abcd'.indexOf(key) : parseInt(key, 10) - 1;
      const btn = el.options.querySelectorAll('.option')[idx];
      if (btn && !btn.disabled) btn.click();
    }
  });

  // ===== ANSWER PROGRESS =====
  socket.on('answer-progress', ({ answered, total }) => {
    if (hasAnswered) {
      el.answerProgressText.textContent = `Waiting for others... (${answered}/${total})`;
    }
  });

  // ===== ROUND RESULTS =====
  socket.on('round-results', (result) => {
    el.waitingIndicator.style.display = 'none';

    const buttons = el.options.querySelectorAll('.option');
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === result.fakeIndex) {
        b.classList.add('correct');
      } else if (b.classList.contains('selected') && i !== result.fakeIndex) {
        b.classList.add('incorrect');
      } else {
        b.classList.add('dimmed');
      }
    });

    // Find my result
    const myResult = result.results.find(r => r.id === socket.id);
    if (myResult) {
      if (myResult.correct) {
        el.feedback.classList.add('visible', 'correct');
        el.feedbackIcon.textContent = '✓';
        let title = `Correct! +${myResult.earned}`;
        if (myResult.speedBonus > 0) title += ` (speed +${myResult.speedBonus})`;
        el.feedbackTitle.textContent = title;

        // Update displayed score
        el.score.textContent = myResult.score;
      } else {
        el.feedback.classList.add('visible', 'incorrect');
        el.feedbackIcon.textContent = '✕';
        el.feedbackTitle.textContent = `Not quite — the fake was "${result.fakeWord}"`;
      }
    }
    el.feedbackDetail.textContent = result.hint;

    // Update streak display
    if (myResult) {
      const myFullResult = result.leaderboard.find(r => r.id === socket.id);
      // streak is not in leaderboard, derive from consecutive corrects
    }

    // Update leaderboard
    renderLeaderboard(result.leaderboard);
  });

  // ===== LEADERBOARD =====
  function renderLeaderboard(leaderboard) {
    el.lbList.innerHTML = leaderboard.map((p, i) => {
      const isMe = p.id === socket.id;
      return `<li class="lb-item ${isMe ? 'lb-me' : ''}">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-name">${p.nickname}${isMe ? ' (you)' : ''}</span>
        <span class="lb-score">${p.score}</span>
      </li>`;
    }).join('');
  }

  // ===== GAME OVER =====
  socket.on('game-over', ({ leaderboard, loser, podium }) => {
    multiplayerMode = false;
    el.progressFill.style.width = '100%';

    // Show podium screen
    showScreen('podium');

    // Step 1: Loser reveal with crowd cheer
    el.loserReveal.style.display = '';
    el.podiumSection.style.display = 'none';
    el.loserName.textContent = loser ? loser.nickname : '???';

    // Play crowd cheer sound
    if (el.crowdCheer) {
      el.crowdCheer.currentTime = 0;
      el.crowdCheer.play().catch(() => {}); // ignore autoplay restrictions
    }

    // Step 2: After 4 seconds show podium
    setTimeout(() => {
      el.loserReveal.style.display = 'none';
      el.podiumSection.style.display = '';

      // Fill podium
      if (podium[0]) fillPodiumPlace(el.podium1, podium[0]);
      if (podium[1]) fillPodiumPlace(el.podium2, podium[1]);
      if (podium[2]) fillPodiumPlace(el.podium3, podium[2]);

      // Full leaderboard
      el.finalLbList.innerHTML = leaderboard.map((p, i) => {
        const isMe = p.id === socket.id;
        return `<li class="lb-item ${isMe ? 'lb-me' : ''}">
          <span class="lb-rank">${i + 1}</span>
          <span class="lb-name">${p.nickname}${isMe ? ' (you)' : ''}</span>
          <span class="lb-score">${p.score}</span>
        </li>`;
      }).join('');

      // Host gets play again button
      if (window.isHost) {
        el.btnPlayAgain.style.display = '';
      }
    }, 4500);
  });

  function fillPodiumPlace(el, player) {
    el.querySelector('.podium-player-name').textContent = player.nickname;
    el.querySelector('.podium-player-score').textContent = player.score;
  }

  // ===== PLAY AGAIN =====
  el.btnPlayAgain.addEventListener('click', () => {
    socket.emit('play-again', null, (res) => {
      if (res.error) return;
    });
  });

  // ===== LEAVE FROM PODIUM =====
  el.btnLeavePodium.addEventListener('click', () => {
    socket.emit('leave-room');
    window.currentRoomCode = null;
    window.isHost = false;
    multiplayerMode = false;
    window.lobbyShowScreen('lobby');
  });

  // Expose multiplayer mode check for app.js
  window.isMultiplayerMode = () => multiplayerMode;
})();
