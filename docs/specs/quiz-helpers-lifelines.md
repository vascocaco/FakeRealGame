# Functional Specification: Quiz Helpers / Lifelines

**File**: `docs/specs/quiz-helpers-lifelines.md`
**Date**: 2026-05-22
**Status**: Draft

---

## 1. Overview

### Feature Name
Quiz Helpers — Lifelines for Solo and Multiplayer

### Goal / Business Objective
Increase player engagement and replayability by introducing quiz-show–style helpers ("lifelines") that players can use during a game to get assistance on difficult questions. Each helper offers a distinct kind of aid. The feature is available in both solo and multiplayer modes and is designed so that the number of helpers per game is configurable, allowing hosts and solo players to tune difficulty.

### Stakeholders / Personas Affected
- **Solo Player**: Configures and uses helpers during a single-player game.
- **Host (Multiplayer)**: Configures helpers for the room before the game starts.
- **Guest (Multiplayer)**: Views the configured helper settings and uses their own individual helper supply during the game.

---

## 2. Assumptions

1. The three helper types available in the MVP are: **50/50**, **GuilleAI Expert Help**, and **Extra Hint**. No other helper types are in scope for this release.
2. The maximum number of helpers per player per game equals the total number of distinct helper types (3). A cap higher than 3 is not possible in this MVP because there are only 3 types, and each type may be used at most once per game.
3. The default game configuration is **15 questions** and **3 helpers**.
4. Helpers are **per-player consumables** in multiplayer: each player has their own independent supply. Using a helper does not affect other players' helper supply or game state.
5. The existing `hint` field on each round object in `data.js` is the source of truth for the Extra Hint helper. No new data is needed for that helper.
6. The GuilleAI helper is a deterministic, frontend-only feature. No external API call is made; GuilleAI's response is computed from the round data already present on the client.
7. Solo game configuration (question count, helper count) replaces the current hardcoded `TOTAL_ROUNDS = 10` constant for any game started from the configured intro screen. The existing behaviour is otherwise unchanged.
8. Multiplayer game configuration (question count, helper count) is transmitted from the host to the server as part of the existing `start-game` event payload. The server uses those values when calling `buildGame(n)` and includes helper count in the `game-started` event payload.
9. The existing script load order in `index.html` must be preserved. Helper UI elements can be added to the existing `screen-game` section.
10. A player who has already answered a round may not activate a helper for that round.

---

## 3. User Stories

> As a **Solo Player**, I want to choose how many questions and helpers I get before I start so that I can adjust the challenge to my preference.

> As a **Solo Player**, I want to use the 50/50 helper to eliminate two wrong-looking options so that I have a better chance on a hard question.

> As a **Solo Player**, I want to ask GuilleAI for its expert opinion so that I get a confident recommendation on which word is the impostor.

> As a **Solo Player**, I want to reveal the hint early as a helper so that I can use that extra context before I commit to an answer.

> As a **Host**, I want to set the question count and helper count for my room so that I control the difficulty for all players.

> As a **Guest**, I want to see the room's configured question count and helper count in the waiting room so that I know what to expect before the game starts.

> As a **Player (Multiplayer)**, I want my helpers to be independent of other players' helpers so that my decision to use one does not affect anyone else's game.

> As a **Player** (solo or multiplayer), I want each helper type to be usable at most once per game so that I must choose wisely when to use them.

> As a **Player** (solo or multiplayer), I want to see which helpers I have already used so that I can manage my remaining supply at a glance.

---

## 4. Functional Requirements

### 4.1 Game Configuration — Solo Mode

**FR-01** — The system SHALL display a configuration panel on the solo intro screen that allows the player to set the number of questions (question count) before starting a solo game.

**FR-02** — The question count control SHALL allow integer values between 1 and the total number of available rounds in `ROUNDS` (inclusive).

**FR-03** — The system SHALL display a helper count control on the solo intro screen that allows the player to set how many helpers they receive per game.

**FR-04** — The helper count control SHALL allow integer values between 0 and 3 (inclusive), where 3 equals the total number of available helper types.

**FR-05** — The system SHALL default the question count to **15** and the helper count to **3** when the intro screen is first displayed.

**FR-06** — When the player starts a solo game, the system SHALL apply the configured question count and helper count for that game session.

### 4.2 Game Configuration — Multiplayer Mode

**FR-07** — The system SHALL display a question count control and a helper count control in the multiplayer waiting room, visible only to the **Host**.

**FR-08** — The Host's question count control SHALL allow integer values between 1 and the total number of available rounds in `ROUNDS` (inclusive).

**FR-09** — The Host's helper count control SHALL allow integer values between 0 and 3 (inclusive).

**FR-10** — The system SHALL default the question count to **15** and the helper count to **3** in the waiting room.

**FR-11** — The system SHALL display the currently configured question count and helper count as read-only values to **Guest** players in the waiting room.

**FR-12** — When the Host emits `start-game`, the payload SHALL include `{ questionCount: number, helperCount: number }`.

**FR-13** — The server SHALL pass `questionCount` to `buildGame(questionCount)` when constructing the game for that room.

**FR-14** — The server SHALL include `helperCount` in the `game-started` event payload so that all clients can initialise their helper supply.

**FR-15** — The server SHALL reject a `start-game` request if `questionCount` is not a positive integer or if `helperCount` is not an integer between 0 and 3, responding via the acknowledgement callback with `{ error: string }`.

### 4.3 Helper: 50/50

**FR-16** — The 50/50 helper, when activated by a player on the current round, SHALL permanently disable exactly **two** of the three non-fake options for that round.

**FR-17** — The two disabled options SHALL be selected at random from the set of non-fake options each time the helper is activated (so that the same round may show different eliminations across uses in different games).

**FR-18** — Disabled options SHALL be visually distinct from active options (e.g., greyed out) and SHALL NOT be selectable by the player for the remainder of that round.

**FR-19** — The fake option and exactly one remaining non-fake option SHALL remain selectable after 50/50 is activated.

**FR-20** — The system SHALL prevent 50/50 activation if the player has already answered the current round.

### 4.4 Helper: GuilleAI Expert Help

**FR-21** — The GuilleAI helper, when activated, SHALL display a panel or overlay attributed to "GuilleAI" that identifies one word as the most likely impostor in the current round.

**FR-22** — GuilleAI's identified word SHALL always be the actual fake word for that round (GuilleAI is authoritative and never wrong).

**FR-23** — The GuilleAI panel SHALL display a **confidence percentage** alongside its pick. The confidence value SHALL be a randomly selected integer between **65** and **95** (inclusive), generated at the moment of activation.

**FR-24** — The GuilleAI panel SHALL include a short, fixed attribution string, for example: *"GuilleAI analysed the category and is N% confident that '[word]' is the impostor."*

**FR-25** — The GuilleAI panel SHALL remain visible until the player dismisses it or the round ends, whichever comes first.

**FR-26** — The system SHALL prevent GuilleAI activation if the player has already answered the current round.

**FR-27** — GuilleAI SHALL operate entirely on the client using the round data already available in memory. No network request to any external service SHALL be made.

### 4.5 Helper: Extra Hint

**FR-28** — The Extra Hint helper, when activated, SHALL reveal the current round's `hint` text (the string stored in the `hint` field of the round object) to the player before they have answered.

**FR-29** — Once the Extra Hint is revealed, the hint text SHALL remain visible for the remainder of that round (it does not disappear if the player dismisses a panel).

**FR-30** — If a player uses Extra Hint and then answers correctly, the hint SHALL still appear in the normal post-answer feedback as it would for any round (no double-display penalty; the hint area is simply already visible).

**FR-31** — The system SHALL prevent Extra Hint activation if the player has already answered the current round.

### 4.6 Helper Availability and State Management

**FR-32** — At the start of a game, the system SHALL grant each player a number of helper slots equal to the configured `helperCount`, one slot per available helper type (50/50, GuilleAI, Extra Hint), up to the configured limit.

**FR-33** — When `helperCount` is 3, all three helper types SHALL be available. When `helperCount` is 2, exactly two of the three types SHALL be available. When `helperCount` is 1, exactly one type SHALL be available. When `helperCount` is 0, no helpers SHALL be available and no helper UI SHALL be displayed.

**FR-34** — The product recommendation for which helper types to include when `helperCount` is less than 3 is: **Extra Hint** first, **50/50** second, **GuilleAI** third (i.e., the most immediately useful helpers are included first). This ordering MAY be adjusted during planning.

**FR-35** — Each helper type may be used **at most once per game** per player, regardless of how many rounds remain.

**FR-36** — Once a helper has been used, the system SHALL mark it as spent and SHALL prevent the player from activating it again in the same game.

**FR-37** — The helper UI area SHALL clearly distinguish between: (a) helpers that are available and unused, (b) helpers that have been used (spent), and (c) helpers that are unavailable due to the current `helperCount` configuration.

**FR-38** — Helper state (used / not used) SHALL reset at the start of a new game. It SHALL NOT carry over between games or rematches.

**FR-39** — Helpers are disabled for the duration of the post-answer feedback phase. The helper UI MAY be hidden or visually locked while the feedback panel is shown.

### 4.7 Multiplayer-Specific Helper Behaviour

**FR-40** — Each connected player in a multiplayer room SHALL maintain their own independent helper state. A player activating a helper SHALL NOT affect any other player's helper supply or game view.

**FR-41** — Helper activations SHALL NOT be broadcast to other players. Other players SHALL NOT see when or which helper a teammate has used.

**FR-42** — The client SHALL apply helper effects (option disabling, GuilleAI panel, hint reveal) locally without emitting any new Socket.io events. No new server-side socket events are required for helper activation.

**FR-43** — Because helpers do not affect round outcomes or scoring calculations, the server scoring logic SHALL remain unchanged.

---

## 5. Acceptance Criteria

### Solo Configuration

**AC-01** — Given the solo intro screen is displayed, when the player has not changed any values, then the question count shows 15 and the helper count shows 3.

**AC-02** — Given the player sets the question count to 5 and helper count to 1 and starts the game, then the game runs for exactly 5 rounds and only one helper type is accessible during play.

**AC-03** — Given the player sets the helper count to 0 and starts the game, then no helper buttons or UI are displayed during the game.

### Multiplayer Configuration

**AC-04** — Given the Host is in the waiting room, when they change the question count to 8 and helper count to 2, then Guests in the same room see "8 questions, 2 helpers" displayed as read-only text.

**AC-05** — Given the Host clicks Start Game with question count = 8, then the game runs for exactly 8 rounds for all players.

**AC-06** — Given the Host submits a `start-game` event with `helperCount = 4`, then the server returns an error and does not start the game.

### Helper: 50/50

**AC-07** — Given a player activates 50/50 on a round, then exactly two non-fake options become non-selectable and visually different, while the fake option and one non-fake option remain selectable.

**AC-08** — Given a player has already submitted their answer for the current round, when they attempt to activate 50/50, then the helper does not activate (button is disabled or no effect occurs).

**AC-09** — Given a player has used 50/50 once in a game, then the 50/50 button is shown as spent for the remainder of that game.

### Helper: GuilleAI Expert Help

**AC-10** — Given a player activates GuilleAI on a round, then a panel appears identifying the correct fake word and displaying a confidence percentage between 65 and 95.

**AC-11** — Given a player activates GuilleAI on a round, then GuilleAI's identified word matches the word in the round data with `fake: true`.

**AC-12** — Given GuilleAI is active, when the player dismisses the panel, then the round options remain unchanged (GuilleAI does not alter which options are selectable).

**AC-13** — Given a player has already submitted their answer, when they attempt to activate GuilleAI, then the helper does not activate.

### Helper: Extra Hint

**AC-14** — Given a player activates Extra Hint before answering, then the hint text from the current round's `hint` field is displayed immediately.

**AC-15** — Given Extra Hint has been activated, when the player answers the round, then the hint text remains visible in the feedback panel (it is not hidden after activation).

**AC-16** — Given a player has already submitted their answer, when they attempt to activate Extra Hint, then the helper does not activate.

### Multiplayer Independence

**AC-17** — Given Player A activates 50/50 on Round 3, then Player B's view of Round 3 remains unaffected (all four options are still selectable for Player B).

**AC-18** — Given Player A has used all their helpers, then Player B's helper count is unchanged.

**AC-19** — Given a multiplayer rematch starts, then all players' helpers are reset to the configured `helperCount` for that new game.

---

## 6. Out of Scope

- Adding new helper types beyond the three defined in this specification (50/50, GuilleAI, Extra Hint).
- Configuring which specific helper types are included when `helperCount < 3` via the UI (the selection order is predefined per FR-34).
- Shared/room-level helpers where one player's activation affects all players' views.
- Helper usage analytics or persistence across sessions.
- Purchasing or unlocking helpers (all helpers within the configured count are freely available).
- Cooldown timers between helper uses within a single round.
- GuilleAI making a network request to any AI or external service.
- Sound effects or animations for helper activation (visual state changes are sufficient for MVP).
- Any changes to the server-side scoring algorithm.
- Changes to the post-game podium or leaderboard screens.

---

## 7. Open Questions

**OQ-01 — Helper subset ordering (FR-34)**: The predefined inclusion order (Extra Hint → 50/50 → GuilleAI) when `helperCount < 3` is a product recommendation. Stakeholder input is welcome before implementation to confirm or reorder this preference.

**OQ-02 — GuilleAI confidence UX**: FR-23 specifies a random integer between 65 and 95. Should the confidence be re-randomised each time GuilleAI is opened for the same round (if the player dismisses and re-opens), or fixed to the first generated value for that round? The safer, more testable behaviour is to fix it on first activation.

**OQ-03 — 50/50 with GuilleAI interaction**: If a player activates 50/50 first (two options eliminated), then activates GuilleAI, the GuilleAI panel still identifies the fake word correctly. If they activate GuilleAI first and then 50/50, the fake word is guaranteed to remain selectable (FR-19). This ordering is intentional but should be confirmed with QA before implementation.

**OQ-04 — Minimum player count to start multiplayer with helpers**: The existing spec (`multiplayer-backend-ready.md`) may define a minimum player count to start a game. That constraint is inherited here without change. No modification to start-game validation beyond FR-15 is intended.

**OQ-05 — Question count upper bound**: FR-02 and FR-08 reference the total number of rounds in the `ROUNDS` array (currently 12 entries in `data.js`). The default of 15 questions therefore exceeds the current data set. Either the default must be lowered to match available data, or `buildGame()` must be updated to allow repetition. This must be resolved before implementation begins.
