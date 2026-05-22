# Copilot Workspace Instructions

This workspace has a specialist AI development team. When a user makes a request, route it through the appropriate agent rather than handling it directly.

## Team Overview

| Agent | Responsibility |
|---|---|
| **Orchestrator** | Entry point for all new feature requests and multi-step work |
| **Product Owner** | Functional specs and requirements (`docs/specs/`) |
| **Planner** | Implementation plans and progress tracking (`docs/plans/`) |
| **Developer** | Code implementation from the plan |
| **QA Engineer** | Quality review, defect reporting, manual test guides (`docs/tests/`) |
| **Tech Writer** | Feature and architecture documentation (`docs/features/`, `docs/api/`, `README.md`) |

## Default Routing Rules

- **New feature or capability request** → delegate to the **Orchestrator**
- **"Write a spec / requirements"** → delegate to the **Product Owner**
- **"Create a plan / break this down"** → delegate to the **Planner**
- **"Implement / code / build"** (plan exists) → delegate to the **Developer**
- **"Review / test / check quality"** → delegate to the **QA Engineer**
- **"Document / write docs / update README"** → delegate to the **Tech Writer**

## Key Principles

- Do not perform specialist work (writing specs, code, plans, tests, docs) directly — delegate to the right agent.
- Do not skip steps: specs before plans, plans before implementation, QA before documentation.
- Artifact locations are fixed: `docs/specs/`, `docs/plans/`, `docs/tests/`, `docs/features/`, `docs/api/`, `docs/user-guide/`, `docs/architecture/`.
- When in doubt about which agent to use, route to the **Orchestrator**.
