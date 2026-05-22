# Functional Specification: Multiplayer Backend — "Multiplayer Ready"

**File**: `docs/specs/multiplayer-backend-ready.md`  
**Date**: 2026-05-22  
**Status**: Draft

---

## 1. Overview

### Feature Name
Multiplayer Backend — Make Multiplayer Fully Operational

### Goal / Business Objective
The FakeRealGame frontend already contains complete multiplayer UI logic (`lobby.js`, `multiplayer.js`). However, the game cannot be played in multiplayer mode because the required Socket.io server does not exist in this repository. This specification defines what the backend server must do so that multiplayer mode works end-to-end, without changing any frontend behaviour.

"Multiplayer ready" means: two or more players on separate browser sessions can create or join a room, play a full synchronized game together, see results and a podium at the end, and optionally play again — with no manual server intervention required.

### Stakeholders / Personas Affected
- **Player (Host)**: Creates a room, invites others, starts the game, and can initiate a rematch.
- **Player (Guest)**: Joins an existing room using a code and participates in the game.
- **Solo Player**: Unaffected — solo mode must continue to work without a server.

---

## 2. Assumptions

1. The backend is a single Node.js process using Socket.io. No specific framework is mandated by this spec, but the choice must be compatible with serving static files and the Socket.io protocol.
2. All game data (rounds, categories, words) is sourced from `data.js` using its existing `ROUNDS` array and `buildGame(n)` export. The server must not duplicate or diverge from this data source.
3. The frontend code (`lobby.js`, `multiplayer.js`) is treated as **fixed contract**. The server must implement the exact event names, payloads, and callback signatures the frontend already expects. No frontend changes are required.
4. Persistence is out of scope. All room and game state is in-memory and lost on server restart.
5. The server serves the frontend static files (HTML, CSS, JS) and the Socket.io client library at `/socket.io/socket.io.js`.
6. A "room" maps to a single active game session. One socket connection = one player in one room at a time.
7. The timer is authoritative on the server. The frontend animation is driven by `timer-tick` events.

---

## 3. User Stories

> As a **Host**, I want to create a room with a unique code so that I can invite my friends to join.

> As a **Guest**, I want to join an existing room by entering a code so that I can play with others.

> As a **Host**, I want to see who is in my waiting room in real time so that I know when everyone is present.

> As a **Host**, I want to start the game when I am ready so that all players begin simultaneously.

> As a **Player**, I want every round to count down from 15 seconds so that the game has time pressure.

> As a **Player**, I want to submit my answer and see how many others have already answered so that I feel part of a shared experience.

> As a **Player**, I want to see the correct answer, my score, and the live leaderboard after every round so that I know how I am doing.

> As a **Player**, I want to see a podium and final leaderboard at the end so that the winner is celebrated.

> As a **Host**, I want to offer a "Play Again" rematch so that the group can replay without leaving.

> As a **Guest**, I want to be returned to the lobby screen if the host closes the room, so that I am not left in a broken state.

> As a **Host**, I want host privileges to transfer to another player if I disconnect during the waiting room, so that the room is not orphaned.

---

## 4. Functional Requirements

### 4.1 Static File Serving

- **FR-01**: The system SHALL serve `index.html`, `styles.css`, `data.js`, `app.js`, `lobby.js`, and `multiplayer.js` as static files from the project root.
- **FR-02**: The system SHALL serve the Socket.io client library at the path `/socket.io/socket.io.js`.

### 4.2 Room Management

- **FR-03**: The system SHALL handle a `create-room` event with payload `{ nickname: string }` and respond via acknowledgement callback with `{ code, players }` on success or `{ error: string }` on failure.
- **FR-04**: Room codes SHALL be exactly 6 characters, uppercase alphanumeric, and unique among all currently active rooms.
- **FR-05**: The creating player SHALL be assigned the host role. The host's player object SHALL include `isHost: true`.
- **FR-06**: The system SHALL handle a `join-room` event with payload `{ code: string, nickname: string }` and respond via acknowledgement with `{ code, host: socketId, players }` on success or `{ error: string }` on failure.
- **FR-07**: The system SHALL reject `join-room` if the room code does not exist, the game is already in progress, or the nickname is empty.
- **FR-08**: On a successful join, the system SHALL emit `player-joined` with `{ players }` to all other sockets already in the room.
- **FR-09**: The system SHALL handle a `leave-room` event (no callback required). The leaving player SHALL be removed from the room.
- **FR-10**: When a non-host player leaves the waiting room, the system SHALL emit `player-left` with `{ players, leftNickname }` to remaining players.
- **FR-11**: When the host leaves the waiting room and at least one other player remains, the system SHALL promote the next player to host and emit `player-left` with the updated `players` array (including the new host flagged with `isHost: true`) to remaining players.
- **FR-12**: The system SHALL handle a `close-room` event. Only the host MAY close the room. The system SHALL emit `room-closed` (no payload) to all non-host players and destroy the room.
- **FR-13**: If a player disconnects unexpectedly (socket disconnect event), the system SHALL apply the same rules as `leave-room` for the waiting room and `leave-room` for an in-progress game (see FR-23).

### 4.3 Game Lifecycle

- **FR-14**: The system SHALL handle a `start-game` event from the host only. It SHALL reject via acknowledgement with `{ error: string }` if: the caller is not the host, or fewer than 2 players are in the room.
- **FR-15**: On a valid `start-game`, the system SHALL select game rounds using `buildGame(n)` from `data.js`, where `n` is a configurable number of rounds (default: 5). The system SHALL emit `game-started` with `{ totalRounds: n }` to all players in the room.
- **FR-16**: The system SHALL proceed through rounds sequentially, one at a time, controlled entirely by the server.
- **FR-17**: At the start of each round, the system SHALL emit `round-start` to all players with the payload:
  ```
  {
    index: number,       // 0-based round index
    total: number,       // total rounds in the game
    category: string,
    options: [{ word: string }]  // fake flag MUST NOT be included
  }
  ```
- **FR-18**: Immediately after emitting `round-start`, the system SHALL begin a 15-second countdown, emitting `timer-tick` with the remaining seconds (integer, counting down from 15 to 0) to all players in the room once per second.
- **FR-19**: The system SHALL handle `submit-answer` events with payload `{ optionIndex: number }`. Only one answer per player per round SHALL be recorded. Late answers (after time expires) SHALL be silently ignored.
- **FR-20**: After each `submit-answer`, the system SHALL emit `answer-progress` with `{ answered: number, total: number }` to all players in the room.
- **FR-21**: The round SHALL end when either all players have answered or the 15-second timer expires, whichever comes first.
- **FR-22**: At round end, the system SHALL emit `round-results` to all players with the payload:
  ```
  {
    fakeIndex: number,       // index in the options array of the fake word
    fakeWord: string,
    hint: string,
    results: [
      {
        id: socketId,
        correct: boolean,
        earned: number,      // base points for a correct answer
        speedBonus: number,  // additional points for answering quickly
        score: number        // cumulative score for this player
      }
    ],
    leaderboard: [
      { id: socketId, nickname: string, score: number }
      // sorted descending by score
    ]
  }
  ```
- **FR-23**: If a player disconnects during an in-progress game, the system SHALL continue the game for remaining players. The disconnected player's pending answer for the current round SHALL be treated as unanswered (no points awarded). They SHALL be excluded from future `round-results` and the final leaderboard.
- **FR-24**: After the last round's results are emitted, the system SHALL emit `game-over` to all players with:
  ```
  {
    leaderboard: [{ id, nickname, score }],  // full final ranking, descending
    loser: { nickname: string } | null,      // player with the lowest score; null if 1 player remains
    podium: [{ nickname, score }, ...]       // top 3 players, in order
  }
  ```

### 4.4 Scoring

- **FR-25**: A correct answer SHALL award a base of **100 points**.
- **FR-26**: A speed bonus SHALL be awarded on top of the base for correct answers. The bonus SHALL be proportional to how quickly the player answered within the 15-second window (e.g. answering in 1 second awards more than answering in 14 seconds). The exact formula is an implementation decision, but the maximum speed bonus SHALL be **50 points** (awarded for answers submitted in ≤ 1 second) and the minimum SHALL be **0 points** (for answers at or after the 14-second mark).
- **FR-27**: An incorrect or unanswered (timed-out) answer SHALL award **0 points**.
- **FR-28**: A player's cumulative score SHALL never decrease.

### 4.5 Play Again

- **FR-29**: The system SHALL handle a `play-again` event from the host only, received after `game-over`. It SHALL respond via acknowledgement with `{ error }` if the caller is not the host.
- **FR-30**: On a valid `play-again`, the system SHALL reset all player scores to 0, select a new set of rounds, and emit `back-to-lobby` with `{ players }` to all players in the room, returning them to the waiting screen.

### 4.6 Validation & Error Handling

- **FR-31**: All nickname inputs SHALL be validated server-side. A nickname that is empty or exceeds 24 characters SHALL be rejected with a descriptive error string.
- **FR-32**: Room codes submitted in `join-room` SHALL be validated as non-empty and exactly 6 characters. Invalid formats SHALL return `{ error: "Invalid room code" }`.
- **FR-33**: Any event received from a socket that is not associated with a room (except `create-room` and `join-room`) SHALL be silently ignored.

---

## 5. Acceptance Criteria

### AC-01 — Room Creation
- **Given** a player opens the app and enters a nickname,  
- **When** they click "Create Room",  
- **Then** a room is created, a 6-character code is displayed, and the player is shown the waiting screen as host.

### AC-02 — Room Joining
- **Given** a room exists with code `XYZ123`,  
- **When** a second player enters their nickname and the code and clicks "Join Room",  
- **Then** they are added to the waiting room and both players see each other in the player list.

### AC-03 — Join Rejection (Game In Progress)
- **Given** a game is already started in room `XYZ123`,  
- **When** a new player attempts to join that room,  
- **Then** they receive an error message and remain on the lobby screen.

### AC-04 — Start Game (Host Only)
- **Given** 2 or more players are in the waiting room,  
- **When** the host clicks "Start Game",  
- **Then** all players transition to the game screen simultaneously and the first round begins.

### AC-05 — Start Rejected (Too Few Players)
- **Given** only 1 player is in the waiting room,  
- **When** the host clicks "Start Game",  
- **Then** an error is shown and no game begins.

### AC-06 — Timer Synchronization
- **Given** a round has started,  
- **When** 5 seconds have elapsed,  
- **Then** all connected players see a timer value of 10 (within ±1 second of each other).

### AC-07 — Answer Submission
- **Given** a round is active and a player has not yet answered,  
- **When** they select an option,  
- **Then** the option is locked, a waiting indicator is shown, and the answer-progress count updates for all players.

### AC-08 — Round Auto-Advance
- **Given** a round is active and not all players have answered,  
- **When** the 15-second timer expires,  
- **Then** the round ends, correct/incorrect answers are revealed to all players, and scores are updated.

### AC-09 — Correct Scoring
- **Given** a player answered correctly with 10 seconds remaining,  
- **When** round-results is received,  
- **Then** their `earned` is 100 and their `speedBonus` is a positive value > 0.

### AC-10 — Leaderboard Order
- **Given** round results are emitted,  
- **When** the leaderboard is rendered,  
- **Then** players are ranked in descending order by cumulative score.

### AC-11 — Game Over / Podium
- **Given** all rounds have been played,  
- **When** the final round's results are processed,  
- **Then** all players are taken to the podium screen showing the loser reveal, top-3 podium, and full final leaderboard.

### AC-12 — Host Closes Room
- **Given** players are in the waiting room,  
- **When** the host clicks "Close Room",  
- **Then** all guests see the error "Room was closed by the host" and are returned to the lobby screen.

### AC-13 — Host Transfer on Disconnect
- **Given** a host disconnects unexpectedly in the waiting room,  
- **When** at least one guest remains,  
- **Then** the next player is promoted to host and sees the Start/Close buttons without any page reload.

### AC-14 — Player Disconnects During Game
- **Given** a player disconnects mid-game,  
- **When** the current round ends,  
- **Then** the disconnected player is absent from the leaderboard and the game continues normally for remaining players.

### AC-15 — Play Again
- **Given** the game is over and the host is on the podium screen,  
- **When** the host clicks "Play Again",  
- **Then** all connected players are returned to the waiting room with scores reset and a new round set prepared.

### AC-16 — Solo Mode Unaffected
- **Given** the server is running,  
- **When** a player opens the app and plays solo mode,  
- **Then** solo mode behaves identically to when no server is present.

---

## 6. Out of Scope

- **Reconnection after disconnect**: A player who disconnects is not expected to re-join an in-progress game and resume their session. Reconnect logic is explicitly excluded from this specification.
- **Spectator mode**: Players may not join a room as observers once a game is in progress.
- **Private/password-protected rooms**: All rooms are accessible by code alone.
- **Chat or messaging**: No in-game communication features.
- **Persistent leaderboards or user accounts**: All state is ephemeral.
- **More than one game configuration**: Round count is a single fixed default (5). There is no UI for hosts to configure it.
- **Anti-cheat**: No validation of whether answers are plausible or submitted at an abnormal rate.
- **Mobile-native apps**: The game is browser-only.
- **Horizontal scaling / multi-server deployments**: The backend is a single process. No Redis adapter or session affinity is required.
- **Frontend changes**: No modifications to `index.html`, `styles.css`, `app.js`, `lobby.js`, or `multiplayer.js` are part of this feature.

---

## 7. Open Questions

| # | Question | Impact |
|---|----------|--------|
| OQ-1 | What is the maximum number of players allowed per room? The frontend does not enforce a cap. Should the server cap rooms at a specific size (e.g., 8)? | Affects `join-room` validation |
| OQ-2 | Should the server use the exact `buildGame(n)` function from `data.js`, and if so, is `n=5` the correct default? Or should the host be able to choose the number of rounds in a future iteration? | Affects FR-15 and FR-30 |
| OQ-3 | Is the speed-bonus formula open to the implementing team, or does it need to match a specific design (e.g., linear decay, stepped tiers)? | Affects FR-26 and AC-09 |
| OQ-4 | If only one player remains in a room during an in-progress game (others all disconnected), should the game be auto-terminated and the player returned to the lobby, or should it complete solo? | Affects FR-23 |
| OQ-5 | Should the server enforce a minimum time between rounds (a delay after `round-results` before the next `round-start`), to give players time to read feedback? The frontend does not have a "Next" button in multiplayer mode. | Affects perceived UX between rounds |
| OQ-6 | Is there any rate-limiting or abuse-protection expectation (e.g., spam-creating rooms)? | Affects FR-31 / FR-33 scope |
