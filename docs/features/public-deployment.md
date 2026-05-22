# Public Deployment — Play Anywhere

## Overview

FakeRealGame can be deployed as a publicly accessible web service so that any player with a browser and a link can join a multiplayer game from anywhere on the internet — no local server, no LAN, no tunnelling required. The deployment target is [Render](https://render.com), a managed hosting platform that provides automatic HTTPS, native WebSocket support, and GitHub-integrated deploys on the free tier.

The repository is fully deployment-ready: the server-side additions (health endpoint, `render.yaml` blueprint, Node version constraint) are implemented and QA-passed. The only remaining step is a one-time manual setup in the Render dashboard. Once connected, Render auto-deploys on every push to the repository.

---

## Current State

| Phase | Status |
|---|---|
| `/health` endpoint added to `server.js` | Complete |
| `render.yaml` deployment blueprint created | Complete |
| `package.json` `engines.node` constraint added | Complete |
| README updated with deployment guidance | Complete (live URL pending) |
| Render Web Service created and connected | **Not yet done — manual step required** |
| Live URL confirmed and inserted into README | **Pending — requires Render setup first** |

---

## How It Works

### Serving the application

`server.js` is a single Node.js process that handles both the static frontend and the Socket.io backend. On startup it:

1. Reads `name` and `version` from `package.json` once (used by the health endpoint).
2. Registers `GET /health` **before** `express.static(...)` so a file named `health` can never shadow it.
3. Serves all static files (`index.html`, `styles.css`, all `.js` files, and the Socket.io client at `/socket.io/socket.io.js`) from the repository root via `express.static(path.resolve(__dirname))`.
4. Manages Socket.io rooms and game state in memory.

The port is read from `process.env.PORT` with a fallback of `3000`. Render injects `PORT` automatically; no configuration is needed to make port binding work on the platform.

### Health endpoint

`GET /health` returns HTTP `200 OK` with `Content-Type: application/json` and the following body:

```json
{
  "name": "fakerealgame",
  "version": "1.0.0",
  "uptimeSeconds": 42,
  "timestamp": "2026-05-22T10:00:00.000Z"
}
```

| Field | Type | Source |
|---|---|---|
| `name` | string | `package.json` `name` field |
| `version` | string | `package.json` `version` field |
| `uptimeSeconds` | integer | `Math.floor(process.uptime())` |
| `timestamp` | ISO-8601 UTC string | `new Date().toISOString()` |

The endpoint requires no authentication. It is also registered as the platform health-check path in `render.yaml`, so Render uses it to determine whether the service is up and to trigger restarts if it becomes unreachable.

### Deployment configuration (`render.yaml`)

The `render.yaml` file at the repository root is a Render [Infrastructure as Code](https://render.com/docs/infrastructure-as-code) blueprint. Render reads it automatically when the repository is connected.

```yaml
services:
  - type: web
    name: fakerealgame
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /health
```

No port numbers, secrets, or environment-specific values are hard-coded. `PORT` is injected by the platform at runtime.

### Node.js version

`package.json` declares `"engines": { "node": ">=18" }`. Render honours this constraint and selects a compatible Node.js version for the build and runtime environments.

---

## Key Components

| Component | File | Responsibility |
|---|---|---|
| HTTP + Socket.io server | `server.js` | Serves all static assets, the Socket.io endpoint, and the `/health` route |
| Health endpoint | `server.js` (lines ~22–30) | Returns liveness signal with app metadata and uptime |
| Static file serving | `server.js` | `express.static` serves `index.html`, `styles.css`, all `.js` files |
| Deployment blueprint | `render.yaml` | Declares the Render web service: runtime, build command, start command, health-check path |
| Dependency manifest | `package.json` | Declares runtime dependencies (`express`, `socket.io`) and the `start` script (`node server.js`) |

---

## Data Flow

```
Browser (any network)
  │
  ▼ HTTPS (Render terminates TLS)
Render Web Service
  │
  ▼ HTTP
server.js (Node.js process, PORT from env)
  ├── GET /health          → JSON liveness response
  ├── GET /socket.io/…     → Socket.io client script
  ├── GET /                → index.html
  ├── GET /styles.css      → stylesheet
  ├── GET /app.js, etc.    → game scripts
  └── WebSocket upgrade    → Socket.io room & game events (in-memory state)
```

All game state (rooms, player lists, scores) lives in memory in `server.js`. There is no external database or cache.

---

## Manual Steps Still Required

The following steps must be completed by the operator **outside this repository** to make the service publicly reachable:

1. **Push the repository to GitHub** — confirm the `main` branch includes `render.yaml`, the updated `server.js`, and `package.json`.
2. **Log in to [render.com](https://render.com)** and create a new **Web Service**.
3. **Connect the GitHub repository** (`vascocaco/FakeRealGame`). Render will detect `render.yaml` and pre-fill the build and start commands.
4. **Trigger the first deploy** — Render runs `npm install` then `npm start`. Wait for deploy status to reach **Live**.
5. **Note the assigned public URL** (e.g., `https://fakerealgame.onrender.com`).
6. **Validate the deployment** using the checks in [docs/tests/manual-test-public-deployment.md](../tests/manual-test-public-deployment.md) — frontend load, `/health` response, Socket.io client, and end-to-end multiplayer across two separate networks.
7. **Insert the confirmed URL** into `README.md` in the `Public Deployment › Live URL` line.

After step 7, subsequent deploys happen automatically whenever changes are pushed to the connected branch.

---

## Configuration & Dependencies

| Item | Value | Notes |
|---|---|---|
| Hosting platform | [Render](https://render.com) | Free tier; Git-integrated; WebSocket-capable |
| Node.js version | `>=18` | Declared in `package.json` `engines` |
| Runtime dependencies | `express ^5.2.1`, `socket.io ^4.8.3` | Installed by `npm install` during Render build |
| Port binding | `process.env.PORT \|\| 3000` | `PORT` injected automatically by Render |
| Health-check path | `/health` | Registered in `render.yaml` and in `server.js` |
| TLS / HTTPS | Managed by Render | No certificate management required in the app |
| Environment variables | None required beyond `PORT` | No secrets, API keys, or config vars needed |

---

## Known Limitations

These are documented limitations of the first release, not defects:

- **Free-tier idle sleep**: After approximately 15 minutes with no incoming traffic, Render pauses the service instance. The first request after idle can take 30–60 seconds while the instance wakes. WebSocket connections established during this window will fail until the server is ready.
- **Single instance**: All players share one Node.js process. There is no load balancing or horizontal scaling in this release. Adding Socket.io adapter support (e.g., Redis adapter) would be required before multi-instance deployment.
- **No session persistence**: If the server restarts (e.g., after a deploy or an idle-sleep wake cycle), all active rooms and in-progress games are lost. Players must create new rooms.
- **No custom domain**: The public URL is platform-assigned (e.g., `https://fakerealgame.onrender.com`). A branded domain is out of scope for this release.
- **No CI/CD pipeline**: Render auto-deploys on push to the connected branch, but there are no pre-deploy checks, staged environments, or rollback automation.

---

## Related Documents

| Document | Purpose |
|---|---|
| [docs/specs/public-deployment.md](../specs/public-deployment.md) | Functional requirements and acceptance criteria |
| [docs/plans/plan-public-deployment.md](../plans/plan-public-deployment.md) | Implementation phases and progress log |
| [docs/tests/manual-test-public-deployment.md](../tests/manual-test-public-deployment.md) | Step-by-step validation test cases |
| [docs/features/multiplayer.md](./multiplayer.md) | Multiplayer system: rooms, Socket.io events, scoring |
| [docs/specs/multiplayer-backend-ready.md](../specs/multiplayer-backend-ready.md) | Socket.io protocol and server behaviour spec |
