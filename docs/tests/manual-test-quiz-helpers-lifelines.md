# Manual Test Guide: Quiz Helpers / Lifelines

**Feature**: Quiz Helpers — Lifelines for Solo and Multiplayer  
**Spec**: [docs/specs/quiz-helpers-lifelines.md](../specs/quiz-helpers-lifelines.md)  
**Plan**: [docs/plans/plan-quiz-helpers-lifelines.md](../plans/plan-quiz-helpers-lifelines.md)  
**Date**: 2026-05-22  
**QA Status**: PASS — Defect #1 (critical IIFE blocker) resolved; all ACs assessed as passing by code review

---

## 1. Feature Under Test

### Feature Name
Quiz Helpers — Lifelines (solo and multiplayer)

### Scope
This guide covers:
- Solo game configuration panel (question count, helper count)
- All three helper types (50/50, GuilleAI, Extra Hint) in **solo mode**
- Helper state management (available, spent, reset)
- Helper UI visibility by `helperCount` configuration
- Multiplayer waiting-room configuration (host controls, guest read-only display)
- Multiplayer helper isolation per player
- Reset behaviour on restart / rematch
- Data expansion (≥ 20 rounds, default 15 questions)

### Defect #1 — RESOLVED
The previously reported duplicate-IIFE blocker in `lobby.js` and `multiplayer.js` has been fixed. Each file now contains exactly one IIFE, one Socket.io connection, and correct event handler registrations. Multiplayer test cases (TC-12 through TC-18) are no longer blocked.

---

## 2. Prerequisites

### Environment — Solo
1. Clone the repo.
2. Open `index.html` in any modern browser (Chrome 120+, Firefox 121+, Safari 17+) via a static file server OR directly as `file://`.  
   ```
   npx serve .        # serves on http://localhost:3000
   python -m http.server  # serves on http://localhost:8000
   ```
3. No backend is required for solo tests.
4. Open DevTools (F12) → Console to monitor errors and run verification commands.

### Environment — Multiplayer
1. The Socket.io backend (`server.js`) must be running:
   ```
   npm install
   node server.js
   ```
2. Open **at least two separate browser tabs or windows** to `http://localhost:3000`.
3. Tabs should be treated as independent players.

### Test data assumptions
- `ROUNDS.length` = 21 (verified by running `console.log(ROUNDS.length)` in the browser).
- Default question count = 15, default helper count = 3.

---

## 3. Test Cases

---

### TC-01: Default configuration values on solo intro screen
**Covers**: AC-01, FR-05  
**Precondition**: Open `index.html`. The intro screen is visible.

**Steps**:
1. Observe the **Questions** input field value.
2. Observe the **Helpers** input field value.

**Expected Result**: Questions shows `15`, Helpers shows `3`. Neither input is empty.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-02: Question count upper bound reflects ROUNDS.length
**Covers**: FR-02, Phase 1 data expansion  
**Precondition**: Intro screen visible. DevTools Console open.

**Steps**:
1. In the Console, run: `console.log(ROUNDS.length)`.
2. Click into the **Questions** input and attempt to type `99`.
3. Click **Solo Practice** to start.
4. Count the total rounds shown in the HUD (`round X / Y`).

**Expected Result**:
- Console shows `21`.
- Input clamps to `21` (HTML `max` attribute is updated to `21` by `syncConfigBounds()`).
- Game runs for 21 rounds.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-03: Solo game runs for configured question count
**Covers**: AC-02, FR-06  
**Precondition**: Intro screen visible.

**Steps**:
1. Set **Questions** to `5`, **Helpers** to `1`.
2. Click **Solo Practice**.
3. Play all rounds, clicking **Next** after each answer.
4. Count the number of rounds before the Results screen appears.

**Expected Result**: Exactly 5 rounds play, then the Results screen appears. Only one helper button is visible during the game (`Extra Hint` only).  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-04: No helpers shown when helper count is 0
**Covers**: AC-03, FR-37  
**Precondition**: Intro screen visible.

**Steps**:
1. Set **Helpers** to `0`.
2. Click **Solo Practice**.
3. Inspect the game screen for any helper buttons.

**Expected Result**: The helper button bar is not visible (no `Extra Hint`, `50/50`, or `GuilleAI` buttons). Gameplay proceeds normally.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-05: 50/50 eliminates exactly two non-fake options
**Covers**: AC-07, FR-16, FR-17, FR-18, FR-19  
**Precondition**: Solo game started with `helperCount = 3`. On any round, before answering.

**Steps**:
1. Note which option has `data-fake="true"` by running in Console: `[...document.querySelectorAll('.option')].map(b => b.dataset.fake + ': ' + b.querySelector('.option-text').textContent)`.
2. Click the **50/50** helper button.
3. Observe the four option buttons.
4. Attempt to click each of the greyed-out options.
5. Click one of the two remaining selectable options.

**Expected Result**:
- Exactly 2 options become visually distinct (greyed out / `option--disabled` class).
- The fake option and exactly 1 non-fake option remain selectable.
- Clicking a disabled option has no effect.
- Answer is recorded when a selectable option is clicked.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-06: 50/50 button shows as spent after use; does not re-activate
**Covers**: AC-09, FR-35, FR-36  
**Precondition**: Continuing from TC-05 or new game with `helperCount = 3`.

**Steps**:
1. Activate 50/50 on one round.
2. Observe the 50/50 button appearance.
3. Advance to the next round (click **Next**).
4. On the next round, attempt to click the 50/50 button again.

**Expected Result**:
- After step 1: 50/50 button gains the spent style (dimmed, `helper-btn--spent` class), is `disabled`.
- After step 4: 50/50 button remains spent and unclickable. The two-option elimination does NOT reapply on the new round.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-07: 50/50 does not activate after answering
**Covers**: AC-08, FR-20  
**Precondition**: Solo game with `helperCount = 3`. On any round.

**Steps**:
1. Click any option button to submit an answer.
2. While the feedback panel is visible, click the **50/50** button.
3. Observe whether any options change state.

**Expected Result**: Nothing happens. The 50/50 button is disabled during feedback phase. No options are greyed out.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-08: GuilleAI panel appears with correct fake word and valid confidence
**Covers**: AC-10, AC-11, FR-21, FR-22, FR-23, FR-24  
**Precondition**: Solo game with `helperCount = 3`. On any round, before answering.

**Steps**:
1. Note the fake word: `[...document.querySelectorAll('.option')].find(b => b.dataset.fake === 'true').querySelector('.option-text').textContent` in Console.
2. Click the **GuilleAI** helper button.
3. Read the panel text.
4. Note the confidence percentage shown.

**Expected Result**:
- A panel appears attributed to "GuilleAI".
- The panel names the exact fake word from step 1.
- The confidence percentage is an integer between 65 and 95 inclusive.
- The message matches the template: `"GuilleAI analysed the category and is N% confident that 'X' is the impostor."`.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-09: GuilleAI panel dismissal does not alter options; helper is spent
**Covers**: AC-12, FR-25, FR-36  
**Precondition**: GuilleAI panel is visible (continuing from TC-08).

**Steps**:
1. Note the number of selectable options (should be 4).
2. Click the **Dismiss** button on the GuilleAI panel.
3. Observe the options.
4. Observe the GuilleAI button state.

**Expected Result**:
- Panel disappears.
- All four options remain selectable (no options were disabled by GuilleAI).
- The GuilleAI button is now in the spent state (dimmed, unclickable).  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-10: Extra Hint reveals hint text before answering; hint persists after answer
**Covers**: AC-14, AC-15, FR-28, FR-29, FR-30  
**Precondition**: Solo game with `helperCount = 3`. On any round, before answering.

**Steps**:
1. Confirm the round-hint area is not visible before activation.
2. Click the **Extra Hint** button.
3. Observe the hint text that appears.
4. Click any option to submit an answer.
5. Observe the feedback panel.
6. Observe the round-hint area.

**Expected Result**:
- Step 2: hint text from the round's `hint` field appears in the `#round-hint` element immediately, before answering.
- Step 4–5: The feedback panel appears; `feedbackDetail` also shows the hint text.
- Step 6: The `#round-hint` element remains visible (not cleared). The hint text is effectively visible in two areas simultaneously — this is the specified behaviour per FR-30.
- The Extra Hint button is now spent (dimmed, unclickable).  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-11: Helper state resets on Play Again / restart
**Covers**: AC-02 (reset), FR-38  
**Precondition**: Solo game with `helperCount = 3`. Use all three helpers across the game, then reach the Results screen.

**Steps**:
1. Use 50/50, GuilleAI, and Extra Hint in a game session.
2. Complete all rounds and reach the Results screen.
3. Click **Play Again**.
4. On the first round of the new game, observe the helper buttons.

**Expected Result**: All three helper buttons are available (not spent) at the start of the new game. The helper bar is visible.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-12: Helper buttons locked during post-answer feedback phase (multiplayer)
**Covers**: FR-39  
**Precondition**: Multiplayer game running with `helperCount = 3`.

**Steps**:
1. On any round, before answering, confirm helper buttons are enabled.
2. Submit an answer.
3. While the waiting indicator is shown (before `round-results`), observe helper button states.
4. After `round-results`, observe helper button states.

**Expected Result**: After submitting an answer, all helper buttons become disabled. They remain disabled through the feedback phase until the next round begins.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-13: Host waiting-room controls are visible; guest sees read-only summary
**Covers**: AC-04, FR-07, FR-11  
**Precondition**: Two browser tabs open to `http://localhost:3000` with `node server.js` running. Tab 1 = Host (created room). Tab 2 = Guest (joined room).

**Steps**:
1. In Tab 1 (Host): Observe the waiting room for question count and helper count inputs.
2. In Tab 2 (Guest): Observe the waiting room.
3. In Tab 1, change question count to `8` and helper count to `2`.
4. Observe Tab 2.

**Expected Result**:
- Tab 1 shows editable inputs for question count and helper count.
- Tab 2 shows a read-only text summary (e.g., "15 questions, 3 helpers").
- After step 3: Tab 2's summary updates to "8 questions, 2 helpers" in real time.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-14: Multiplayer game runs for host-configured question count
**Covers**: AC-05, FR-13  
**Precondition**: Multiplayer room with ≥2 players. Host sets question count to `8`.

**Steps**:
1. Host sets question count to `8` in the waiting room.
2. Host clicks **Start Game**.
3. Play through all rounds in both tabs.
4. Count rounds before the game-over screen.

**Expected Result**: Exactly 8 rounds play out for both players, then the podium screen appears.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-15: Server rejects start-game with invalid helperCount
**Covers**: AC-06, FR-15  
**Precondition**: A room exists with at least 2 players. DevTools Console open in Host tab.

**Steps**:
1. In the Host tab Console, run:  
   `window.gameSocket.emit('start-game', { questionCount: 10, helperCount: 4 }, (res) => console.log(res))`
2. Observe the console output.

**Expected Result**: Server returns `{ error: "helperCount must be an integer between 0 and 3" }`. The game does NOT start.  
**Pass / Fail**: [ ]  
**Notes**: Server-side validation verified by code review. This test confirms end-to-end behaviour.

---

### TC-16: Multiplayer 50/50 is player-isolated
**Covers**: AC-17, FR-40, FR-41, FR-42  
**Precondition**: Multiplayer game running with `helperCount = 3`.

**Steps**:
1. In Tab 1 (Player A), on Round 1, click **50/50**.
2. Observe Tab 1: two options should be greyed out.
3. Observe Tab 2 (Player B): all four options should still be selectable.

**Expected Result**: Only Tab 1's option layout is affected. Tab 2's options are unchanged. No socket event is emitted for the 50/50 activation.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-17: Each player has independent helper supply
**Covers**: AC-18, FR-40  
**Precondition**: Multiplayer game with `helperCount = 2` (Extra Hint + 50/50).

**Steps**:
1. In Tab 1, use both helpers (Extra Hint on Round 1, 50/50 on Round 2).
2. In Tab 2, observe the helper buttons throughout.

**Expected Result**: Tab 2's helpers remain available (not spent) regardless of Tab 1's usage.  
**Pass / Fail**: [ ]  
**Notes**:

---

### TC-18: Multiplayer rematch resets helper state
**Covers**: AC-19, FR-38  
**Precondition**: Multiplayer game complete; both players on podium screen. `helperCount = 3`.

**Steps**:
1. Host uses all 3 helpers in Game 1.
2. Host clicks **Play Again** on the podium screen.
3. Both tabs return to the waiting room.
4. Host clicks **Start Game** again.
5. On the first round of Game 2, observe helper buttons in both tabs.

**Expected Result**: All 3 helper buttons are available (not spent) in both tabs at the start of Game 2.  
**Pass / Fail**: [ ]  
**Notes**:

---

## 4. End-to-End Scenarios

### E2E-01: Full solo game at default settings
1. Open the intro screen. Confirm defaults: 15 questions, 3 helpers.
2. Click **Solo Practice** without changing anything.
3. On Round 1: use **Extra Hint** before answering. Confirm hint appears.
4. Answer Round 1.
5. On Round 2: use **GuilleAI**. Confirm fake word is named and confidence is 65–95. Dismiss the panel. Confirm options unchanged.
6. On Round 3: use **50/50**. Confirm exactly 2 non-fake options are disabled.
7. Play remaining rounds without helpers (all spent). Confirm spent buttons remain dimmed.
8. Complete all 15 rounds. Confirm Results screen appears at round 15/15.
9. Click **Play Again**. Confirm all three helpers are reset to available on Round 1.

**Pass / Fail**: [ ]

---

### E2E-02: Solo game with helper count = 1
1. On the intro screen, set **Helpers** to `1`.
2. Click **Solo Practice**.
3. Confirm only the **Extra Hint** button is visible; **50/50** and **GuilleAI** buttons are hidden.
4. Activate **Extra Hint** on any round.
5. Confirm the Extra Hint button becomes spent.
6. Confirm no other helper buttons appear for the remainder of the game.

**Pass / Fail**: [ ]

---

### E2E-03: Multiplayer game with 8 questions and 2 helpers
1. Host creates room. Sets questions = 8, helpers = 2.
2. Guest joins. Guest sees "8 questions, 2 helpers".
3. Host starts game. Both players play 8 rounds.
4. In each player's game: only **Extra Hint** and **50/50** are visible.
5. Player A uses 50/50 on Round 3 → Player B's options unaffected.
6. Game ends after 8 rounds. Podium appears.
7. Host clicks Play Again. Both players start Game 2 with both helpers available.

**Pass / Fail**: [ ]

---

## 5. Known Limitations & Out-of-Scope

- **Defect #1 (Critical)**: RESOLVED. Duplicate IIFE issue in lobby.js and multiplayer.js has been fixed. All multiplayer test cases unblocked.
- **Double event listener on helper buttons (Minor)**: Both `app.js` and `multiplayer.js` attach click handlers to the same helper button DOM elements. Mode guards (`multiplayerMode` / `window.isMultiplayerMode?.()`) prevent double-execution; functionally safe but architectural debt. Not release-blocking.
- **GuilleAI panel**: Confidence value is embedded directly in the `#guilleai-message` text (FR-24 compliant). There is no separate `#guilleai-confidence` DOM element; a previous review note referencing one was incorrect and has been removed.
- **FR-34 helper subset ordering when helperCount < 3**: Confirmed as Extra Hint → 50/50 → GuilleAI by code review. Only manually observable when helperCount is 1 or 2 (TC-03, E2E-02).
- **OQ-03 (50/50 + GuilleAI interaction)**: If 50/50 is activated first, GuilleAI still correctly names the fake word (fake option was never disabled). Not a separate test case; covered by TC-08 + TC-05 used in sequence.
- Sound effects, animations, and accessibility (screen reader) are out of scope for this release.
- Browser compatibility below Chrome 120 / Firefox 121 is out of scope (Array.prototype.toSorted used in app.js requires Chrome 110+).
- Server-side scoring is unchanged and is not re-tested here.
