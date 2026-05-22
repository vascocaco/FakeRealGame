# Copilot Workspace Instructions

**Trust these instructions. Only search the codebase if information here is incomplete or appears to be incorrect.**

---

## Repository Summary

**FakeRealGame** is a browser-based word-guessing game ("Fake or Real — Spot the Impostor"). Players are shown a category with four words and must identify the one fake word. It supports both solo play and real-time multiplayer via Socket.io.

---

## Stack & Runtime

- **Language**: Vanilla JavaScript (ES6 IIFEs), HTML5, CSS3 — no TypeScript, no JSX.
- **Build system**: None. There is no `package.json`, no npm, no bundler, no transpiler, no build step.
- **Runtime**: Browser. No Node.js is required to run the frontend.
- **External CDN dependencies**:
  - Google Fonts (`Space Grotesk`, `JetBrains Mono`) — loaded in `index.html` `<head>`.
  - Socket.io client — loaded from `/socket.io/socket.io.js` (served dynamically by the backend server).
- **Multiplayer backend**: A Socket.io server is **required** for multiplayer but is **not included** in this repository. Multiplayer code (`lobby.js`, `multiplayer.js`) will fail without it.

---

## How to Run

### Solo mode (no server needed)
Open `index.html` directly in a browser, or serve the root directory with any static file server:
```bash
npx serve .           # requires Node.js; serves on http://localhost:3000
python -m http.server # Python 3; serves on http://localhost:8000
```
Solo mode is fully functional with no backend. Multiplayer buttons will fail silently without a Socket.io server.

### Multiplayer mode
Requires an external Socket.io server (not in this repo) that:
- Serves `index.html` and all static files.
- Provides `/socket.io/socket.io.js` at that path.
- Handles events: `create-room`, `join-room`, `start-game`, `leave-room`, `close-room`, `submit-answer`, and emits: `game-started`, `round-start`, `timer-tick`, `round-results`, `answer-progress`, `game-over`, `room-closed`, `player-joined`, `player-left`, `back-to-lobby`.

---

## Build, Lint, Test

- **No build required.** Changes to any `.js`, `.css`, or `.html` file take effect immediately on reload.
- **No linter is configured.** No `.eslintrc`, `.stylelintrc`, or similar config files exist.
- **No automated tests.** There is no test runner, no test files, and no `test` script.
- **No CI/CD pipelines.** There are no GitHub Actions workflows or any other pipeline configs.
- **Manual validation**: Open `index.html` in a browser and verify the game flow visually.

---

## Project Layout

```
index.html          Single-page app — all screens defined here (intro, lobby, waiting, game, results, podium)
styles.css          All styling (~850 lines); CSS custom properties used for theming
data.js             ROUNDS array (12 trivia rounds) + buildGame(n) function; dual-export: browser global + Node.js module.exports
app.js              Solo game logic (IIFE); manages state, score, streaks, rendering, and screen transitions
lobby.js            Multiplayer lobby UI + Socket.io room management; exposes window.gameSocket and window.lobbyShowScreen
multiplayer.js      Multiplayer in-game logic; consumes window.gameSocket set by lobby.js; handles timer, leaderboard, podium
README.md           Essentially empty — contains only "# FakeRealGame"
.github/
  copilot-instructions.md   This file
  agents/                   Agent definition files for the specialist AI team
```

### Script load order in `index.html` (must be preserved)
```html
<script src="/socket.io/socket.io.js"></script>  <!-- Must be first; CDN from server -->
<script src="data.js"></script>                  <!-- Defines ROUNDS, buildGame -->
<script src="app.js"></script>                   <!-- Solo game; calls buildGame() -->
<script src="lobby.js"></script>                 <!-- Sets window.gameSocket -->
<script src="multiplayer.js"></script>           <!-- Reads window.gameSocket -->
```

### Key data contract in `data.js`
Each round object: `{ category: string, options: [{ word: string, fake: boolean }], hint: string }`. Exactly one option per round must have `fake: true`. The `buildGame(n)` function randomly selects and shuffles `n` rounds.

---

## Agent Routing (Specialist AI Team)

This workspace has a specialist AI development team. Route requests to the appropriate agent.

| Agent | Responsibility |
|---|---|
| **Orchestrator** | Entry point for all new feature requests and multi-step work |
| **Product Owner** | Functional specs and requirements (`docs/specs/`) |
| **Planner** | Implementation plans and progress tracking (`docs/plans/`) |
| **Developer** | Code implementation from the plan |
| **QA Engineer** | Quality review, defect reporting, manual test guides (`docs/tests/`) |
| **Tech Writer** | Feature and architecture documentation (`docs/features/`, `docs/api/`, `README.md`) |

**Routing rules:**
- New feature/capability → **Orchestrator**
- Write spec/requirements → **Product Owner**
- Create plan/break down → **Planner**
- Implement/code/build (plan exists) → **Developer**
- Review/test/check quality → **QA Engineer**
- Document/write docs/update README → **Tech Writer**

Do not skip steps: specs → plans → implementation → QA → docs. Artifact locations: `docs/specs/`, `docs/plans/`, `docs/tests/`, `docs/features/`, `docs/api/`, `docs/user-guide/`, `docs/architecture/`. When in doubt, route to the **Orchestrator**.
