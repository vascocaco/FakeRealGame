// lobby.js — Client-side lobby & room management
(() => {
  'use strict';

  const socket = io();
  const DEFAULT_QUESTION_COUNT = 15;
  const DEFAULT_HELPER_COUNT = 3;

  // Expose socket globally for multiplayer.js
  window.gameSocket = socket;
  window.currentRoomCode = null;
  window.isHost = false;
  window.mySocketId = null;

  let roomConfig = {
    questionCount: DEFAULT_QUESTION_COUNT,
    helperCount: DEFAULT_HELPER_COUNT
  };

  socket.on('connect', () => {
    window.mySocketId = socket.id;
  });

  // ===== ELEMENTS =====
  const els = {
    screenLobby: document.getElementById('screen-lobby'),
    screenWaiting: document.getElementById('screen-waiting'),
    nicknameInput: document.getElementById('nickname-input'),
    roomCodeInput: document.getElementById('room-code-input'),
    lobbyError: document.getElementById('lobby-error'),
    btnMultiplayer: document.getElementById('btn-multiplayer'),
    btnBackIntro: document.getElementById('btn-back-intro'),
    btnCreateRoom: document.getElementById('btn-create-room'),
    btnJoinRoom: document.getElementById('btn-join-room'),
    roomCodeValue: document.getElementById('room-code-value'),
    btnCopyCode: document.getElementById('btn-copy-code'),
    playersList: document.getElementById('players-list'),
    btnStartGame: document.getElementById('btn-start-game'),
    btnCloseRoom: document.getElementById('btn-close-room'),
    btnLeaveRoom: document.getElementById('btn-leave-room'),
    waitingHint: document.getElementById('waiting-hint'),
    waitingConfigHost: document.getElementById('waiting-config-host'),
    waitingConfigGuest: document.getElementById('waiting-config-guest'),
    waitingQuestionCount: document.getElementById('waiting-question-count'),
    waitingHelperCount: document.getElementById('waiting-helper-count'),
    waitingConfigSummary: document.getElementById('waiting-config-summary')
  };

  // ===== SCREEN MANAGEMENT =====
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
    document.getElementById(`screen-${name}`).classList.add('active');
  }

  function showError(msg) {
    els.lobbyError.textContent = msg;
    els.lobbyError.classList.add('visible');
    setTimeout(() => els.lobbyError.classList.remove('visible'), 4000);
  }

  function renderPlayers(players) {
    els.playersList.innerHTML = players.map((p) => `
      <div class="player-item ${p.isHost ? 'host' : ''}">
        <span class="player-name">${p.nickname}</span>
        ${p.isHost ? '<span class="host-badge">HOST</span>' : ''}
      </div>
    `).join('');
  }

  function clampInt(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isInteger(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function getMaxQuestionCount() {
    return typeof ROUNDS !== 'undefined' && Array.isArray(ROUNDS)
      ? ROUNDS.length
      : DEFAULT_QUESTION_COUNT;
  }

  function applyRoomConfig(config) {
    const maxQuestionCount = getMaxQuestionCount();
    roomConfig = {
      questionCount: clampInt(config?.questionCount, 1, maxQuestionCount, Math.min(DEFAULT_QUESTION_COUNT, maxQuestionCount)),
      helperCount: clampInt(config?.helperCount, 0, 3, DEFAULT_HELPER_COUNT)
    };

    els.waitingQuestionCount.max = String(maxQuestionCount);
    els.waitingQuestionCount.value = String(roomConfig.questionCount);
    els.waitingHelperCount.value = String(roomConfig.helperCount);
    els.waitingConfigSummary.textContent = `${roomConfig.questionCount} questions, ${roomConfig.helperCount} helpers`;
  }

  function updateHostUI() {
    if (window.isHost) {
      els.btnStartGame.style.display = '';
      els.btnCloseRoom.style.display = '';
      els.waitingHint.style.display = 'none';
      els.waitingConfigHost.style.display = 'grid';
      els.waitingConfigGuest.style.display = 'none';
    } else {
      els.btnStartGame.style.display = 'none';
      els.btnCloseRoom.style.display = 'none';
      els.waitingHint.style.display = '';
      els.waitingConfigHost.style.display = 'none';
      els.waitingConfigGuest.style.display = 'flex';
    }
  }

  function emitRoomConfigUpdate() {
    const nextConfig = {
      questionCount: clampInt(els.waitingQuestionCount.value, 1, getMaxQuestionCount(), roomConfig.questionCount),
      helperCount: clampInt(els.waitingHelperCount.value, 0, 3, roomConfig.helperCount)
    };

    applyRoomConfig(nextConfig);
    socket.emit('update-room-config', nextConfig, (res) => {
      if (res?.error) {
        showError(res.error);
      }
    });
  }

  // ===== NAVIGATION =====
  els.btnMultiplayer.addEventListener('click', () => {
    showScreen('lobby');
  });

  els.btnBackIntro.addEventListener('click', () => {
    showScreen('intro');
  });

  // ===== CREATE ROOM =====
  els.btnCreateRoom.addEventListener('click', () => {
    const nickname = els.nicknameInput.value.trim();
    if (!nickname) return showError('Please enter a nickname');

    socket.emit('create-room', { nickname }, (res) => {
      if (res.error) return showError(res.error);

      window.currentRoomCode = res.code;
      window.isHost = true;
      els.roomCodeValue.textContent = res.code;
      renderPlayers(res.players);
      applyRoomConfig({ questionCount: res.questionCount, helperCount: res.helperCount });
      updateHostUI();
      showScreen('waiting');
    });
  });

  // ===== JOIN ROOM =====
  els.btnJoinRoom.addEventListener('click', () => {
    const nickname = els.nicknameInput.value.trim();
    const code = els.roomCodeInput.value.trim().toUpperCase();
    if (!nickname) return showError('Please enter a nickname');
    if (!code || code.length < 6) return showError('Enter a valid 6-character room code');

    socket.emit('join-room', { code, nickname }, (res) => {
      if (res.error) return showError(res.error);

      window.currentRoomCode = res.code;
      window.isHost = (res.host === socket.id);
      els.roomCodeValue.textContent = res.code;
      renderPlayers(res.players);
      applyRoomConfig({ questionCount: res.questionCount, helperCount: res.helperCount });
      updateHostUI();
      showScreen('waiting');
    });
  });

  // ===== COPY CODE =====
  els.btnCopyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(window.currentRoomCode).then(() => {
      els.btnCopyCode.textContent = '✓';
      setTimeout(() => { els.btnCopyCode.textContent = '📋'; }, 1500);
    });
  });

  // ===== START GAME =====
  els.btnStartGame.addEventListener('click', () => {
    socket.emit('start-game', {
      questionCount: roomConfig.questionCount,
      helperCount: roomConfig.helperCount
    }, (res) => {
      if (res.error) return showError(res.error);
    });
  });

  els.waitingQuestionCount.addEventListener('input', () => {
    if (!window.isHost) return;
    emitRoomConfigUpdate();
  });

  els.waitingHelperCount.addEventListener('input', () => {
    if (!window.isHost) return;
    emitRoomConfigUpdate();
  });

  // ===== LEAVE / CLOSE =====
  els.btnLeaveRoom.addEventListener('click', () => {
    socket.emit('leave-room');
    window.currentRoomCode = null;
    window.isHost = false;
    showScreen('lobby');
  });

  els.btnCloseRoom.addEventListener('click', () => {
    socket.emit('close-room');
    window.currentRoomCode = null;
    window.isHost = false;
    showScreen('lobby');
  });

  // ===== SOCKET EVENTS =====
  socket.on('player-joined', ({ players }) => {
    renderPlayers(players);
  });

  socket.on('player-left', ({ players }) => {
    renderPlayers(players);
    const me = players.find((p) => p.id === socket.id);
    if (me?.isHost) {
      window.isHost = true;
      updateHostUI();
    }
  });

  socket.on('room-closed', () => {
    window.currentRoomCode = null;
    window.isHost = false;
    showScreen('lobby');
    showError('Room was closed by the host');
  });

  socket.on('back-to-lobby', ({ players, questionCount, helperCount }) => {
    renderPlayers(players);
    const me = players.find((p) => p.id === socket.id);
    window.isHost = Boolean(me?.isHost);
    applyRoomConfig({ questionCount, helperCount });
    updateHostUI();
    showScreen('waiting');
  });

  socket.on('room-config-updated', ({ questionCount, helperCount }) => {
    applyRoomConfig({ questionCount, helperCount });
  });

  applyRoomConfig(roomConfig);

  // Expose showScreen for multiplayer.js
  window.lobbyShowScreen = showScreen;
})();