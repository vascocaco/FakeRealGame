# Manual Test Guide: Public Deployment — "Play Anywhere"

**Feature spec**: [docs/specs/public-deployment.md](../specs/public-deployment.md)  
**Implementation plan**: [docs/plans/plan-public-deployment.md](../plans/plan-public-deployment.md)  
**Last updated**: 2026-05-22

---

## 1. Feature Under Test

**Feature name**: Public Deployment — Make FakeRealGame Accessible on the Web

**Scope — covered by this guide**:
- Health endpoint correctness (`/health`)
- Static file serving over the public HTTPS URL
- Socket.io client delivery at the expected path
- End-to-end multiplayer across separate devices and networks
- First-load behaviour (cold start / idle wake)
- README limitations accuracy

**Scope — not covered**:
- CI/CD pipeline (out of scope per spec §6)
- Custom domain or TLS certificate management (Render handles TLS transparently)
- Multi-instance or horizontal scaling
- Session persistence across server restarts (known limitation, not a defect)
- Mobile-specific responsive design changes

---

## 2. Prerequisites

### Environment
- A live Render Web Service connected to the `vascocaco/FakeRealGame` GitHub repository, deployed to status **Live**.
- The public HTTPS URL assigned by Render (e.g., `https://fakerealgame.onrender.com`). Record it as `$PUBLIC_URL` throughout these test cases.
- Two physical devices (or one device + one mobile device on mobile data) that are **on separate networks** for TC-04 and TC-05.
- A terminal or REST client (curl, Postman, or browser address bar) for TC-02.

### Test data / state
- No pre-existing rooms or game state needed — all state is in-memory and starts fresh on each server boot.
- No credentials or accounts required.

---

## 3. Test Cases

---

#### TC-01: Frontend loads correctly over HTTPS

**Covers**: FR-03, FR-12 — Deployed service serves game frontend over HTTPS from root path  
**Precondition**: Render deploy is in **Live** status.

**Steps**:
1. Open a browser in a clean profile (or incognito mode) on any device.
2. Navigate to `$PUBLIC_URL`.
3. Wait for the page to fully load.
4. Open the browser's developer console (F12 → Console tab).

**Expected Result**:
- The FakeRealGame intro screen is displayed (heading, Solo Play button, Multiplayer button, word-tiles background animation).
- Fonts render correctly (Space Grotesk headings, JetBrains Mono code elements).
- The browser console shows **no errors** related to resource loading (no 404s for `.js`, `.css`, or font files).
- The browser console shows **no WebSocket connection errors**.

**Pass / Fail**: [ ]  
**Notes**:

---

#### TC-02: Health endpoint returns correct JSON

**Covers**: FR-07, FR-08, FR-09, FR-14 — `/health` returns 200 with required fields, no auth, with UTC timestamp  
**Precondition**: Service is live.

**Steps**:
1. From any terminal or browser, send:
   ```
   GET $PUBLIC_URL/health
   ```
2. Inspect the HTTP response status code.
3. Inspect the `Content-Type` response header.
4. Inspect the response body.

**Expected Result**:
- HTTP status: `200 OK`.
- `Content-Type` header: `application/json` (charset may follow).
- Response body is valid JSON containing **all four fields**:
  - `name`: string, value `"fakerealgame"`.
  - `version`: string, value `"1.0.0"` (or current `package.json` version).
  - `uptimeSeconds`: number (non-negative integer).
  - `timestamp`: string in ISO-8601 UTC format (e.g., `"2026-05-22T10:00:00.000Z"`).
- No authentication prompt or redirect is returned.

**Pass / Fail**: [ ]  
**Notes**:

---

#### TC-03: Socket.io client script is served

**Covers**: FR-04 — Deployed service serves Socket.io client at `/socket.io/socket.io.js`  
**Precondition**: Service is live.

**Steps**:
1. Navigate to `$PUBLIC_URL/socket.io/socket.io.js` in a browser, or run:
   ```
   curl -I $PUBLIC_URL/socket.io/socket.io.js
   ```
2. Inspect the response.

**Expected Result**:
- HTTP status: `200 OK`.
- Response body is a JavaScript file (begins with typical Socket.io client bundle content, not an HTML error page).
- `Content-Type` header includes `application/javascript` or `text/javascript`.

**Pass / Fail**: [ ]  
**Notes**:

---

#### TC-04: Two players join from different networks

**Covers**: FR-13, Story: Guest joins from a different device  
**Precondition**: Service is live. Two devices are ready — Device A on one network (e.g., home Wi-Fi), Device B on a different network (e.g., mobile data or a different Wi-Fi).

**Steps**:
1. **Device A**: Open `$PUBLIC_URL` → click **Multiplayer** → enter a nickname → click **Create Room**.
2. **Device A**: Note the 6-character room code displayed in the waiting room.
3. **Device B**: Open `$PUBLIC_URL` → click **Multiplayer** → enter a different nickname → click **Join Room** → enter the room code from step 2 → confirm.
4. **Device A**: Observe the waiting room player list.

**Expected Result**:
- Device B's player name appears in Device A's waiting room player list within ~3 seconds of joining.
- Device A's player count shows 2 players.
- No errors appear in either browser console.

**Pass / Fail**: [ ]  
**Notes**:

---

#### TC-05: Full multiplayer round completes end-to-end

**Covers**: FR-13, Story: Host shares a public URL with friends  
**Precondition**: TC-04 has passed; both devices are in the waiting room with 2 players.

**Steps**:
1. **Device A (Host)**: Click **Start Game**.
2. Both devices: Observe the game round screen (category, four word tiles, countdown timer).
3. Both devices: Select any answer before the timer reaches zero.
4. Both devices: Observe the round results screen (correct answer revealed, score update, leaderboard).
5. Repeat for all 5 rounds.
6. Both devices: Observe the podium / game-over screen.

**Expected Result**:
- Both devices see the same category and the same four words simultaneously.
- The countdown timer ticks in sync (within ~1 second) on both devices.
- The round results screen shows the correct fake word highlighted and per-player score breakdown.
- The leaderboard order is consistent on both devices.
- After all 5 rounds, the podium screen shows nicknames and final scores.
- No disconnection errors or frozen screens occur during the session.

**Pass / Fail**: [ ]  
**Notes**:

---

#### TC-06: Health endpoint is accessible without authentication

**Covers**: FR-08 — Health endpoint requires no credentials  
**Precondition**: Service is live.

**Steps**:
1. Send `GET $PUBLIC_URL/health` with **no** `Authorization` header and **no** cookies.

**Expected Result**:
- HTTP `200 OK` is returned immediately.
- No `401 Unauthorized`, `403 Forbidden`, or redirect to a login page.

**Pass / Fail**: [ ]  
**Notes**: This is implicitly verified by TC-02; record separately only if TC-02 required credentials to pass.

---

#### TC-07: `render.yaml` has no hard-coded secrets or port numbers

**Covers**: FR-11 — Configuration file must not hard-code ports, secrets, or environment-specific values  
**Precondition**: `render.yaml` is present at the repository root.

**Steps**:
1. Open [render.yaml](../../render.yaml).
2. Check for the literal string `PORT`, any numeric port value (e.g., `3000`, `8080`), any API key, password, or secret string.
3. Verify the `startCommand` delegates port binding to `npm start` (i.e., `server.js`).

**Expected Result**:
- `render.yaml` contains no port numbers.
- `render.yaml` contains no secrets, tokens, or passwords.
- `PORT` assignment is absent (Render injects it automatically).

**Pass / Fail**: [ ]  
**Notes**: This is a static review step, no live deployment needed.

---

#### TC-08: First-release limitations documented in README

**Covers**: FR-15 — README includes live URL, how-to-play, and first-release limitations  
**Precondition**: Phase 5 is complete (live URL has been added to README after Phase 3–4).

**Steps**:
1. Open [README.md](../../README.md).
2. Locate the **Public Deployment** section without searching (assess findability by scanning headings).
3. Verify the following are present and accurate:
   - The live Render URL (clickable link).
   - A plain-language description of how to start a multiplayer game from the public URL.
   - Free-tier idle sleep behaviour (first request after idle may take 30–60 seconds).
   - Single-instance limitation.
   - No session persistence across server restarts.

**Expected Result**:
- All five items above are present in the README.
- The live URL is a working HTTPS link (verify by clicking it).
- The limitations section is reachable within one scroll from the top on a standard desktop viewport.

**Pass / Fail**: [ ]  
**Notes**: TC-08 cannot fully pass until Phase 5 is complete and the live URL has been inserted.

---

## 4. End-to-End Scenarios

### Scenario A: New player discovers and plays the game

> Simulates the first-time experience of a player who received the link from a friend.

1. Player receives `$PUBLIC_URL` via a chat message.
2. Player opens the URL on a mobile phone (different network from the host).  
   → **TC-01** must pass.
3. Player clicks **Multiplayer**, enters a nickname, and joins using a room code shared by the host.  
   → **TC-04** must pass.
4. Host starts the game; both players complete all 5 rounds.  
   → **TC-05** must pass.
5. Player closes the tab. Host's room is automatically cleaned up.

**Expected overall result**: Seamless play from link click to podium with no errors, no manual setup on the player's side.

---

### Scenario B: Developer validates a fresh deploy

> Simulates the operator health-check workflow after deploying a new version.

1. Developer pushes a commit to GitHub; Render auto-deploys.
2. Developer waits for Render dashboard to show status **Live**.
3. Developer runs `curl $PUBLIC_URL/health` and confirms all four JSON fields.  
   → **TC-02** must pass.
4. Developer opens `$PUBLIC_URL` in a browser and checks the console for errors.  
   → **TC-01** must pass.
5. Developer navigates to `$PUBLIC_URL/socket.io/socket.io.js` and confirms a JS file is returned.  
   → **TC-03** must pass.

**Expected overall result**: Deploy is confirmed live in under 5 minutes without starting a full game.

---

### Scenario C: Service wakes from idle sleep (free-tier cold start)

> Simulates a player arriving after the service has been idle for > 15 minutes.

1. Leave the Render service idle for at least 15–20 minutes (no HTTP traffic).
2. Player opens `$PUBLIC_URL` in a browser.
3. Player waits. The first response may take 30–60 seconds (Render wake-up).
4. After the page loads, player starts a solo game to verify game logic is intact.

**Expected overall result**: Page eventually loads with no error screen. Solo play completes correctly. The slow first load is expected and documented (TC-08 must pass for this to be communicated to users).

---

## 5. Known Limitations & Out-of-Scope

| Item | Reason excluded |
|---|---|
| Custom domain / SSL certificate management | Out of scope per spec §6 |
| Automated load or stress testing | Out of scope for first release |
| Multiplayer with more than 2 simultaneous players from different devices | Manual cross-device logistics; basic 2-player coverage in TC-04/05 is sufficient for v1 |
| Session reconnection after a mid-game disconnect | Known limitation documented in README; not a defect |
| `render.yaml` blueprint import flow (UI walkthrough) | Cannot be scripted without a Render account; covered by plan Phase 3 |
| Verifying `plan: free` validity on Render's current pricing schema | External platform concern; operator must confirm during Phase 3 |
| Node.js version used by Render buildpack | No engine pin in `package.json` or `render.yaml`; operator should verify deploy logs show Node ≥ 18 |
