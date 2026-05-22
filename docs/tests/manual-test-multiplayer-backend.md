# Manual Test Guide: Multiplayer Backend — "Multiplayer Ready"

**Feature spec**: [docs/specs/multiplayer-backend-ready.md](../specs/multiplayer-backend-ready.md)  
**Implementation plan**: [docs/plans/plan-multiplayer-backend.md](../plans/plan-multiplayer-backend.md)  
**QA review date**: 2026-05-22  
**Scope**: End-to-end multiplayer functionality via the Node.js / Socket.io server (`server.js`). Solo mode regression check included.

---

## 1. Feature Under Test

**FakeRealGame Multiplayer Backend** — a Node.js + Socket.io server that enables two or more players in separate browser sessions to create or join rooms, play a fully synchronised 5-round game, and see a final podium, without any frontend changes.

**In scope**:
- Room creation, joining, host management, and teardown
- Game start, round sequencing, server-driven countdown
- Answer submission, scoring (base + speed bonus), progress broadcast
- Round results and leaderboard, game-over / podium
- Play Again (rematch) and leave / close flows
- Solo mode regression

**Out of scope**:
- Automated load or performance testing
- Cross-browser compatibility beyond a modern Chromium browser
- Persistence across server restarts (explicitly excluded by spec)
- Multiplayer with more than 4 concurrent players (no limit defined)

---

## 2. Prerequisites

### Environment setup

1. Node.js ≥ 18 installed.
2. From the project root, run:
   ```bash
   npm install
   npm start
   ```
3. Server should print: `FakeRealGame backend running on http://localhost:3000`
4. Open **two separate browser windows** (not tabs — use separate windows or one private/incognito window) pointing to `http://localhost:3000`.
5. Open the browser DevTools console in each window for socket-level inspection.

### Test data / state

- No pre-existing state is needed. All state is in-memory.
- To reset between test cases, restart the server (`Ctrl+C`, then `npm start`).
- Assign clear labels to windows for readability: **Window A = Host**, **Window B = Guest**.

---

## 3. Test Cases

### TC-01: Room creation (AC-01 / FR-03, FR-04, FR-05)

**Covers**: Host creates a room and receives a unique 6-character code.

**Precondition**: Server running. Window A at the intro screen.

**Steps**:
1. In Window A, click **Multiplayer**.
2. Enter a nickname (e.g. `Alice`).
3. Click **Create Room**.

**Expected Result**:
- Window A transitions to the waiting screen.
- A 6-character code (A–Z, 0–9 only) is displayed prominently.
- Alice appears in the player list with a **HOST** badge.
- The **Start Game** and **Close Room** buttons are visible.
- The "Waiting for host to start" hint is hidden.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-02: Room joining — success (AC-02 / FR-06, FR-08)

**Covers**: Guest joins an existing room and both players see each other.

**Precondition**: TC-01 passed; Window A is on the waiting screen with a room code.

**Steps**:
1. In Window B, click **Multiplayer**.
2. Enter nickname `Bob`.
3. Enter the room code shown in Window A.
4. Click **Join Room**.

**Expected Result**:
- Window B transitions to the waiting screen.
- Window B shows both Alice (HOST) and Bob in the player list.
- Window A's player list updates to show Bob (no page reload required).
- Window B sees the **Leave Room** button; **Start Game** is hidden for Bob.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-03: Join rejection — room not found (FR-07)

**Covers**: Joining a non-existent room returns an error.

**Precondition**: Server running. Window B on the lobby screen.

**Steps**:
1. In Window B, enter nickname `Eve`.
2. Enter room code `XXXXXX`.
3. Click **Join Room**.

**Expected Result**:
- An error message is displayed ("Room not found" or similar).
- Window B remains on the lobby screen.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-04: Join rejection — invalid room code format (FR-32)

**Covers**: Codes shorter than 6 characters are rejected server-side.

**Precondition**: Server running. Window B on the lobby screen.

**Steps**:
1. Enter nickname `Eve` and code `AB` (2 characters).
2. Click **Join Room**.

**Expected Result**:
- An error message about invalid room code is displayed.
- Window B stays on the lobby screen.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-05: Join rejection — nickname empty (FR-31)

**Covers**: Empty nickname is rejected server-side.

**Precondition**: Server running. Window B on the lobby screen.

**Steps**:
1. Leave the nickname field blank.
2. Enter a valid room code (from TC-01 or any active room).
3. Click **Join Room**.

**Expected Result**:
- An error message about nickname being required is shown.
- Window B stays on the lobby screen.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-06: Join rejection — nickname too long (FR-31)

**Covers**: Nicknames exceeding 24 characters are rejected.

**Precondition**: Server running. Window B on the lobby screen with an active room code.

**Steps**:
1. Enter a 25-character nickname (e.g. `AAAAAAAAAAAAAAAAAAAAAAAAA`).
2. Enter a valid room code and click **Join Room**.

**Expected Result**:
- An error message about nickname length is displayed.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-07: Join rejection — game already in progress (AC-03 / FR-07)

**Covers**: Late joiners cannot enter a room mid-game.

**Precondition**: Two-player game has been started (TC-01 + TC-02, then TC-09 started). Open a third window (Window C).

**Steps**:
1. In Window C, click **Multiplayer**, enter nickname `Carol`.
2. Enter the active room code and click **Join Room**.

**Expected Result**:
- Error message "Game already in progress" (or equivalent).
- Window C stays on the lobby screen.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-08: Start game rejection — only 1 player (AC-05 / FR-14)

**Covers**: Game cannot start with fewer than 2 players.

**Precondition**: Window A has created a room (only Alice is present).

**Steps**:
1. In Window A, click **Start Game**.

**Expected Result**:
- An error message is displayed ("At least 2 players are required" or similar).
- No game starts; both players remain on the waiting screen.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-09: Start game — host only (AC-04 / FR-14, FR-15)

**Covers**: Only the host can start the game; all players transition simultaneously.

**Precondition**: Two players in waiting room (TC-01 + TC-02 complete).

**Steps**:
1. In Window A (host), click **Start Game**.

**Expected Result**:
- Both Window A and Window B immediately transition to the game screen.
- The round indicator shows "Round 1 / 5".
- A category label and four word options are displayed.
- The timer ring is visible and begins counting down from 15.
- The leaderboard sidebar is visible showing both players at 0 score.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-10: Timer synchronisation (AC-06 / FR-18)

**Covers**: Both clients display approximately the same timer value.

**Precondition**: A round is active (TC-09 run; do not answer anything).

**Steps**:
1. Watch both windows. Note the timer value displayed in each.
2. After 5 seconds have elapsed, note both timer values simultaneously.

**Expected Result**:
- After 5 seconds, both windows show a value in the range **9–11** (10 ±1).
- Timer reaches 0 within approximately 15 seconds of round start.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-11: Answer submission and progress broadcast (AC-07 / FR-19, FR-20)

**Covers**: Selecting an option locks it, shows waiting indicator, and updates progress for all.

**Precondition**: A round is active.

**Steps**:
1. In Window A, click any option.

**Expected Result**:
- The selected option is visually highlighted in Window A.
- All four options are disabled in Window A.
- A waiting indicator appears in Window A ("Waiting for others...").
- Window A shows the progress text "Waiting for others... (1/2)".
- Window B still shows all options enabled and no waiting indicator.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-12: Both players answer — round auto-advances (FR-21, FR-22)

**Covers**: Round ends immediately when all players have answered.

**Precondition**: TC-11 done; Window A has answered. Window B has not.

**Steps**:
1. In Window B, click any option.

**Expected Result**:
- Round ends immediately (does not wait for timer to expire).
- Both windows show the round-results view:
  - Correct option highlighted.
  - Incorrect options dimmed.
  - Feedback overlay ("Correct! +100" or "Not quite — the fake was …").
  - Hint text displayed.
  - Live leaderboard updates with new scores.
- After approximately 4–5 seconds, Round 2 begins automatically.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-13: Timer expiry — round auto-advances with unanswered players (AC-08 / FR-21)

**Covers**: Round ends after 15 seconds if not all players have answered.

**Precondition**: A fresh round is active. Both players have NOT answered.

**Steps**:
1. Do not click any option in either window.
2. Wait for the timer to reach 0.

**Expected Result**:
- After 15 seconds, the round ends automatically.
- Round-results are shown in both windows.
- Players who did not answer receive 0 points.
- Leaderboard reflects unchanged (0) scores for unanswered players.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-14: Correct scoring with speed bonus (AC-09 / FR-25, FR-26)

**Covers**: Correct answer within 1 second earns 100 base + up to 50 speed bonus.

**Precondition**: A round is active. Note the round's fake word visually (it is the intended correct answer).

**Steps**:
1. As quickly as possible after `round-start`, click the correct (fake) word in Window A.
2. Let Window B's timer expire (or have Window B also answer).
3. Observe the round-results in Window A.

**Expected Result**:
- Window A feedback reads "Correct! +100 (speed +N)" where N > 0 (ideally 50 if answered within 1 second).
- Window A's score increases by 100 + N.
- The leaderboard reflects this cumulative score.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-15: Incorrect scoring — wrong answer (FR-27, FR-28)

**Covers**: Wrong answer awards 0 points; score never decreases.

**Precondition**: A round is active. Player A intentionally answers wrong.

**Steps**:
1. In Window A, click an option that is NOT the fake word.
2. Wait for the round to end.

**Expected Result**:
- Window A feedback shows "Not quite — the fake was…".
- Window A's score does NOT change (0 points added).
- Score in the leaderboard is unchanged from the previous round.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-16: Full game completion — game-over and podium (FR-24)

**Covers**: Game over event fires after 5 rounds; podium and leaderboard are shown.

**Precondition**: Two players complete all 5 rounds.

**Steps**:
1. Play through all 5 rounds (any combination of correct/incorrect answers).
2. After the 5th round-results screen, wait for the podium screen to appear.

**Expected Result**:
- After the 5th round, both windows transition to the podium screen.
- A "loser reveal" phase appears first (shows the player with the lowest score).
- After ~4 seconds, the podium section appears with up to 3 ranked places.
- A full final leaderboard is shown, sorted descending by score.
- The host (Window A) sees a **Play Again** button. Window B does not.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-17: Play Again — rematch (FR-29, FR-30)

**Covers**: Host starts a rematch; all scores reset and players return to waiting screen.

**Precondition**: TC-16 complete; both windows on the podium screen.

**Steps**:
1. In Window A (host), click **Play Again**.

**Expected Result**:
- Both windows transition back to the waiting screen.
- Both players appear in the player list with host badge preserved.
- Scores are reset to 0 (confirmed when next game starts and leaderboard shows 0).
- Window A sees **Start Game** and **Close Room** buttons.
- A new game can be started and completed normally (re-run TC-09 through TC-16).

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-18: Guest leave — waiting room (FR-09, FR-10)

**Covers**: Non-host leaving the waiting room updates the player list for remaining players.

**Precondition**: Two players in waiting room (TC-01 + TC-02).

**Steps**:
1. In Window B (Bob), click **Leave Room**.

**Expected Result**:
- Window B transitions to the lobby screen.
- Window A's player list updates: Bob is removed. Only Alice is shown.
- No crash or error in Window A.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-19: Host leaves waiting room — host promotion (FR-11)

**Covers**: When the host leaves, the next player is promoted to host.

**Precondition**: At least two players in waiting room (Alice = host, Bob = guest).

**Steps**:
1. In Window A (Alice), click **Leave Room** (use the Leave button, not Close Room).

**Expected Result**:
- Window A transitions to the lobby screen.
- Window B's player list updates: Alice is removed. Bob now has the **HOST** badge.
- Window B now sees the **Start Game** and **Close Room** buttons.
- Window B can start a new game (with a third player joining if needed, since single-player start is blocked).

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-20: Host closes room (FR-12)

**Covers**: Host closing the room sends all guests to the lobby with an error message.

**Precondition**: Two players in waiting room.

**Steps**:
1. In Window A (host), click **Close Room**.

**Expected Result**:
- Window A transitions to the lobby screen.
- Window B transitions to the lobby screen with an error message ("Room was closed by the host" or equivalent).

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-21: Unexpected disconnect — waiting room (FR-13)

**Covers**: A player's abrupt disconnect is treated as a leave.

**Precondition**: Two players in waiting room.

**Steps**:
1. In Window B, open DevTools and run `window.gameSocket.disconnect()` in the console.

**Expected Result**:
- Window A's player list updates: Bob disappears.
- No server crash or error.
- If Bob was the only guest (Alice remains), Alice still sees the waiting screen normally.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-22: Unexpected disconnect — mid-game (FR-23)

**Covers**: A disconnecting player during a game does not break the remaining player's game.

**Precondition**: Two-player game in progress (TC-09 run, round 1 active, neither has answered).

**Steps**:
1. In Window B, run `window.gameSocket.disconnect()` in DevTools console.
2. Observe Window A's game screen.
3. Complete the remaining rounds in Window A alone (wait for auto-advance or answer).

**Expected Result**:
- Window A's game continues uninterrupted.
- If Bob had not answered, the round ends immediately (only remaining player = Alice, who may or may not have answered — adjust accordingly).
- Bob does not appear in subsequent `round-results` leaderboards.
- After the final round, Window A sees the podium screen with only Alice in the leaderboard.
- `loser` on the podium is `null` (only 1 player remains).

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-23: Room isolation — two concurrent rooms (FR-04)

**Covers**: Events in one room do not bleed into another room.

**Precondition**: Server running. Four browser windows available (A, B, C, D).

**Steps**:
1. Windows A+B: create and join Room 1. Start a game.
2. Windows C+D: create and join Room 2. Start a game.
3. Submit answers in Room 1.

**Expected Result**:
- Room 2 windows (C, D) do NOT receive `round-results`, `answer-progress`, or `timer-tick` events from Room 1.
- Both games proceed independently and complete without cross-contamination.

**Pass / Fail**: [ ]  
**Notes**: ___

---

### TC-24: Solo mode regression (spec Assumption 3)

**Covers**: Solo mode continues to work via the backend-served static files.

**Precondition**: Server running at `http://localhost:3000`.

**Steps**:
1. Open `http://localhost:3000` in a browser.
2. Click **Solo Play** (or the equivalent entry point for solo mode).
3. Complete a full solo game (all rounds).

**Expected Result**:
- Solo game loads and plays normally.
- All rounds display correctly; the score updates; the end screen appears.
- No socket errors appear in the DevTools console related to solo gameplay.

**Pass / Fail**: [ ]  
**Notes**: ___

---

## 4. End-to-End Scenarios

### E2E-01: Full two-player game flow

Simulates the complete intended user journey from landing to podium.

1. **TC-01** — Alice creates a room.
2. **TC-02** — Bob joins.
3. **TC-09** — Alice starts the game.
4. **TC-11** — Alice answers Round 1 first.
5. **TC-12** — Bob answers; round auto-ends.
6. Repeat answer/wait-for-timer pattern for Rounds 2–5 (mix correct and incorrect answers).
7. **TC-16** — Podium appears with correct scores.
8. **TC-17** — Alice triggers Play Again; both return to waiting screen.
9. **TC-09** — Alice starts second game (verify scores are 0 in the leaderboard).

**Pass / Fail**: [ ]

---

### E2E-02: Host disconnect and recovery

Tests resilience when the host leaves mid-lobby.

1. Alice creates room. Bob and Carol join.
2. **TC-19** — Alice disconnects (or clicks Leave). Bob is promoted to host.
3. A fourth player (Dave) joins.
4. Bob starts the game.
5. Complete 5 rounds normally.
6. Podium shows only Bob, Carol, Dave.

**Pass / Fail**: [ ]

---

### E2E-03: Mid-game player dropout

Tests game continuity after a mid-game disconnect.

1. Alice (host), Bob, Carol all in a room. Game starts.
2. During Round 2 (after Round 1 completed), Carol disconnects abruptly.
3. Alice and Bob continue and finish the game.
4. Verify Carol does not appear on the final podium or leaderboard.
5. Alice triggers Play Again. Verify only Alice and Bob appear in the waiting room.

**Pass / Fail**: [ ]

---

## 5. Known Limitations & Out-of-Scope

| Item | Notes |
|---|---|
| **No automated tests** | The project has no test runner. All validation is manual. |
| **Timer drift** | `setInterval` drift is acknowledged in the plan. AC-06 allows ±1 second tolerance. |
| **No max player limit** | No cap on room size is defined. Testing beyond 4 players is out of scope. |
| **Mid-game host transfer** | The spec does not define behavior when the host disconnects during an active game. The server continues the game (host is treated as any other disconnect), but no new host is explicitly promoted. No UI reflects this edge case. |
| **`play-again` during active game (server-side)** | See Defect #1 below. If a host emits `play-again` via the console during an active game, the server will silently abort the game and reset. This is blocked by the UI but not by the server. |
| **Persistence** | Server restart clears all rooms. Not tested. |
| **Browser compatibility** | Only tested against modern Chromium. Firefox and Safari may behave differently for socket reconnection. |
| **Solo mode keyboard shortcuts** | Not part of this feature. No regression testing of solo keyboard controls required. |

---

## 6. Defect Register

The following defects were identified during code review against the spec and plan.

---

### Defect #1 — Major
**Location**: [server.js](../../server.js) — `play-again` event handler (lines ~490–510)  
**Expected** (FR-29): The system SHALL handle `play-again` from the host only, "received after `game-over`". The server must validate that the room is in a post-game state before executing rematch logic.  
**Actual**: There is no `room.status` check. A host can emit `play-again` via the browser console while a game is in progress. The server will immediately cancel the running round timers, reset all player scores to 0, and emit `back-to-lobby` — silently aborting an active game.  
**Steps to reproduce**:
1. Start a two-player game.
2. While Round 1 is active, open DevTools in the host window and run: `window.gameSocket.emit('play-again', null, r => console.log(r))`.
3. Both clients are sent back to the waiting screen; scores are 0; the running round is abandoned.  
**Fix guidance**: Add a guard at the start of the `play-again` handler: reject with `{ error: 'No active game to rematch' }` if `room.status !== 'waiting'`. Since `endGame` already resets status to `'waiting'`, this check correctly distinguishes the pre-game and post-game states from in-progress.

---

### Defect #2 — Minor
**Location**: [server.js](../../server.js) — `removePlayer` function, in-progress branch (lines ~318–326)  
**Expected** (FR-20): `answer-progress` should only be emitted in the context of an active round.  
**Actual**: When a player disconnects during the inter-round delay (status is `'in-progress'` but `roundState` is `null`), the server emits `answer-progress { answered: 0, total: N }`. This is a stale and misleading event sent during a period when no round is active.  
**Steps to reproduce**:
1. Start a game. Let Round 1 complete.
2. During the 4.5-second delay before Round 2, disconnect one player (DevTools: `window.gameSocket.disconnect()`).
3. Observe in DevTools of the remaining player that an `answer-progress` event is received with `answered: 0`.  
**Fix guidance**: Wrap the `answer-progress` emission and `maybeEndRoundEarly` call in a check: only execute if `room.roundState` is non-null.

---

### Defect #3 — Minor
**Location**: [server.js](../../server.js) — `removePlayer`, waiting-room branch + [lobby.js](../../lobby.js) — `player-left` handler  
**Expected**: `player-left` should only be relevant while players are on the waiting screen.  
**Actual**: After `endGame`, `room.status` resets to `'waiting'`. When a player clicks **Leave** from the podium screen, `removePlayer` emits `player-left` to remaining players. Those players are on the podium screen, not the waiting screen. `lobby.js` handles `player-left` by calling `renderPlayers`, which re-renders the (invisible) waiting-room player list. No visible crash, but it is unnecessary event emission and DOM manipulation.  
**Steps to reproduce**:
1. Complete a game and reach the podium screen.
2. In Window B, click **Leave**.
3. Check DevTools in Window A: a `player-left` event is received while on the podium screen.  
**Fix guidance**: This is cosmetically harmless given the current frontend. No fix is strictly required for this release, but documenting the behavior is advised for future frontend changes that may add a `player-left` handler on the game/podium screen.

---

### Defect #4 — Minor
**Location**: [server.js](../../server.js) — timer implementation in `startRound`  
**Expected** (FR-18): "emitting `timer-tick` with the remaining seconds (integer, counting down from **15** to 0)".  
**Actual**: The first `timer-tick` emitted is `14` (one second after round start). `15` is never emitted as a tick — it is initialised client-side in the `round-start` handler via `setTimer(15)`. The round correctly lasts 15 seconds total and the client displays 15 at the start, so there is no functional regression. This is a minor spec conformance deviation.  
**Fix guidance**: If strict spec conformance is required, emit `timer-tick` with value `15` immediately before starting the interval (synchronously after `round-start` is emitted). This is a one-line addition and is low-risk.

---

## 7. Release Readiness Verdict

| Dimension | Status |
|---|---|
| Static file serving (FR-01, FR-02) | ✅ Pass |
| Room management (FR-03 to FR-13) | ✅ Pass |
| Game lifecycle / sequencing (FR-14 to FR-21) | ✅ Pass |
| Round results & scoring (FR-22 to FR-28) | ✅ Pass |
| Game-over / podium (FR-24) | ✅ Pass |
| Play Again (FR-29, FR-30) | ⚠️ Conditional — Defect #1 |
| Validation & error handling (FR-31 to FR-33) | ✅ Pass |
| Solo mode regression | ✅ Pass (code review; verify manually) |

**Overall verdict: CONDITIONAL PASS**

The core game loop — room creation, joining, game start, round sequencing, timer, scoring, results, game-over, and podium — is implemented correctly and matches the spec. No Critical defects were found.

**Defect #1 (Major)** is the only blocker: the `play-again` handler does not guard against being called during an active game. This is not triggerable via the UI, but is exploitable via the browser console by any host. Fix recommended before release to a shared environment.

**Defects #2, #3, and #4** are Minor and non-blocking. They can be deferred to a follow-up iteration.

The implementation may be released to a controlled/internal environment immediately. For a public or shared deployment, resolution of Defect #1 is strongly recommended first.
