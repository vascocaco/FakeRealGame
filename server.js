const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { buildGame } = require('./data.js');

const PORT = Number(process.env.PORT) || 3000;
const ROUNDS_PER_GAME = 5;
const ROUND_TIME_SECONDS = 15;
const NEXT_ROUND_DELAY_MS = 4500;
const NICKNAME_MAX_LENGTH = 24;
const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;
const BASE_POINTS = 100;

function createServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  // In-memory room store keyed by room code.
  const rooms = new Map();
  const socketRoom = new Map();

  app.use(express.static(path.resolve(__dirname)));

  function validateNickname(nickname) {
    const value = typeof nickname === 'string' ? nickname.trim() : '';
    if (!value) {
      return 'Nickname is required';
    }
    if (value.length > NICKNAME_MAX_LENGTH) {
      return `Nickname must be ${NICKNAME_MAX_LENGTH} characters or fewer`;
    }
    return null;
  }

  function getRoomForSocket(socketId) {
    const code = socketRoom.get(socketId);
    if (!code) {
      return null;
    }
    return rooms.get(code) || null;
  }

  function getRoomCodeForSocket(socketId) {
    return socketRoom.get(socketId) || null;
  }

  function generateRoomCode() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    do {
      let next = '';
      for (let i = 0; i < 6; i += 1) {
        next += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }
      code = next;
    } while (rooms.has(code));
    return code;
  }

  function sortedLeaderboard(players) {
    return [...players]
      .sort((a, b) => b.score - a.score)
      .map((player) => ({ id: player.id, nickname: player.nickname, score: player.score }));
  }

  function getHostId(room) {
    const host = room.players.find((player) => player.isHost);
    return host ? host.id : null;
  }

  function resetRoomForNewGame(room) {
    room.status = 'in-progress';
    room.currentRoundIndex = 0;
    room.roundState = null;
    room.nextRoundTimeout = null;
    room.canPlayAgain = false;
  }

  function clearRoomTimers(room) {
    if (room.roundState?.interval) {
      clearInterval(room.roundState.interval);
      room.roundState.interval = null;
    }
    if (room.nextRoundTimeout) {
      clearTimeout(room.nextRoundTimeout);
      room.nextRoundTimeout = null;
    }
  }

  function destroyRoom(code) {
    const room = rooms.get(code);
    if (!room) {
      return;
    }
    clearRoomTimers(room);
    room.players.forEach((player) => {
      socketRoom.delete(player.id);
    });
    io.in(code).socketsLeave(code);
    rooms.delete(code);
  }

  function promoteNextHost(room) {
    room.players.forEach((player, index) => {
      player.isHost = index === 0;
    });
  }

  function calculateSpeedBonus(startedAt, answeredAt) {
    const elapsed = Math.max(0, Math.min(ROUND_TIME_SECONDS, (answeredAt - startedAt) / 1000));
    if (elapsed <= 1) {
      return 50;
    }
    if (elapsed >= 14) {
      return 0;
    }
    return Math.max(0, Math.min(50, Math.round((50 * (14 - elapsed)) / 13)));
  }

  function startRound(code) {
    const room = rooms.get(code);
    if (room?.status !== 'in-progress') {
      return;
    }

    const currentRound = room.rounds[room.currentRoundIndex];
    if (!currentRound) {
      endGame(code);
      return;
    }

    room.roundState = {
      answeredPlayers: new Map(),
      timerValue: ROUND_TIME_SECONDS,
      interval: null,
      ended: false,
      roundStartedAt: Date.now()
    };

    io.to(code).emit('round-start', {
      index: room.currentRoundIndex,
      total: room.rounds.length,
      category: currentRound.category,
      options: currentRound.options.map((option) => ({ word: option.word }))
    });

    io.to(code).emit('timer-tick', room.roundState.timerValue);

    room.roundState.interval = setInterval(() => {
      const latestRoom = rooms.get(code);
      if (latestRoom?.status !== 'in-progress' || !latestRoom.roundState) {
        if (room.roundState?.interval) {
          clearInterval(room.roundState.interval);
          room.roundState.interval = null;
        }
        return;
      }

      latestRoom.roundState.timerValue -= 1;
      io.to(code).emit('timer-tick', latestRoom.roundState.timerValue);

      if (latestRoom.roundState.timerValue <= 0) {
        endRound(code);
      }
    }, 1000);
  }

  function endGame(code) {
    const room = rooms.get(code);
    if (!room) {
      return;
    }

    clearRoomTimers(room);

    const leaderboard = sortedLeaderboard(room.players);
    const loser = leaderboard.length > 1 ? { nickname: leaderboard[leaderboard.length - 1].nickname } : null;
    const podium = leaderboard.slice(0, 3).map((entry) => ({ nickname: entry.nickname, score: entry.score }));

    io.to(code).emit('game-over', {
      leaderboard,
      loser,
      podium
    });

    room.status = 'waiting';
    room.currentRoundIndex = 0;
    room.roundState = null;
    room.nextRoundTimeout = null;
    room.canPlayAgain = true;
  }

  function endRound(code) {
    const room = rooms.get(code);
    if (room?.status !== 'in-progress' || !room.roundState || room.roundState.ended) {
      return;
    }

    room.roundState.ended = true;
    if (room.roundState.interval) {
      clearInterval(room.roundState.interval);
      room.roundState.interval = null;
    }

    const round = room.rounds[room.currentRoundIndex];
    if (!round) {
      endGame(code);
      return;
    }

    const fakeIndex = round.options.findIndex((option) => option.fake === true);
    const fakeWord = fakeIndex >= 0 ? round.options[fakeIndex].word : '';

    const results = room.players.map((player) => {
      const answer = room.roundState.answeredPlayers.get(player.id);
      const correct = Boolean(answer && answer.optionIndex === fakeIndex);
      const earned = correct ? BASE_POINTS : 0;
      const speedBonus = correct ? calculateSpeedBonus(room.roundState.roundStartedAt, answer.answeredAt) : 0;
      if (correct) {
        player.score += earned + speedBonus;
      }
      return {
        id: player.id,
        correct,
        earned,
        speedBonus,
        score: player.score
      };
    });

    const leaderboard = sortedLeaderboard(room.players);

    io.to(code).emit('round-results', {
      fakeIndex,
      fakeWord,
      hint: round.hint,
      results,
      leaderboard
    });

    room.currentRoundIndex += 1;
    room.roundState = null;

    if (room.currentRoundIndex < room.rounds.length) {
      room.nextRoundTimeout = setTimeout(() => {
        const latestRoom = rooms.get(code);
        if (latestRoom?.status !== 'in-progress') {
          return;
        }
        latestRoom.nextRoundTimeout = null;
        startRound(code);
      }, NEXT_ROUND_DELAY_MS);
      return;
    }

    endGame(code);
  }

  function maybeEndRoundEarly(code) {
    const room = rooms.get(code);
    if (room?.status !== 'in-progress' || !room.roundState || room.roundState.ended) {
      return;
    }
    const totalActive = room.players.length;
    if (totalActive === 0) {
      destroyRoom(code);
      return;
    }
    if (room.roundState.answeredPlayers.size >= totalActive) {
      endRound(code);
    }
  }

  function removePlayer(socketId, reason) {
    const code = getRoomCodeForSocket(socketId);
    if (!code) {
      return;
    }

    const room = rooms.get(code);
    socketRoom.delete(socketId);
    if (!room) {
      return;
    }

    const playerIndex = room.players.findIndex((player) => player.id === socketId);
    if (playerIndex < 0) {
      return;
    }

    const [removedPlayer] = room.players.splice(playerIndex, 1);

    if (room.roundState) {
      room.roundState.answeredPlayers.delete(socketId);
    }

    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(code);
    }

    if (room.players.length === 0) {
      destroyRoom(code);
      return;
    }

    if (removedPlayer.isHost) {
      promoteNextHost(room);
    }

    if (room.status === 'waiting') {
      if (room.canPlayAgain) {
        return;
      }
      io.to(code).emit('player-left', {
        players: room.players,
        leftNickname: removedPlayer.nickname
      });
      return;
    }

    // During gameplay we avoid player-left (frontend does not consume it on game screen).
    if (room.roundState) {
      io.to(code).emit('answer-progress', {
        answered: room.roundState.answeredPlayers.size,
        total: room.players.length
      });
    }
    maybeEndRoundEarly(code);

  }

  io.on('connection', (socket) => {
    socket.on('create-room', (payload, ack) => {
      const body = payload || {};
      const respond = typeof ack === 'function' ? ack : () => {};
      const nicknameError = validateNickname(body.nickname);
      if (nicknameError) {
        respond({ error: nicknameError });
        return;
      }

      removePlayer(socket.id, 'leave');

      const code = generateRoomCode();
      const player = {
        id: socket.id,
        nickname: body.nickname.trim(),
        isHost: true,
        score: 0
      };

      const room = {
        code,
        status: 'waiting',
        players: [player],
        rounds: [],
        currentRoundIndex: 0,
        roundState: null,
        nextRoundTimeout: null,
        canPlayAgain: false
      };

      rooms.set(code, room);
      socketRoom.set(socket.id, code);
      socket.join(code);

      respond({ code, players: room.players });
    });

    socket.on('join-room', (payload, ack) => {
      const body = payload || {};
      const respond = typeof ack === 'function' ? ack : () => {};
      const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
      if (!ROOM_CODE_REGEX.test(code)) {
        respond({ error: 'Invalid room code' });
        return;
      }

      const nicknameError = validateNickname(body.nickname);
      if (nicknameError) {
        respond({ error: nicknameError });
        return;
      }

      const room = rooms.get(code);
      if (!room) {
        respond({ error: 'Room not found' });
        return;
      }

      if (room.status === 'in-progress') {
        respond({ error: 'Game already in progress' });
        return;
      }

      removePlayer(socket.id, 'leave');

      const player = {
        id: socket.id,
        nickname: body.nickname.trim(),
        isHost: false,
        score: 0
      };

      room.players.push(player);
      socketRoom.set(socket.id, code);
      socket.join(code);

      respond({ code, host: getHostId(room), players: room.players });
      socket.to(code).emit('player-joined', { players: room.players });
    });

    socket.on('leave-room', () => {
      const room = getRoomForSocket(socket.id);
      if (!room) {
        return;
      }
      removePlayer(socket.id, 'leave');
    });

    socket.on('close-room', () => {
      const room = getRoomForSocket(socket.id);
      if (!room) {
        return;
      }
      const me = room.players.find((player) => player.id === socket.id);
      if (!me?.isHost) {
        return;
      }

      socket.to(room.code).emit('room-closed');
      destroyRoom(room.code);
    });

    socket.on('start-game', (_payload, ack) => {
      const respond = typeof ack === 'function' ? ack : () => {};
      const room = getRoomForSocket(socket.id);
      if (!room) {
        respond({});
        return;
      }
      const me = room.players.find((player) => player.id === socket.id);
      if (!me?.isHost) {
        respond({ error: 'Only the host can start the game' });
        return;
      }
      if (room.players.length < 2) {
        respond({ error: 'At least 2 players are required to start' });
        return;
      }
      if (room.status === 'in-progress') {
        respond({ error: 'Game already in progress' });
        return;
      }

      clearRoomTimers(room);
      resetRoomForNewGame(room);
      room.rounds = buildGame(ROUNDS_PER_GAME);

      io.to(room.code).emit('game-started', { totalRounds: room.rounds.length });
      respond({});
      startRound(room.code);
    });

    socket.on('submit-answer', (payload = {}) => {
      const room = getRoomForSocket(socket.id);
      if (room?.status !== 'in-progress' || !room.roundState || room.roundState.ended) {
        return;
      }

      if (room.roundState.answeredPlayers.has(socket.id)) {
        return;
      }

      const optionIndex = Number(payload.optionIndex);
      if (!Number.isInteger(optionIndex)) {
        return;
      }

      room.roundState.answeredPlayers.set(socket.id, {
        optionIndex,
        answeredAt: Date.now()
      });

      io.to(room.code).emit('answer-progress', {
        answered: room.roundState.answeredPlayers.size,
        total: room.players.length
      });

      maybeEndRoundEarly(room.code);
    });

    socket.on('play-again', (_payload, ack) => {
      const respond = typeof ack === 'function' ? ack : () => {};
      const room = getRoomForSocket(socket.id);
      if (!room) {
        respond({});
        return;
      }

      const me = room.players.find((player) => player.id === socket.id);
      if (!me?.isHost) {
        respond({ error: 'Only the host can start a rematch' });
        return;
      }
      if (!room.canPlayAgain) {
        respond({ error: 'Play Again is only available after the game ends' });
        return;
      }

      clearRoomTimers(room);
      room.players.forEach((player) => {
        player.score = 0;
      });
      room.rounds = buildGame(ROUNDS_PER_GAME);
      room.currentRoundIndex = 0;
      room.roundState = null;
      room.status = 'waiting';
      room.nextRoundTimeout = null;
      room.canPlayAgain = false;

      io.to(room.code).emit('back-to-lobby', { players: room.players });
      respond({});
    });

    socket.on('disconnect', () => {
      const room = getRoomForSocket(socket.id);
      if (!room) {
        return;
      }
      removePlayer(socket.id, 'disconnect');
    });
  });

  return { app, io, server, rooms };
}

if (require.main === module) {
  const { server } = createServer();
  server.listen(PORT, () => {
    console.log(`FakeRealGame backend running on http://localhost:${PORT}`);
  });
}

module.exports = { createServer };