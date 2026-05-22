# Implementation Plan: Multiplayer Backend — "Multiplayer Ready"

**Feature**: Multiplayer Backend — Make Multiplayer Fully Operational  
**Spec**: [docs/specs/multiplayer-backend-ready.md](../specs/multiplayer-backend-ready.md)  
**Goal**: Create a Node.js + Socket.io server so that two or more players can play a fully synchronized multiplayer game end-to-end, with no changes to the existing frontend.

---

## 1. Feature Summary

The FakeRealGame frontend (`lobby.js`, `multiplayer.js`) is complete and already implements every multiplayer client behaviour. All that is missing is a backend server that:
- Serves the static frontend files.
- Implements the Socket.io event contract the frontend already expects.
- Manages rooms, players, game rounds, timers, and scoring entirely on the server side.

The frontend is a **fixed contract**. No frontend files may be modified.

---

## 2. Implementation Phases

### Phase 1 — Project Foundation

- [x] Create `package.json` in the project root via `npm init -y`.
- [x] Install runtime dependencies: `express` and `socket.io` (record exact versions in `package.json`).
- [x] Add `node_modules/` and any `.env` files to `.gitignore`.
- [x] Create the server entry point: `server.js` in the project root.
- [x] In `server.js`, configure Express to serve all files in the project root as static assets (FR-01, FR-02).
- [x] Attach Socket.io to the HTTP server — Socket.io will automatically serve `/socket.io/socket.io.js` (FR-02).
- [x] Start the server on a configurable port (default `3000`; read from `process.env.PORT`).
- [ ] **Validation**: Open `http://localhost:3000` in a browser. Confirm `index.html` loads, fonts render, and the browser console shows a Socket.io connection (`connect` event fires on the client).

---

### Phase 2 — In-Memory Room Store & Room Management

- [x] Define an in-memory `rooms` Map (keyed by room code) in `server.js`. Each room entry holds: `{ code, status ('waiting'|'in-progress'), players [], rounds [], currentRoundIndex }`. Each player entry holds: `{ id (socketId), nickname, isHost, score }`.
- [x] Implement room code generation: 6-character uppercase alphanumeric string, checked for uniqueness against the active `rooms` Map (FR-04).
- [x] Implement nickname validation helper: reject empty strings or strings longer than 24 characters (FR-31).
- [x] **Handle `create-room` event** `{ nickname }`:
  - Validate nickname (FR-31); ack `{ error }` on failure.
  - Generate a unique room code (FR-04).
  - Add the socket to the Socket.io room (`.join(code)`).
  - Create the room entry; assign the player as host (`isHost: true`) (FR-05).
  - Ack success with `{ code, players }` (FR-03).
- [x] **Handle `join-room` event** `{ code, nickname }`:
  - Validate room code format: non-empty, exactly 6 characters (FR-32); ack `{ error: "Invalid room code" }` on failure.
  - Validate nickname (FR-31); ack `{ error }` on failure.
  - Reject if room does not exist (FR-07).
  - Reject if room `status` is `'in-progress'` (FR-07).
  - Add socket to the Socket.io room; add player to the room's `players` array.
  - Ack success with `{ code, host: <hostSocketId>, players }` (FR-06).
  - Emit `player-joined` with `{ players }` to all **other** sockets already in the room (FR-08).
- [x] **Handle `leave-room` event** (no ack):
  - If room is `'waiting'` and leaver is non-host: remove player; emit `player-left` with `{ players, leftNickname }` to remaining players (FR-10).
  - If room is `'waiting'` and leaver is host: promote the next player in the array to host (`isHost: true`); emit `player-left` with updated `players` (including the new host) to remaining players (FR-11). If no players remain, destroy the room.
  - If room is `'in-progress'`: apply in-game disconnect logic (see Phase 4, task "handle mid-game departure") (FR-23).
  - If the leaving player is not in any room, ignore silently (FR-33).
- [x] **Handle `close-room` event**:
  - Verify caller is the host; ignore silently if not (FR-12).
  - Emit `room-closed` (no payload) to all non-host sockets in the room.
  - Destroy the room; have all sockets `.leave(code)` (FR-12).
- [x] **Handle `disconnect` event**:
  - Locate the disconnecting socket's room and apply the same logic as `leave-room` (FR-13).
- [ ] **Validation (manual)**: Two browser tabs — Tab A creates a room, Tab B joins. Confirm both see each other in the player list. Tab B leaves; confirm Tab A's player list updates. Tab A closes the room; confirm Tab B shows the lobby screen.

---

### Phase 3 — Game Start & Round Sequencing

- [x] **Handle `start-game` event** (with ack):
  - Reject with `{ error }` if caller is not the host (FR-14).
  - Reject with `{ error }` if fewer than 2 players are in the room (FR-14).
  - Call `buildGame(5)` from `data.js` (loaded via `require('./data.js')`) to select rounds. The round count `5` should be a named constant at the top of `server.js` so it is easy to change (FR-15).
  - Store the selected rounds on the room object; set `currentRoundIndex = 0`; set room `status` to `'in-progress'`.
  - Emit `game-started` with `{ totalRounds: n }` to **all** sockets in the room (FR-15).
  - After emitting, immediately trigger the first round (call the `startRound` function).
  - Ack the host with `{}` (no error) on success.
- [x] Implement a `startRound(roomCode)` function:
  - Retrieve the room's current round from `rounds[currentRoundIndex]`.
  - Build the `options` payload: map each option to `{ word }` only — **strip the `fake` property** (FR-17).
  - Emit `round-start` to all room sockets with `{ index, total, category, options }` (FR-17).
  - Initialize a per-round state object on the room: `{ answeredPlayers: Map<socketId, { optionIndex, answeredAt }>, timerValue: 15, interval: null }`.
  - Start the countdown interval (see Phase 3, timer task below).
- [x] Implement the per-round **server-side countdown**:
  - Use `setInterval` (1000 ms) to decrement `timerValue` from 15 to 0.
  - On each tick, emit `timer-tick` with the current integer value to all room sockets (FR-18).
  - When `timerValue` reaches 0, call `endRound(roomCode)`.
- [x] **Handle `submit-answer` event** `{ optionIndex }`:
  - Ignore if the sender's socket is not in a room (FR-33).
  - Ignore if room status is not `'in-progress'` or if the current round has already ended.
  - Ignore if the player has already submitted an answer for this round (FR-19).
  - Record the answer with a timestamp: `{ optionIndex, answeredAt: Date.now() }` in the round's `answeredPlayers` Map.
  - Emit `answer-progress` with `{ answered: answeredPlayers.size, total: activePlayers.length }` to all room sockets (FR-20). Active players = room players who are still connected.
  - If all active players have now answered, cancel the interval and call `endRound(roomCode)` immediately (FR-21).
- [ ] **Validation**: Two players, start a game. Confirm both see the same round simultaneously. Confirm the timer counts down on both clients. Confirm selecting an option locks it and shows the progress indicator.

---

### Phase 4 — Round End, Scoring, and Game Over

- [x] Implement `endRound(roomCode)`:
  - Cancel the countdown interval (guard against double-invocation).
  - Identify the round's fake option: find the option where `fake: true` in the original `ROUNDS` data and record its index and word.
  - For each active player, calculate their result:
    - If they answered correctly (their `optionIndex` matches `fakeIndex`): award 100 base points plus speed bonus (see scoring task below). Add to their cumulative `score` (FR-25, FR-28).
    - If they did not answer or answered incorrectly: award 0 points (FR-27).
  - Build the `results` array: `[{ id, correct, earned, speedBonus, score }]` for all active players (FR-22).
  - Build `leaderboard`: all active players sorted descending by `score`, each entry `{ id, nickname, score }` (FR-22).
  - Emit `round-results` with `{ fakeIndex, fakeWord, hint, results, leaderboard }` to all room sockets (FR-22).
  - Advance `currentRoundIndex` by 1.
  - If `currentRoundIndex < totalRounds`: schedule the next round after a short display delay (4–5 seconds, to allow the client's result screen to show). Call `startRound(roomCode)`.
  - If all rounds are done: call `endGame(roomCode)` instead.
- [x] Implement **speed bonus calculation**:
  - Record the round start timestamp when `startRound` is called.
  - Elapsed seconds = `(answeredAt - roundStartTime) / 1000`, clamped to `[0, 15]`.
  - If elapsed ≤ 1 s → bonus = 50.
  - If elapsed ≥ 14 s → bonus = 0.
  - Otherwise → linear interpolation: `bonus = Math.round(50 * (14 - elapsed) / 13)`.
  - Only apply speed bonus to correct answers (FR-26).
- [x] Implement **mid-game player departure** (covers `leave-room` and `disconnect` during `'in-progress'` state):
  - Remove the player from the room's `players` array.
  - If the departing player had not yet answered the current round, treat their answer as unanswered (no points, no impact on round-end trigger).
  - Recalculate `active players` so `answer-progress` totals remain accurate.
  - Do **not** emit `player-left` during a game (the frontend does not handle it on the game screen).
  - If all remaining players have now answered the current round, trigger `endRound` early.
  - If no players remain in the room, cancel the interval and destroy the room (FR-23).
- [x] Implement `endGame(roomCode)`:
  - Build `leaderboard`: all players who completed the game, sorted descending by score (FR-24).
  - Determine `loser`: player with the lowest score. If only one player remains, set `loser: null` (FR-24).
  - Build `podium`: top 3 players from the leaderboard, in order (FR-24).
  - Emit `game-over` with `{ leaderboard, loser, podium }` to all room sockets (FR-24).
  - Set room `status` back to `'waiting'` and clear round state (room persists for play-again).
- [ ] **Validation**: Play a full 5-round game with 2 players. Confirm: scores accumulate correctly; round-results show the correct fakeIndex; the podium screen appears with the right winner; the loser is revealed.

---

### Phase 5 — Play Again

- [x] **Handle `play-again` event** (with ack):
  - Reject with `{ error }` if caller is not the host (FR-29).
  - Reset all player scores to 0 (FR-30).
  - Select a new set of rounds via `buildGame(n)`.
  - Set room `status` back to `'waiting'`.
  - Emit `back-to-lobby` with `{ players }` to all room sockets (FR-30).
  - Ack the host with `{}`.
- [ ] **Validation**: After a completed game, host clicks "Play Again". Confirm all players return to the waiting screen with scores reset, and a second game can be started and completed normally.

---

### Phase 6 — Validation & Hardening

- [x] Silently ignore any known socket event received from a socket that has no associated room (except `create-room` and `join-room`) (FR-33).
- [x] Review all ack callbacks: ensure every event that accepts an ack always calls it (even on success), so the client callback is never left hanging.
- [ ] Test AC-03: attempt to join a room where a game is already in progress — confirm error is shown and the client stays on the lobby screen.
- [ ] Test AC-05: host with only 1 player tries to start — confirm error shown, no game starts.
- [ ] Test AC-06: verify both clients show approximately the same timer value (acceptable drift: ±1 s).
- [ ] Test AC-08: let the timer expire without all players answering — confirm the round auto-advances.
- [ ] Test AC-09: answer correctly in the first second — confirm `speedBonus > 0` in `round-results`.
- [ ] Test host-promotion: host disconnects mid-waiting-room — confirm another player is promoted and can start the game.
- [ ] Test room isolation: run two concurrent rooms and confirm events from one room do not bleed into the other.
- [ ] Confirm solo mode is unaffected: open `index.html` served by the backend and complete a solo game — all solo functionality must still work (solo uses `app.js`, which is independent of socket events).

---

## 3. Dependencies & Risks

| Item | Detail |
|---|---|
| **`data.js` dual-export** | `data.js` already has `module.exports = { ROUNDS, buildGame }` for Node.js. The Developer must `require('./data.js')` in `server.js`. Do not copy or duplicate the data. |
| **Frontend is a locked contract** | All Socket.io event names, payload shapes, and ack signatures are fixed by the existing frontend code. Any deviation will silently break the UI. The Developer must cross-reference `lobby.js` and `multiplayer.js` before implementing each event. |
| **`start-game` ack on success** | `lobby.js` calls `socket.emit('start-game', null, (res) => { if (res.error) ... })`. The server must always invoke the ack — even on success — passing `{}`. Failing to do so leaves the socket.io ack promise unresolved. The same applies to `play-again`. |
| **Round delay timing** | The client's `round-results` screen has no explicit "Next" button in multiplayer (it is hidden by `multiplayer.js`). The server controls when the next `round-start` fires. A 4–5 second delay after emitting `round-results` gives players time to read results before the next round begins. This value should be a named constant. |
| **Timer drift** | `setInterval` is not perfectly accurate. For a 15-second game timer, accumulated drift is negligible. No corrective action is needed. |
| **No authentication** | Room codes are the only access control. This is acceptable for an informal game and is in scope. |
| **No persistence** | All state is in-memory. A server restart clears all rooms. This is explicitly out of scope per the spec. |
| **Port conflicts** | Default port `3000` may be occupied. The Developer should document how to change the port (e.g., `PORT=4000 node server.js`). |
| **`play-again` host check** | After `game-over`, the room's player list still exists. The host for a rematch is the same socket that was host before. If the host disconnected after the game ended but before play-again, the room may be hostless — the Developer should decide whether to promote a new host or destroy the room in this edge case (spec is silent on it; recommend promoting). |

---

## 4. Open Questions & Pragmatic Defaults

The following items are not fully specified. The Developer should proceed with the stated defaults without blocking:

| Question | Pragmatic Default |
|---|---|
| How many rounds per game? | 5 (named constant `ROUNDS_PER_GAME = 5` at the top of `server.js`) |
| Delay between round-results and next round-start? | 4500 ms (named constant `NEXT_ROUND_DELAY_MS = 4500`) |
| Speed bonus formula? | Linear interpolation: `Math.round(50 * Math.max(0, 14 - elapsedSeconds) / 13)`, clamped to [0, 50] |
| Maximum players per room? | No limit specified; do not impose one unless stability issues arise |
| What if host disconnects after game-over (before play-again)? | Promote the next player in the array to host |
| What HTTP framework to use? | Express (minimal, compatible with Socket.io's `attach` API) |

---

## 5. Next Steps

1. **Phase 1**: Initialize `package.json`, install `express` and `socket.io`, create `server.js` with static file serving, and verify the browser connects via Socket.io.
2. **Phase 2**: Implement full room management (`create-room`, `join-room`, `leave-room`, `close-room`, `disconnect`) with in-memory state.
3. **Phase 3**: Implement game start, round sequencing, timer, and answer submission.
4. **Phase 4**: Implement round-end scoring, game-over, and mid-game disconnection handling.
5. **Phase 5 + 6**: Implement play-again, then run all acceptance criteria manually.

---

## 6. Progress Log

**2026-05-22** — Plan created. All six phases defined based on `docs/specs/multiplayer-backend-ready.md` and a full review of `lobby.js`, `multiplayer.js`, and `data.js`. No implementation has started.
**2026-05-22** — Completed: Create `package.json` in the project root via `npm init -y`. Initialized Node.js project metadata at the repo root; default npm fields were generated and the next task is runtime dependency installation.
**2026-05-22** — Completed: Phase 1 foundation setup (except manual browser validation). Installed `express` and `socket.io`, added `.gitignore`, created `server.js`, configured static serving + Socket.io, and added npm start entry point.
**2026-05-22** — Completed: Phase 2 room management implementation (except manual two-tab validation). Added room store, room-code generation, nickname validation, create/join/leave/close/disconnect handling, host promotion, and room teardown.
**2026-05-22** — Completed: Phase 3 game start and sequencing implementation (except manual two-tab validation). Added host-gated `start-game`, `startRound`, authoritative timer ticks, `submit-answer`, answer-progress updates, and early round termination when all active players answer.
**2026-05-22** — Completed: Phase 4 scoring and completion flow (except manual full-game validation). Added `endRound`, speed-bonus formula, cumulative scoring, leaderboard generation, mid-game departure handling, and `game-over` payload emission.
**2026-05-22** — Completed: Phase 5 rematch implementation (except manual rematch validation). Added host-gated `play-again`, score reset, new rounds prep, and `back-to-lobby` broadcast.
**2026-05-22** — Completed: Phase 6 hardening tasks for FR-33 and ack behavior. Non-room events are safely ignored, and ack-based events now always resolve callbacks.
**2026-05-22** — Validation: Executed automated smoke checks (`node --check server.js` and an ephemeral-port HTTP probe) confirming `GET /` and `GET /socket.io/socket.io.js` both return `200`.
**2026-05-22** — Completed: QA multiplayer backend defect fix pass. Guarded `play-again` so it only works after `game-over`, suppressed stray `answer-progress`/`player-left` emits outside active rounds, and aligned `timer-tick` with the 15-to-0 countdown contract.
