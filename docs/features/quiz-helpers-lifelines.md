# Quiz Helpers / Lifelines

## Overview

The Quiz Helpers feature adds three optional, one-use-per-game lifelines to both solo and multiplayer modes of FakeRealGame. Players can call on a helper when a round is difficult — eliminating options with **50/50**, getting a confident recommendation from **GuilleAI Expert Help**, or peeking at the round's teaching hint early with **Extra Hint**.

The number of helpers each player receives is configurable. Solo players set both the question count and helper count on the intro screen before starting. In multiplayer, the room Host controls those values in the waiting room; Guests see the settings as read-only. Helpers are per-player consumables in multiplayer — one player using a helper has no effect on any other player's game.

The default game configuration is **15 questions** and **3 helpers** (one of each type). The generated question database currently contains 300 rounds across 30 categories.

---

## How It Works

### Solo flow

1. The intro screen (`#screen-intro`) shows a configuration panel with two inputs: **Questions** (default: 15) and **Helpers** (default: 3). Both are number inputs with enforced min/max bounds; `app.js` re-clamps them on start if the user types an out-of-range value.
2. When the player clicks **Start**, `app.js` reads both inputs, calls `Helpers.init(helperCount)` from the shared `helpers.js` module, then calls `buildGame(questionCount)` to construct the shuffled round set.
3. During the game, the helper bar (`#helper-bar`) renders only the buttons for active helper types. If `helperCount` is 0, the bar is hidden entirely.
4. On each new round, `app.js` resets per-round state (`hintRevealed`, `guilleAiConfidence`) and re-renders the helper bar as unlocked.
5. When the player submits an answer, the helper bar is locked (buttons disabled) for the duration of the post-answer feedback phase.
6. On game restart, `Helpers.reset()` is called before `Helpers.init()` so spent helpers are cleared.

### Multiplayer flow

1. After a room is created or joined, the waiting screen (`#screen-waiting`) shows configuration controls. The Host sees editable inputs; Guests see a read-only summary line (e.g., *"15 questions, 3 helpers"*) populated by `lobby.js`.
2. When the Host clicks **Start Game**, `lobby.js` reads both input values and includes them in the `start-game` Socket.io event payload as `{ questionCount, helperCount }`.
3. `server.js` validates both values (see [Server-side validation](#server-side-validation)), calls `buildGame(questionCount)` to generate the round set, and broadcasts `game-started` to all players in the room with `{ totalRounds, helperCount }` in the payload.
4. Each client's `multiplayer.js` handles `game-started`, calls `Helpers.reset()` then `Helpers.init(helperCount)`, and enters game mode.
5. Helper button click handlers in `multiplayer.js` mirror the solo UX, but request helper effects from the server with `request-helper` so answer-bearing data is not sent in the public `round-start` payload.
6. Helper activations are per-player and server-authorized in multiplayer. The server marks helpers spent, returns only the requested helper effect to that player, and removes speed bonus eligibility for that round.
7. On multiplayer rematch, when a new `game-started` event is received, helpers are reset and re-initialised with the new game's `helperCount`.

---

## The Three Helpers

### 50/50

Eliminates exactly two of the three non-fake options for the current round, chosen at random. The fake word and one non-fake word remain selectable. Eliminated buttons receive the `option--disabled` CSS class and are disabled; the class is removed when the next round renders.

- Cannot be activated after the player has already answered the current round.
- Once used, the button enters the **spent** state and cannot be activated again in the same game.

### GuilleAI Expert Help

Opens a dismissible panel that identifies the fake word and displays a confidence percentage. GuilleAI always identifies the correct fake word (`fake: true` from round data). The confidence is a randomly generated integer between 65 and 95 (inclusive), fixed at the moment of activation — reopening the panel (if re-implementation allowed) would show the same value.

Attribution string: *"GuilleAI analysed the category and is N% confident that '[word]' is the impostor."*

The panel closes when the player clicks **Dismiss** or when the next round begins. Dismissing the panel does not alter which options are selectable.

- Cannot be activated after the player has already answered the current round.
- GuilleAI does not call an external API; solo uses local round data and multiplayer uses server-held round data.

### Extra Hint

Reveals the current round's `hint` field (from `data.js`) before the player has answered. The hint text is displayed immediately and remains visible through the post-answer feedback phase — it does not disappear or duplicate when the round ends.

- Cannot be activated after the player has already answered the current round.
- A `hintRevealed` flag in game state tells the feedback renderer the hint is already showing, preventing a redundant update.

---

## Helper Priority Order

When `helperCount` is less than 3, the `Helpers.init()` function grants the first `helperCount` types from a fixed priority list:

| Priority | Type key | Helper |
|----------|----------|--------|
| 1 | `extra-hint` | Extra Hint |
| 2 | `50-50` | 50/50 |
| 3 | `guilleai` | GuilleAI Expert Help |

For example, `helperCount = 1` grants only Extra Hint; `helperCount = 2` grants Extra Hint and 50/50.

---

## Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| Shared helper state | `helpers.js` | IIFE exposing `window.Helpers`; tracks active types and spent state; no DOM or socket dependency |
| Solo configuration UI | `index.html` (`#screen-intro`) | Question count and helper count inputs |
| Solo game logic | `app.js` | Reads config, initialises helpers, wires click handlers, applies helper effects |
| Multiplayer waiting room UI | `index.html` (`#screen-waiting`) | Host editable inputs; Guest read-only summary |
| Multiplayer lobby logic | `lobby.js` | Shows/hides host vs. guest config panels; includes `questionCount` and `helperCount` in `start-game` payload |
| Multiplayer game logic | `multiplayer.js` | Handles `game-started` payload, initialises helpers, requests multiplayer helper effects from the server |
| Server validation & game construction | `server.js` | Validates both config values, calls `buildGame(questionCount)`, includes `helperCount` in `game-started` |
| Round data | `data.js` | 300-entry generated `ROUNDS` array; `buildGame(n)` with clamping guard |
| Helper bar UI | `index.html` (`#screen-game`) | `#helper-bar` container; three buttons; GuilleAI panel overlay |
| Styling | `styles.css` | `.helper-btn--spent`, `.helper-btn--hidden`, `.option--disabled`, GuilleAI panel styles |

---

## Data Flow

```
Solo start
  └── app.js reads inputs
        ├── Helpers.init(helperCount)      → window.Helpers state
        └── buildGame(questionCount)       → state.rounds[]

Each round render
  └── app.js: updateHelperButtons(locked=false)
        └── Helpers.getActiveTypes() + Helpers.isSpent()  → button classes/disabled

Helper activation (solo example — 50/50)
  └── app.js: activateFiftyFifty()
        ├── Guard: state.answered? || !Helpers.canActivate('50-50')
        ├── Randomly disable 2 non-fake option buttons (option--disabled)
        └── Helpers.markSpent('50-50')  → updateHelperButtons()

Player answers
  └── app.js: onAnswer()
        └── updateHelperButtons(locked=true)   → all buttons disabled

Multiplayer start
  Host lobby.js ──start-game──▶ server.js
                                  ├── parseQuestionCount / parseHelperCount (validate)
                                  ├── buildGame(questionCount) → rounds[]
                                  └── emit game-started { totalRounds, helperCount }
                                        └── multiplayer.js: Helpers.reset() + Helpers.init(helperCount)
```

---

## Server-side Validation

`server.js` validates both fields on the `start-game` event before building the game:

| Field | Valid range | Error response |
|-------|-------------|----------------|
| `questionCount` | Integer, 1 to `ROUNDS.length` (currently 300) | `{ error: "questionCount must be an integer between 1 and 300" }` |
| `helperCount` | Integer, 0 – 3 | `{ error: "helperCount must be an integer between 0 and 3" }` |

Invalid payloads return an error via the acknowledgement callback and do not start the game.

---

## Configuration & Dependencies

| Item | Detail |
|------|--------|
| Default question count | 15 |
| Default helper count | 3 |
| Maximum question count | `ROUNDS.length` (currently 300) |
| Maximum helper count | 3 (MVP cap — equals the number of available helper types) |
| `helpers.js` load position | After `data.js`, before `app.js` (see `index.html` script order) |
| External services | None — GuilleAI is fully client-side |
| New Socket.io events | None — helpers emit no events |

### Script load order (relevant excerpt)

```html
<script src="/socket.io/socket.io.js"></script>
<script src="data.js"></script>
<script src="helpers.js"></script>   <!-- NEW -->
<script src="app.js"></script>
<script src="lobby.js"></script>
<script src="multiplayer.js"></script>
```

---

## Known Limitations

- **Helper count cap is 3.** The cap is a product of the MVP having exactly three helper types. Raising `helperCount` above 3 would require adding new helper types.
- **GuilleAI confidence is not reproducible.** The confidence value is generated randomly each time GuilleAI is activated in a new game. There is no seed or replay mechanism.
- **50/50 elimination is random per activation.** Two different games on the same round may eliminate different non-fake options. This is intentional by design.
- **Helpers are disabled mid-round after answering.** The lock applies for the entire feedback phase; there is no way to activate a helper after submitting an answer.
- **Multiplayer guest config display is not live-synced.** Guests see the configured values reflected in the `game-started` event payload, not in real time as the Host edits the inputs. The summary shown in the waiting room is updated when the Host joins or when `player-joined` events update the UI. If the Host changes values just before starting, Guests will see the correct values when the game begins.
- **No helper for tiebreakers or bonus rounds.** Helpers apply only to standard game rounds.
