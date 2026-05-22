# Functional Specification: Public Deployment — "Play Anywhere"

**File**: `docs/specs/public-deployment.md`
**Date**: 2026-05-22
**Status**: Draft

---

## 1. Overview

### Feature Name
Public Deployment — Make FakeRealGame Accessible on the Web

### Goal / Business Objective
FakeRealGame currently runs only on `localhost`. Multiplayer requires all players to be on the same local network — or one player to manage tunnels manually. This feature makes the unified Node.js application (frontend + Socket.io backend) publicly reachable via a stable HTTPS URL so that any player with a browser and the link can join a multiplayer game from anywhere on the internet.

This specification covers **deployment readiness and production hosting only**. It does not redefine the game logic or Socket.io protocol, which are already specified in [`docs/specs/multiplayer-backend-ready.md`](./multiplayer-backend-ready.md).

### Stakeholders / Personas Affected
- **Player (Host)**: Needs a shareable public URL to invite friends.
- **Player (Guest)**: Needs to reach the same URL from a different device or network to join.
- **Developer / Operator**: Needs to deploy, verify, and share the URL without ongoing manual intervention.

---

## 2. Assumptions

1. The deployed artifact is the **existing unified server** (`server.js`) — a single Node.js process that serves static files and the Socket.io endpoint. There is no separate frontend host.
2. The server already reads its port from `process.env.PORT` with a fallback to `3000`. This behaviour must be preserved and is sufficient for managed hosting.
3. The hosting platform must support **persistent WebSocket connections** (not just HTTP polling). This is required for Socket.io to function correctly.
4. A **free tier** is acceptable for the first release. Idle-sleep behaviour (where the service pauses after inactivity) is a known and documented limitation, not a defect.
5. A **platform-provided URL** (e.g., `https://fakerealgame.onrender.com`) is sufficient. A custom domain is not required.
6. No database, file system persistence, or external storage is needed. All state is in-memory (unchanged from the local setup).
7. The app does not need horizontal scaling. A single instance is sufficient for the first release.
8. HTTPS is provided transparently by the managed host. The application itself does not need to manage TLS certificates.
9. A `package.json` with a `start` script (`node server.js`) and declared `dependencies` is already present and is the primary deployment contract.

---

## 3. User Stories

> As a **Host**, I want to share a single public URL with my friends so that they can join my multiplayer game from any device, anywhere.

> As a **Guest**, I want to open a link in my browser and reach the FakeRealGame lobby so that I can enter a room code and play without installing anything.

> As a **Developer**, I want to deploy the application to a managed host with minimal configuration so that I spend no time on infrastructure management.

> As a **Developer**, I want the running service to expose a health or status endpoint so that I can confirm the deployment is live without starting a full game.

> As a **Developer**, I want to document the first-release limitations (sleep, single instance, no persistence) so that players have accurate expectations.

---

## 4. Functional Requirements

### 4.1 Hosting Compatibility

**FR-01** — The system SHALL be deployable to a managed Node.js hosting platform that supports WebSocket connections and provides HTTPS automatically.

**FR-02** — The system SHALL start correctly when the host platform sets the `PORT` environment variable to any valid port number.

**FR-03** — The deployed service SHALL serve the game frontend (`index.html`, `styles.css`, all `.js` files) over HTTPS from the root path (`/`).

**FR-04** — The deployed service SHALL serve the Socket.io client at `/socket.io/socket.io.js`, exactly as it does locally.

**FR-05** — The system SHALL declare all runtime dependencies in `package.json` so the platform can install them without manual intervention.

**FR-06** — The system SHALL define a `start` script in `package.json` that the platform can invoke to launch the server.

### 4.2 Runtime Health Signal

**FR-07** — The server SHALL expose a lightweight HTTP endpoint (e.g., `GET /health`) that returns a `200 OK` response with a JSON body containing at minimum: application name, version (from `package.json`), and server uptime in seconds.

**FR-08** — The health endpoint SHALL be accessible without authentication.

**FR-09** — The health endpoint response SHALL include the current UTC timestamp so that callers can verify the service is live and not serving a cached response.

### 4.3 Deployment Artifact

**FR-10** — If the chosen platform requires a configuration file (e.g., a `Dockerfile`, a `render.yaml`, a `railway.json`, or a `Procfile`), that file SHALL be added to the repository root and committed as part of this feature.

**FR-11** — The configuration file (if required) SHALL not hard-code port numbers, secrets, or environment-specific values. All such values SHALL be read from environment variables.

### 4.4 Deployment Validation

**FR-12** — After a successful deployment, the operator SHALL be able to open the public URL in a browser and reach the game intro screen without errors.

**FR-13** — After a successful deployment, two players on separate devices and networks SHALL be able to create a room, join it, and complete at least one round of a multiplayer game.

**FR-14** — After a successful deployment, the `/health` endpoint SHALL return a `200 OK` response confirming the service is running.

### 4.5 First-Release Limits Documentation

**FR-15** — The project `README.md` SHALL be updated to include: the public URL, instructions for accessing the game, and a clear description of first-release limitations (idle sleep, single-instance only, no session persistence across restarts).

---

## 5. Acceptance Criteria

### Story: Host shares a public URL with friends

**Given** the application has been deployed to a managed host,
**When** the Host opens the public HTTPS URL in a browser on any network,
**Then** the FakeRealGame intro screen loads correctly with no console errors related to resource loading or WebSocket connection.

### Story: Guest joins from a different device

**Given** the Host has created a room from the public URL,
**When** a Guest opens the same public URL on a different device and different network and enters the room code,
**Then** the Guest appears in the Host's waiting room player list and both players can proceed to play a full synchronized round.

### Story: Developer verifies deployment is live

**Given** the application is deployed,
**When** the Developer sends `GET /health` to the public URL,
**Then** the response is HTTP `200 OK` with a JSON body that includes `name`, `version`, `uptimeSeconds`, and `timestamp`.

### Story: Developer deploys with minimal steps

**Given** the repository is pushed to its Git remote,
**When** the Developer connects the repository to the chosen managed host and triggers a deploy (manually or via Git integration),
**Then** the platform installs dependencies, runs the `start` script, and the service is reachable — without any manual SSH, file upload, or build step beyond what the platform handles natively.

### Story: First-release limitations are communicated

**Given** a player reads the `README.md`,
**When** they look for information about the public instance,
**Then** they find: the live URL, how to start a multiplayer game, and a plain-language description of free-tier sleep behaviour and what it means for gameplay (e.g., first load may be slow after idle).

---

## 6. Out of Scope

The following are explicitly **not** covered by this specification. They may be addressed in future iterations:

- **Custom domain**: A branded URL is not required for the first release.
- **CI/CD pipeline**: Automated deployment on every push is not required. Manual one-time deployment is sufficient.
- **Session persistence / reconnection**: Players who disconnect mid-game will not be able to rejoin their session. This is unchanged from the current local behaviour.
- **Multi-instance / horizontal scaling**: Load balancing across multiple server instances is not required and would require Socket.io adapter changes.
- **Environment variable management UI**: Secrets or config values managed through a secrets manager or vault are not in scope.
- **Monitoring and alerting**: Error tracking (e.g., Sentry), uptime monitoring, or alerting are not required for the first release.
- **Database or external state**: No persistent storage is introduced. All game state remains in-memory.
- **Backend changes to game logic**: This spec does not modify any Socket.io event handling, game rules, or scoring. See `docs/specs/multiplayer-backend-ready.md` for those contracts.
- **Mobile-responsive design changes**: No UI changes are in scope.
- **Rate limiting or abuse protection**: Beyond what the platform provides natively, no additional protection is required for the first release.

---

## 7. Open Questions

| # | Question | Impact | Owner |
|---|----------|--------|-------|
| OQ-1 | Which managed hosting platform should be used? The choice determines whether a configuration file (FR-10) is needed and what form it takes. Candidates: Render, Railway, Fly.io — all have free tiers and WebSocket support. | Blocks FR-10 and the deployment artifact deliverable. | Developer / Operator |
| OQ-2 | Is the free-tier idle-sleep behaviour acceptable to players for the foreseeable future, or is there a timeline after which an always-on tier should be required? | Influences first-release scope boundary and README wording. | Stakeholder |
| OQ-3 | Should the `/health` endpoint be the canonical liveness check for the platform's health-check configuration (e.g., Render's health check URL setting)? | If yes, FR-07 directly satisfies the platform's own restart/recovery mechanism; if no, a separate platform-native check may be needed. | Developer |
| OQ-4 | Is there any content or data in the repository that must not be public (API keys, tokens, game answer data)? The game data (`data.js`) is client-side already, but this should be confirmed before the repository is connected to a public hosting service. | If sensitive data exists, a private repo or environment-variable strategy is required before deployment. | Developer / Operator |
