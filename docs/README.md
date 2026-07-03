# Frontend Documentation

> Technical documentation for the Psychology Management System Frontend.

---

# Purpose

This directory contains the technical documentation for the Angular frontend.

The goal of this documentation is to provide a single source of truth for the application's architecture, development standards, backend integration and future evolution.

Product vision is documented separately in the repository root.

---

# Reading Order

New developers and AI agents should read the documentation in the following order:

1. PROJECT.md
2. AGENTS.md
3. docs/README.md
4. ARCHITECTURE.md
5. STANDARDS.md
6. CLINICAL_WORKSPACE.md
7. API_INTEGRATION.md
8. DECISION_LOG.md
9. ROADMAP.md

This order provides business context before implementation details.

---

# Documents

## ARCHITECTURE.md

Describes the frontend architecture.

Includes:

- Angular application structure
- Core, Shared and Features organization
- Routing
- State management
- Layout
- Theme
- Design decisions

---

## STANDARDS.md

Defines development standards.

Includes:

- Angular conventions
- Signals usage
- Component organization
- Naming conventions
- Styling conventions
- Forms
- Reusable components
- General frontend guidelines

---

## API_INTEGRATION.md

Documents how the frontend communicates with the backend.

Includes:

- Authentication
- JWT
- HttpClient
- Interceptors
- Guards
- Environment configuration
- Backend contracts
- File download and upload strategy

---

## CLINICAL_WORKSPACE.md

Documents the patient-centered clinical workspace currently used as the main cross-feature detail surface.

Includes:

- Entry points from Patients and Case Files
- Workspace composition
- Data loading flow
- Section responsibilities
- Timeline strategy
- Cross-feature ownership boundaries

---

## DECISION_LOG.md

Documents architectural decisions.

Includes:

- Technology choices
- UI decisions
- State management strategy
- Backend-first philosophy
- Future architectural decisions

---

## ROADMAP.md

Documents the frontend evolution.

Includes:

- Current MVP status
- Completed milestones
- Current sprint
- Planned features
- Long-term vision

---

# Repository Documents

The repository root also contains three important documents.

## PROJECT.md

Defines:

- Product vision
- MVP scope
- Clinical workflow
- Frontend goals

---

## AGENTS.md

Defines:

- AI development rules
- Coding conventions
- Development workflow
- Project expectations

---

## README.md

Provides the repository entry point and setup instructions.

---

# Source of Truth

The current source of truth for the frontend is:

- `/docs`
- `PROJECT.md`
- `AGENTS.md`

Avoid creating duplicate documentation outside these files.

When documentation becomes outdated, update the existing document instead of creating a new version.

---

# Documentation Principles

Documentation should remain:

- Accurate
- Concise
- Up to date
- Consistent

Each document has a single responsibility and should avoid duplicating information already documented elsewhere.

End of document.
