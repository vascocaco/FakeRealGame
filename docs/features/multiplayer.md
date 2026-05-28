# Multiplayer

## Overview

FakeRealGame supports real-time multiplayer for two or more players. A host creates a room and shares a 6-character code; guests join by entering that code. Once the host starts the game, all players play the same rounds simultaneously with a shared server-driven countdown. At the end of the last round a podium is revealed, and the host can offer a rematch without leaving the room.

Multiplayer is implemented as a Node.js + Socket.io server (`server.js`) that serves the static frontend files and manages all game state in memory. The existing frontend files (`lobby.js`, `multiplayer.js`) are the fixed client contract; the server was built to match them exactly.

---

## How It Works

### 1. Starting the server

```bash
npm install   # first run only
npm start
```

The server listens on `http://localhost:3000` (or `$PORT` if that environment variable is set). It serves all static files from the project root and provides the Socket.io client at `/socket.io/socket.io.js`.

### 2. Room creation and joining

1. **Host** clicks **Multiplayer**, enters a nickname, and clicks **Create Room**.
   - The server generates a unique 6-character uppercase alphanumeric code and returns it to the host along with the initial player list.
   - The host sees the waiting screen with **Start Game** and **Close Room** controls.
2. **Guest** clicks **Multiplayer**, enters a nickname and the room code, and clicks **Join Room**.
   - The server validates the code format (exactly 6 characters, A–Z / 0–9) and the nickname (1–24 characters), then adds the guest to the room.
   - All existing players in the room immediately receive a `player-joined` event and see the guest appear in the list without a page reload.

### 3. Starting a game

The host clicks **Start Game**. The server enforces that at least 2 players are present; otherwise it returns an error. If the check passes:

- Rounds are selected by calling `buildGame(questionCount)` from `data.js`; the host controls `questionCount` in the waiting room.
- All players receive `game-started` with `{ totalRounds, helperCount }` and the first round begins immediately.

### 4. Round flow

For each round the server:

1. Emits `round-start` with the category and word options. **The `fake` flag, answer-revealing hint, and evidence are stripped from the public payload** so clients cannot inspect the answer.
2. Begins a 15-second countdown, emitting `timer-tick` once per second to all players.
3. Listens for `submit-answer` events (`{ optionIndex: number }`). Only the first answer per player per round is recorded.
4. After each submission, broadcasts `answer-progress` (`{ answered, total }`) so players can see how many others have already answered.
5. Ends the round as soon as all active players have answered **or** the 15-second timer expires.

### 5. Scoring

| Outcome | Points |
|---|---|
| Correct answer | 100 base points |
| Speed bonus (≤ 1 s elapsed) | +50 |
| Speed bonus (1 s – 14 s) | linear from 50 → 0 |
| Speed bonus (≥ 14 s elapsed) | +0 |
| Incorrect or no answer | 0 |

Speed bonus formula: `Math.round(50 * (14 - elapsed) / 13)`, clamped to `[0, 50]`. Scores only ever increase.

### 6. Round results

After each round the server emits `round-results` to all players:

```
{
  fakeIndex: number,
  fakeWord: string,
  hint: string,
  evidence: { sourceName, sourceUrl, summary } | null,
  results: [{ id, correct, earned, speedBonus, score }],
  leaderboard: [{ id, nickname, score }]   // sorted descending
}
```

The next round starts automatically after a 4.5-second display delay.

### 7. Game over and podium

After the last round the server emits `game-over`:

```
{
  leaderboard: [{ id, nickname, score }],
  loser: { nickname } | null,
  podium: [{ nickname, score }]   // top 3
}
```

`loser` is `null` if only one player remains at game end.

### 8. Play Again

The host clicks **Play Again**. The server resets all scores to 0, selects a fresh set of rounds, and emits `back-to-lobby` with the current player list. All players return to the waiting screen and a new game can be started immediately.

---

## Key Components

| Component | File | Responsibility |
|---|---|---|
| HTTP + Socket.io server | `server.js` | Serves static files, manages rooms, runs game loop |
| In-memory room store | `server.js` (`rooms` Map) | Holds all room and player state; lost on restart |
| Socket-to-room index | `server.js` (`socketRoom` Map) | Fast lookup of which room a socket belongs to |
| Game data | `data.js` | `ROUNDS` array and `buildGame(n)` — shared by client and server |
| Lobby UI & room events | `lobby.js` | Client-side room creation/joining, waiting screen |
| In-game UI & event handling | `multiplayer.js` | Client-side round rendering, server-authorized helpers, timer, leaderboard, podium |

---

## Data Flow

```
Browser (lobby.js)
  │  create-room / join-room
  ▼
server.js  ──►  rooms Map  ──►  ack { code, players }
  │                               emit player-joined → all others
  │
  │  start-game (host only, ≥ 2 players)
  ▼
buildGame(questionCount) → room.rounds
  emit game-started → all
  startRound() loop:
    emit round-start (no fake flag) → all
    setInterval: emit timer-tick every 1 s → all
    submit-answer → record + emit answer-progress → all
    endRound():
      calculate scores
      emit round-results → all
      setTimeout 4.5 s → startRound() or endGame()
  endGame():
    emit game-over → all
    room.status = 'waiting'

  play-again (host only)
    reset scores and return to lobby
    emit back-to-lobby → all
```

---

## Configuration & Dependencies

| Item | Value |
|---|---|
| Default port | `3000` (override with `PORT` env var) |
| Rounds per game | Host-configurable, default `15` (`DEFAULT_QUESTION_COUNT`) |
| Round duration | `15 seconds` (`ROUND_TIME_SECONDS`) |
| Delay between rounds | `4.5 seconds` (`NEXT_ROUND_DELAY_MS`) |
| Max nickname length | `24 characters` (`NICKNAME_MAX_LENGTH`) |
| Room code format | 6-char uppercase alphanumeric (`ROOM_CODE_REGEX`) |
| Node.js requirement | ≥ 18 |
| Runtime dependencies | `express ^5.2.1`, `socket.io ^4.8.3` |

State is **in-memory only**. Restarting the server destroys all active rooms.

---

## Known Limitations

- **No persistence**: All room and game state is lost when the server restarts.
- **No room capacity limit**: The spec does not define a maximum player count per room.
- **Host disconnect during a game**: If the host disconnects mid-game, the next player in the array is promoted to host silently. The promoted host's **Play Again** button will work correctly, but there is no in-game UI notification of the host change.
- **Late joins blocked**: A player cannot join a room once a game has started (`'in-progress'` status). They must wait for the host to offer a rematch.
- **No reconnection support**: A disconnected player during a game is permanently removed from the session; they cannot rejoin the same room.
- **Solo mode is unaffected**: Opening `index.html` without a server (or with a server that has no active rooms) leaves solo mode fully functional.
