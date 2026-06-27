# AGENTS.md

This document defines how AI coding agents should work within this repository.

---

# Read First

Before generating or modifying code, review the documentation in the following order:

1. `PROJECT.md`
2. `docs/README.md`

Then consult the appropriate document depending on the task.

Examples:

Architecture changes

→ `docs/ARCHITECTURE.md`

Angular conventions

→ `docs/STANDARDS.md`

Backend communication

→ `docs/API_INTEGRATION.md`

Architecture decisions

→ `docs/DECISION_LOG.md`

Project evolution

→ `docs/ROADMAP.md`

The documentation represents the current source of truth.

---

# General Rules

Always:

* Follow the documented architecture.
* Respect the project standards.
* Prefer consistency over creativity.
* Keep solutions simple.
* Avoid unnecessary abstractions.
* Avoid overengineering.

Never assume undocumented business rules.

---

# Frontend Philosophy

The frontend is responsible for:

* User interface
* Navigation
* User interaction
* Forms
* API consumption

Business rules belong to the backend.

Never duplicate backend validation or ownership logic.

---

# Angular Standards

Use:

* Standalone Components
* Angular Signals
* Reactive Forms
* `inject()`
* Functional Guards
* Functional Interceptors

Avoid introducing:

* NgModules (unless technically required)
* NgRx
* Unnecessary global state

---

# Documentation Policy

The documentation under `/docs` is the project's technical source of truth.

When implementing new functionality:

* Update the corresponding documentation if architecture changes.
* Do not duplicate documentation.
* Do not create versioned documents.
* Keep documentation synchronized with the implementation.

---

# Code Quality

Generated code should be:

* Readable
* Strongly typed
* Reusable
* Testable
* Consistent

Implement only what is required for the current scope.

End of document.
