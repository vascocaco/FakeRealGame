# Implementation Plan: Public Deployment — "Play Anywhere"

**Feature**: Public Deployment — Make FakeRealGame Accessible on the Web  
**Spec**: [docs/specs/public-deployment.md](../specs/public-deployment.md)  
**Goal**: Deploy the existing unified Node.js application to a managed public host so any player can reach the game via a stable HTTPS URL.

---

## 0. Platform Decision (Resolved)

**Chosen platform: [Render](https://render.com)**

Rationale (consistent with user preferences — fastest setup, free tier, platform URL, unified architecture):
- Native Git integration: connect the GitHub repository once and Render auto-deploys on push.
- Free tier includes WebSocket support and automatic HTTPS — no extra configuration.
- Requires only a `render.yaml` file at the repo root; no Dockerfile, no CLI tooling, no manual SSH.
- `PORT` is injected as an environment variable automatically — the server already reads it.
- `/health` can be registered as the platform health-check URL directly in `render.yaml`, satisfying both FR-07 (app liveness) and Render's own restart/recovery mechanism (resolves OQ-3).

**Resolved open questions from the spec:**
- OQ-1 → Render (see above).
- OQ-2 → Free-tier idle sleep is accepted and will be documented in README (FR-15).
- OQ-3 → `/health` is the canonical health-check path registered in `render.yaml`.
- OQ-4 → No secrets or sensitive data exist in the repository; safe to connect to a public Render service. The game data (`data.js`) is already served to the client as-is in the local setup.

---

## 1. Feature Summary

The unified server (`server.js`) already handles static file serving, Socket.io, room management, and game logic. This plan covers the minimal additions required to make it publicly reachable and verifiably live: a `/health` endpoint, a `render.yaml` deployment descriptor, a one-time Render setup, live validation, and a README update.

---

## 2. Implementation Phases

### Phase 1 — Health Endpoint

Add the `/health` route to `server.js` **before** the static-file middleware so it is never shadowed by a file on disk.

- [x] In `server.js`, read `name` and `version` from `package.json` once at startup (use `require('./package.json')`).
- [x] Add a `GET /health` route that returns HTTP `200` with `Content-Type: application/json` and the body: `{ name, version, uptimeSeconds, timestamp }`.
  - `uptimeSeconds`: `Math.floor(process.uptime())`.
  - `timestamp`: current UTC ISO-8601 string (`new Date().toISOString()`).
- [x] Register the `/health` route before `app.use(express.static(...))` to prevent a file named `health` from ever intercepting it.
- [x] **Validation (local)**: Run `npm start`, then `curl http://localhost:3000/health` (or open in browser). Confirm response is HTTP 200, Content-Type is `application/json`, and all four fields are present with correct types.

---

### Phase 2 — Deployment Artifact

Create the Render configuration file that describes the service to the platform.

- [x] Create `render.yaml` at the repository root.
- [x] Declare one web service with:
  - `type: web`
  - `name`: `fakerealgame` (or preferred display name)
  - `runtime: node`
  - `buildCommand: npm install`
  - `startCommand: npm start`
  - `healthCheckPath: /health`
  - `plan: free`
- [x] Do **not** hard-code `PORT` or any environment-specific value in `render.yaml`; the platform injects `PORT` automatically.
- [x] **Validation**: Review `render.yaml` — confirm no port numbers, no secrets, no absolute paths are present (FR-11).

---

### Phase 3 — Render Service Setup & First Deploy

One-time setup through the Render dashboard.

- [ ] Push all current changes (Phase 1 and Phase 2 commits) to the GitHub remote.
- [ ] Log in to [render.com](https://render.com) and create a new **Web Service**.
- [ ] Connect the GitHub repository (`vascocaco/FakeRealGame`).
- [ ] Confirm Render auto-detects `render.yaml` and populates build/start commands.
- [ ] Trigger the first deploy (Render runs `npm install` then `npm start`).
- [ ] Wait for the deploy to reach status **Live**; note the assigned public URL (e.g., `https://fakerealgame.onrender.com`).
- [ ] **Validation**: In the Render dashboard, confirm the deploy log shows `Server listening on port <PORT>` (or equivalent startup message) with no unhandled errors.

---

### Phase 4 — Deployment Validation

Verify all functional requirements are met against the live public URL.

- [ ] **FR-03 / FR-12 — Frontend reachable**: Open the public URL in a browser. Confirm the intro screen loads, fonts render, and the browser console shows no resource-loading errors and no WebSocket connection errors.
- [ ] **FR-04 / FR-14 — Socket.io client served**: Confirm `<public-url>/socket.io/socket.io.js` returns a JavaScript file (HTTP 200).
- [ ] **FR-07 / FR-14 — Health endpoint live**: Send `GET <public-url>/health`. Confirm HTTP 200, `Content-Type: application/json`, and body contains `name`, `version`, `uptimeSeconds` (number), `timestamp` (ISO-8601 string).
- [ ] **FR-13 — End-to-end multiplayer**: Using two devices on **separate networks** (e.g., one on Wi-Fi, one on mobile data):
  - Device A opens the public URL → creates a room → copies the room code.
  - Device B opens the same public URL → enters the room code → appears in Device A's player list.
  - Host starts the game → both devices play at least one full round → scores and results display correctly on both devices.
- [ ] Record the confirmed public URL for use in Phase 5.

---

### Phase 5 — README Update

Bring first-release documentation up to date (FR-15).

- [ ] Update `README.md` to include:
  - **Live URL**: The confirmed public URL from Phase 4.
  - **How to play**: Two-sentence description — open the URL, create or join a room with a code.
  - **First-release limitations** (plain language):
    - Free-tier idle sleep: the service pauses after ~15 minutes of inactivity; the first request after idle may take 30–60 seconds to respond while the instance wakes.
    - Single instance: all players share one server; no horizontal scaling.
    - No session persistence: if the server restarts, all active rooms are lost and players must create new rooms.
- [ ] **Validation**: Read the updated README as a new player would. Confirm the URL is clickable and the limitations section is findable without scrolling past a wall of technical content.

---

## 3. Dependencies & Risks

| # | Item | Type | Mitigation |
|---|------|------|------------|
| D-1 | Phase 1 must be complete and passing locally before Phase 2 is created; Phase 2 must be committed before Phase 3 can run. | Sequencing dependency | Strict phase order. |
| D-2 | Render free-tier services sleep after ~15 minutes of inactivity. WebSocket connections from sleeping clients will fail until the instance wakes. | Known limitation | Document in README (FR-15); communicate to players. Not a defect. |
| D-3 | The GitHub repository must be accessible to Render (public repo, or a Render GitHub App installation on a private repo). | Access dependency | The `package.json` already references `https://github.com/vascocaco/FakeRealGame` — confirm visibility before Phase 3. |
| D-4 | The `render.yaml` `healthCheckPath` requires the `/health` endpoint to respond within Render's timeout window (~30 s on free tier) even on cold start. Since the endpoint is lightweight and registered before static middleware, this is very unlikely to be an issue, but should be confirmed in Phase 3 deploy logs. | Low risk | Check deploy logs for health-check timeout errors. |
| R-1 | If the Render free plan policy changes (e.g., WebSocket support removed), the platform choice must be revisited. Railway and Fly.io are drop-in alternatives with equivalent Node.js support. | External risk | No action needed for first release. |

---

## 4. Next Steps

1. **Developer**: Implement the `/health` endpoint in `server.js` (Phase 1) and verify it locally.
2. **Developer**: Create `render.yaml` at the repo root (Phase 2) and commit both changes together.
3. **Developer / Operator**: Push to GitHub and complete the one-time Render setup (Phase 3).
4. **Developer / Operator**: Run the four validation checks in Phase 4 against the live URL.
5. **Developer / Tech Writer**: Update `README.md` with the confirmed public URL and limitations section (Phase 5).

---

## 5. Progress Log

**2026-05-22** — Plan created. All phases defined. Platform choice (Render) confirmed and rationale documented. All four spec open questions resolved. Phases 1–5 ready for Developer handoff.
**2026-05-22** — Completed: Phase 1 health endpoint tasks. Added `/health` in `server.js`, sourced app metadata from `package.json`, and verified the route returns the expected JSON shape before static middleware.
**2026-05-22** — Completed: Phase 2 deployment artifact tasks. Added root `render.yaml` for a free Render web service using `npm install`, `npm start`, and `/health` for health checks.
**2026-05-22** — Progress note: README deployment guidance was prepared without a live URL. External Render setup and post-deploy URL verification remain manual.
**2026-05-22** — Completed: Public deployment QA follow-up for Node runtime pinning. Added a `package.json` `engines.node` constraint of `>=18` so managed Node hosts use the supported runtime declared by the feature docs.
