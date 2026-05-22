# Implementation Plan: Quiz Helpers / Lifelines

**Feature**: Quiz Helpers — Lifelines for Solo and Multiplayer  
**Spec**: [docs/specs/quiz-helpers-lifelines.md](../specs/quiz-helpers-lifelines.md)  
**Goal**: Add three one-use-per-game helpers (50/50, GuilleAI, Extra Hint) to both solo and multiplayer modes, with configurable question count and helper count before each game.

---

## 1. Feature Summary

Players can choose up to three helpers per game. Each helper type may be used at most once. Solo players configure question count and helper count on the intro screen. In multiplayer, the Host configures both values before starting; Guests see them as read-only. Helpers are per-player consumables in multiplayer — no new socket events are emitted when a helper is activated.

The current `ROUNDS` array in `data.js` contains 12 entries, but the default question count is 15. This gap must be closed first, by adding new round data (not by repeating rounds), before any other work begins.

**Open questions resolved for planning purposes:**

- **OQ-02 (GuilleAI confidence)**: Confidence is generated once on first activation and fixed for the remainder of that round. Re-opening the panel shows the same value.
- **OQ-03 (50/50 + GuilleAI interaction)**: Intentional by design; no special handling needed. Confirmed for QA to validate.
- **OQ-05 (data gap)**: Resolved by adding new rounds to `data.js` (this plan's Phase 1).

---

## 2. Implementation Phases

### Phase 1 — Data Expansion *(prerequisite for all other phases)*

- [ ] Add at least **8 new round objects** to the `ROUNDS` array in `data.js`, bringing the total to **≥ 20**, so that `buildGame(15)` can draw from a meaningful randomisation pool.
  - Each new round must follow the existing data contract: `{ category: string, options: [{ word: string, fake: boolean }], hint: string }`.
  - Exactly one option per round must have `fake: true`.
  - The `hint` string must be non-empty (it is used by the Extra Hint helper).
- [ ] Update the `buildGame(n)` default parameter from `10` to `15`.
- [ ] Add a guard inside `buildGame(n)`: if `n > ROUNDS.length`, clamp `n` to `ROUNDS.length` before slicing, so the function never silently returns fewer rounds than expected.
- [ ] **Validation**: Call `buildGame(15)` in the browser console and confirm it returns exactly 15 distinct round objects, each with a non-empty `hint`.

---

### Phase 2 — Shared Helper Module

- [ ] Create `helpers.js` in the project root as a self-contained IIFE that exposes a single `window.Helpers` object.
- [ ] `window.Helpers` must expose the following API (names are suggestions; Developer may adjust):
  - `init(helperCount)` — initialises helper state for a new game given the configured count; returns the ordered list of active helper type keys (using the priority order: Extra Hint → 50/50 → GuilleAI, per FR-34).
  - `canActivate(typeKey)` — returns `true` if the helper is available and has not been spent.
  - `markSpent(typeKey)` — marks the helper as used for the current game.
  - `isSpent(typeKey)` — returns `true` if already used.
  - `reset()` — clears all state; called at the start of each new game or rematch.
  - `getActiveTypes()` — returns the ordered array of helper type keys enabled for the current game.
- [ ] The module must not depend on DOM or socket state; it is pure state management.
- [ ] Add `<script src="helpers.js"></script>` to `index.html` **after** `data.js` and **before** `app.js`. Preserve the existing load order for all other scripts.
- [ ] **Validation**: Open the browser console and manually call `Helpers.init(2)`, confirm it returns `['extra-hint', '50-50']`; call `Helpers.markSpent('50-50')`, confirm `Helpers.isSpent('50-50')` returns `true`.

---

### Phase 3 — Solo Configuration UI

- [ ] Add a configuration panel to the `#screen-intro` section in `index.html` containing:
  - A labelled numeric input (or stepper) for **question count**, with `min="1"` and `max` bound dynamically to `ROUNDS.length`.
  - A labelled numeric input (or stepper) for **helper count**, with `min="0"` and `max="3"`.
  - Default values: question count = `15`, helper count = `3` (FR-05).
- [ ] Add CSS rules in `styles.css` for the configuration panel, consistent with the existing visual language (CSS custom properties, `Space Grotesk` font, etc.).
- [ ] In `app.js`, replace the hardcoded `const TOTAL_ROUNDS = 10` with logic that reads the question count input value when the Start button is clicked (FR-06).
- [ ] In `app.js`, read the helper count input value on Start and pass it to `Helpers.init(helperCount)` before the game begins.
- [ ] **Validation**: Set question count = 5, helper count = 1, start the game. Confirm the game runs for exactly 5 rounds and only one helper button is rendered.

---

### Phase 4 — Helper UI (Shared Game Screen)

- [ ] Add a helper button container element to the `#screen-game` section in `index.html`. It must sit inside the existing game screen structure without altering the script load order or any existing element IDs.
- [ ] Add three button elements inside the container, one per helper type, each with a stable `id` attribute and a `data-helper-type` attribute (`"50-50"`, `"guilleai"`, `"extra-hint"`).
- [ ] Add CSS in `styles.css` for three distinct visual states on each helper button:
  - **Available** — normal, interactive appearance.
  - **Spent** — visually muted (e.g., greyed out, strikethrough or icon change), pointer-events disabled.
  - **Hidden** — `display: none` when the helper type is not active for the current `helperCount` configuration (FR-37).
- [ ] Add a dismissible GuilleAI panel element (e.g., a modal or overlay card) to `#screen-game` in `index.html`, initially hidden. It must contain placeholder elements for: the attributed message string, the confidence value, and a dismiss button.
- [ ] **Validation**: Inspect the DOM. Confirm helper buttons render, states toggle correctly when CSS classes are applied manually in DevTools, and the GuilleAI panel shows/hides as expected.

---

### Phase 5 — Helper Logic: 50/50 (Solo)

- [ ] In `app.js`, attach a click handler to the 50/50 helper button.
- [ ] On activation:
  - Guard: if `state.answered` is `true` or `Helpers.isSpent('50-50')` is `true`, do nothing (FR-20, FR-36).
  - Identify the two non-fake options in the current round (from `state.rounds[state.index].options`).
  - Randomly select exactly two of the three non-fake options to disable.
  - Apply a CSS class (e.g., `option--disabled`) to their rendered DOM elements to make them visually distinct and non-selectable (FR-18).
  - Prevent those option elements from emitting click events for the remainder of the round.
  - Call `Helpers.markSpent('50-50')` and update the button's visual state to **spent** (FR-36).
- [ ] Ensure that when the next round renders, all option elements are re-rendered without any disabled classes (the disabled state is per-round, not persistent across rounds).
- [ ] **Validation**: Activate 50/50 mid-round. Confirm exactly two non-fake options are greyed out and unclickable, the fake option and one non-fake option remain selectable. Confirm the button shows as spent. Advance to next round and confirm all options are active again.

---

### Phase 6 — Helper Logic: GuilleAI (Solo)

- [ ] In `app.js`, attach a click handler to the GuilleAI helper button.
- [ ] On activation:
  - Guard: if `state.answered` is `true` or `Helpers.isSpent('guilleai')` is `true`, do nothing (FR-26, FR-36).
  - Identify the fake word from `state.rounds[state.index].options` (the entry where `fake: true`).
  - Generate a confidence integer: `Math.floor(Math.random() * 31) + 65` (range 65–95 inclusive, per FR-23). Store this value in a local variable for the current round — do not re-randomise if the panel is dismissed and re-opened (OQ-02 resolution).
  - Populate the GuilleAI panel elements with the fake word and confidence value, using the attribution string from FR-24.
  - Show the GuilleAI panel.
  - Call `Helpers.markSpent('guilleai')` and update the button's visual state to **spent**.
- [ ] Attach a click handler to the GuilleAI panel's dismiss button to hide the panel.
- [ ] When a new round begins (or when the round ends), ensure the GuilleAI panel is hidden and the stored confidence value is cleared.
- [ ] **Validation (AC-10, AC-11, AC-12)**: Activate GuilleAI. Confirm the identified word matches the round's `fake: true` option. Confirm the displayed confidence is between 65 and 95. Dismiss the panel; confirm options are unchanged. Activate again (second click); confirm the helper does not re-activate (spent).

---

### Phase 7 — Helper Logic: Extra Hint (Solo)

- [ ] In `app.js`, attach a click handler to the Extra Hint helper button.
- [ ] On activation:
  - Guard: if `state.answered` is `true` or `Helpers.isSpent('extra-hint')` is `true`, do nothing (FR-31, FR-36).
  - Read `state.rounds[state.index].hint` and display it in the existing hint/feedback detail area (or a dedicated element), making it immediately visible before the player has answered (FR-28).
  - Set a flag (e.g., `state.hintRevealed = true`) so the round-end feedback renderer knows the hint is already shown and does not hide or re-display it (FR-30).
  - Call `Helpers.markSpent('extra-hint')` and update the button's visual state to **spent**.
- [ ] Ensure `state.hintRevealed` is reset to `false` at the start of each new round.
- [ ] **Validation (AC-14, AC-15)**: Activate Extra Hint before answering. Confirm the hint text appears immediately. Answer the round. Confirm the hint text remains visible in the feedback panel and is not duplicated.

---

### Phase 8 — Solo Integration & Edge Cases

- [ ] On new game start (`btn-restart` click or equivalent): call `Helpers.reset()` and re-initialise with the current config values (FR-38).
- [ ] During the post-answer feedback phase (while the feedback panel is visible and before `btn-next` is clicked): ensure all helper buttons are visually locked / non-interactive (FR-39). Restore interactivity (for unspent helpers) when the next round begins.
- [ ] When `helperCount` is `0`: confirm no helper buttons are rendered (FR-37, AC-03).
- [ ] When `helperCount` is `1` or `2`: confirm only the correct subset of buttons is visible, in priority order (Extra Hint first, then 50/50, then GuilleAI).
- [ ] **Validation (AC-01, AC-02, AC-03)**: Run the full solo flow with configurations: (15q / 3h), (5q / 1h), (8q / 0h). Confirm counts, helper availability, and reset behaviour are all correct.

---

### Phase 9 — Multiplayer Configuration

- [ ] In `index.html`, add Host-only controls to `#screen-waiting`:
  - Question count input (same constraints as FR-08: `min="1"`, `max` = `ROUNDS.length`).
  - Helper count input (FR-09: `min="0"`, `max="3"`).
  - Default values: 15 and 3 (FR-10).
  - These elements must be visible only when the current socket is the Host (controlled by `lobby.js`).
- [ ] In `index.html`, add Guest-only read-only display elements to `#screen-waiting` showing the current question count and helper count as plain text (FR-11).
- [ ] In `lobby.js`, when the local player is identified as Host, show the input controls and hide the read-only display; when Guest, do the reverse.
- [ ] In `lobby.js`, when the Host changes either input, emit a new or existing room-state event so Guests' displays update in real time — **or** defer the display until `game-started` (simpler; Guest sees values before the game begins via the `game-started` payload). Choose the simpler approach unless the spec explicitly requires live sync.
- [ ] In `lobby.js`, when the Host emits `start-game`, include `{ questionCount, helperCount }` in the payload (FR-12).
- [ ] In `server.js`, update the `start-game` handler:
  - Validate `questionCount`: must be a positive integer ≤ `ROUNDS.length`; reject with `{ error }` otherwise (FR-15).
  - Validate `helperCount`: must be an integer 0–3; reject with `{ error }` otherwise (FR-15).
  - Pass `questionCount` to `buildGame(questionCount)` when constructing rounds for the room (FR-13).
  - Include `helperCount` in the `game-started` event payload broadcast to all players in the room (FR-14).
- [ ] **Validation (AC-04, AC-05, AC-06)**: Open two browser tabs. Tab 1 = Host, Tab 2 = Guest. Change question count to 8, helper count to 2 on Host. Confirm Guest sees "8 questions, 2 helpers". Start game; confirm 8 rounds play out for both players. Attempt `start-game` with `helperCount = 4` via console; confirm server rejects with an error.

---

### Phase 10 — Multiplayer Helper Integration

- [ ] In `multiplayer.js`, in the `game-started` event handler, read `helperCount` from the payload and call `Helpers.init(helperCount)` to initialise the local player's helper state (FR-40).
- [ ] Wire the helper button click handlers in `multiplayer.js` using the same logic as the solo implementations in Phases 5–7, but operating on the round data received from the server (stored locally for the current round).
- [ ] Confirm that helper activations do not emit any new Socket.io events (FR-42). All effects are local to the activating player's client.
- [ ] On multiplayer rematch (when a `back-to-lobby` or equivalent restart flow is triggered and a new `game-started` event is received): call `Helpers.reset()` before calling `Helpers.init(helperCount)` with the new game's value (AC-19, FR-38).
- [ ] Ensure the post-answer feedback lock (FR-39) and the "already answered" guard (FR-20, FR-26, FR-31) work correctly in the multiplayer game loop (which is timer-driven, unlike solo).
- [ ] **Validation (AC-17, AC-18, AC-19)**: Open two browser tabs. Activate 50/50 on Round 1 in Tab 1. Confirm Tab 2's Round 1 options are unaffected. Use all helpers in Tab 1; confirm Tab 2's helper count is unchanged. Complete the game and start a rematch; confirm both players' helpers are reset.

---

## 3. Dependencies & Risks

### Sequencing Constraints

| Constraint | Detail |
|---|---|
| Phase 1 must complete before any testing | `buildGame(15)` returns only 12 rounds today. No downstream phase can be validated at 15q until data is added. |
| Phase 2 must complete before Phases 3–10 | `window.Helpers` is a shared dependency for both solo and multiplayer helper logic. |
| Phase 4 must complete before Phases 5–7 | Helper buttons and the GuilleAI panel must exist in the DOM before click handlers are attached. |
| Phases 3–8 (solo) should complete before Phase 10 (multiplayer) | Multiplayer re-uses the same helper logic; it is easier to validate helpers in the simpler solo context first. |
| Phase 9 must complete before Phase 10 | `helperCount` arrives via `game-started`; multiplayer helpers cannot be initialised without it. |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `#screen-game` layout breaks when helper buttons are added | Medium | Medium | Add helpers in a self-contained container; test at multiple viewport sizes. |
| GuilleAI panel overlaps options on small screens | Medium | Low | Design panel as an overlay or slide-in; avoid absolute positioning over the options grid. |
| 50/50 option-disabling conflicts with the existing click handler in `app.js` | Medium | High | Disable options by adding a class and checking for it inside the existing handler, rather than removing/re-adding listeners. |
| `buildGame(n)` with n > ROUNDS.length silently returns fewer rounds | High (current state) | High | Phase 1 clamp guard + data expansion eliminates this. Must be the first task completed. |
| Multiplayer `game-started` payload change is a breaking contract change if server is deployed | Low | High | Coordinate Phase 9 server changes with any live deployment. The `helperCount` field can be optional with a default of 3 on the client if needed. |
| OQ-01 (helper subset ordering) remains unconfirmed by stakeholder | Low | Low | Plan uses FR-34's recommended order (Extra Hint → 50/50 → GuilleAI). Update `Helpers.init()` ordering if stakeholder changes this before implementation. |

---

## 4. Next Steps

1. **Phase 1**: Add ≥ 8 new rounds to `data.js` and update `buildGame()` default + guard. This is the hard prerequisite for everything else.
2. **Phase 2**: Create `helpers.js` and the `window.Helpers` API; add the script tag to `index.html`.
3. **Phase 4**: Add helper button container and GuilleAI panel to `#screen-game` in `index.html` and stub out CSS states in `styles.css`.
4. **Phases 3 + 5–8**: Implement full solo flow (configuration UI + all three helper types).
5. **Phases 9–10**: Layer in multiplayer configuration and helper integration.

---

## 5. Validation Strategy Summary

Each phase includes its own inline validation checkpoint. The following acceptance criteria from the spec map to specific phases:

| AC | Phase |
|---|---|
| AC-01, AC-02, AC-03 | Phase 8 (solo integration) |
| AC-04, AC-05, AC-06 | Phase 9 (multiplayer configuration) |
| AC-07, AC-08, AC-09 | Phase 5 (50/50 solo) + Phase 10 (multiplayer) |
| AC-10, AC-11, AC-12, AC-13 | Phase 6 (GuilleAI solo) + Phase 10 |
| AC-14, AC-15, AC-16 | Phase 7 (Extra Hint solo) + Phase 10 |
| AC-17, AC-18, AC-19 | Phase 10 (multiplayer independence + rematch) |

Full end-to-end validation (solo and multiplayer) should be handed off to the QA Engineer after Phase 10 is complete.

---

## 6. Progress Log

**2026-05-22** — Completed: QA blocker cleanup for multiplayer lifelines. Removed concatenated legacy IIFEs from `lobby.js` and `multiplayer.js` so room creation, config sync, and helper listeners register once per page; aligned static question-count max values in `index.html` with the current round pool and simplified duplicated GuilleAI confidence presentation.

**2026-05-22** — Plan created. Spec reviewed. Data gap (12 rounds vs. 15-question default) identified and resolved by mandating Phase 1 data expansion. Open questions OQ-02, OQ-03, OQ-05 resolved for planning purposes. Phase sequencing, risks, and validation strategy documented.
