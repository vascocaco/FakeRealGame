# FakeRealGame

**Fake or Real — Spot the Impostor.** A browser-based word-guessing game where players identify the one fake word hidden among real ones. Supports solo play and real-time multiplayer.

---

## Quick Start

### Solo mode (no server needed)

Open `index.html` directly in a browser, or serve the root directory with any static file server:

```bash
# Python 3
python -m http.server 8000

# Node.js (npx)
npx serve .
```

### Multiplayer mode

Requires Node.js ≥ 18.

```bash
npm install
npm start
```

Server starts at `http://localhost:3000` (override with the `PORT` environment variable).  
Open two or more browser windows at that address and click **Multiplayer** to create or join a room.

---

## How to Play

1. **Solo**: Click **Solo Play** on the intro screen. Each round shows a category and four words — pick the fake one before time runs out.
2. **Multiplayer**: One player creates a room and shares the 6-character code. Others join with that code. The host starts the game when everyone is ready. All players see the same rounds simultaneously with a shared 15-second countdown. Scores accumulate across 5 rounds; a podium is shown at the end.

---

## Project Structure

| File | Purpose |
|---|---|
| `index.html` | Single-page app — all screens (intro, lobby, waiting, game, results, podium) |
| `styles.css` | All styling; uses CSS custom properties for theming |
| `data.js` | `ROUNDS` array (12 trivia rounds) and `buildGame(n)` function; dual-export (browser global + `module.exports`) |
| `app.js` | Solo game logic (IIFE) |
| `lobby.js` | Multiplayer lobby UI and Socket.io room management |
| `multiplayer.js` | Multiplayer in-game logic; reads `window.gameSocket` set by `lobby.js` |
| `server.js` | Node.js + Socket.io server for multiplayer; serves static files |
| `package.json` | Runtime dependencies (`express`, `socket.io`) and `npm start` script |

---

## Multiplayer Feature

See [docs/features/multiplayer.md](docs/features/multiplayer.md) for a full description of the multiplayer system: room lifecycle, game flow, scoring rules, Socket.io event reference, and known limitations.

---

## Development Notes

- **No build step.** Changes to any `.js`, `.css`, or `.html` file take effect on browser reload.
- **No automated tests.** See [docs/tests/manual-test-multiplayer-backend.md](docs/tests/manual-test-multiplayer-backend.md) for the manual test guide.
- **State is in-memory.** Restarting the server clears all active rooms.