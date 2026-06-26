# Roadmap

> Development roadmap for the Psychology Management System Frontend.

---

# Purpose

This document describes the current development status of the frontend, upcoming milestones and the long-term product vision.

It is not intended to replace the project backlog.

---

# Current Status

Current phase:

```text
MVP Development
```

Current priorities:

* Frontend stabilization
* UI refinement
* Backend integration
* Reusable components
* Documentation standardization

Latest completed sprint:

```text
Sprint 7.4 - Session Notes Data Table Pattern
```

---

# Completed Milestones

## Core Infrastructure

* Angular application initialized
* Standalone Components
* Angular Signals
* Global routing
* Authentication infrastructure
* Application shell
* Theme configuration

---

## Clinical Modules

### Authentication

* Login
* JWT integration
* AuthStore
* Route guards
* HTTP interceptor

### Patients

* List
* Create
* Edit
* Detail

### Case Files

* Detail
* Create
* Edit

### Session Notes

* List
* Create
* Edit
* Detail
* Delete
* Sprint 7.4 completed - Data table pattern applied to the Session Notes block inside patient detail dialog

### Documents

* List
* Upload
* Preview
* Download
* Delete

### Appointments

* List by patient
* Global appointments list
* Create
* Edit
* Cancel
* Delete
* Sprint 7.3 completed - Data table pattern applied to global appointments list

---

# Current Focus

Current development efforts include:

* UI polish
* Reusable components
* Data table improvements
* User experience refinement
* Frontend architecture stabilization

---

# Short-Term Roadmap

## User Interface

* Professional visual polish
* Responsive improvements
* Loading states
* Empty states
* Better validation feedback

---

## Reusable Components

* Generic Data Table
* Confirmation dialogs
* Form components
* Shared utilities

---

## Quality

* Component testing
* Service testing
* Form validation improvements
* Error handling improvements

---

# Medium-Term Roadmap

Potential additions after MVP completion:

* Dashboard improvements
* Search and filtering
* Reports
* User profile
* Accessibility improvements

---

# Long-Term Vision

The frontend should evolve into a SaaS-ready application.

Potential future features include:

* Organization support
* Multi-specialist interface
* Theme switching
* Internationalization (i18n)
* Progressive Web App (PWA)
* Offline capabilities
* Notification center
* AI-assisted workflows

These features are intentionally outside the current MVP.

---

# Known Technical Debt

Current technical debt includes:

* UI consistency refinements
* Shared component extraction
* Design system consolidation
* Automated frontend testing

Technical debt should be addressed incrementally.

---

# Success Criteria

The frontend MVP will be considered complete when:

* All clinical workflows are fully operational.
* Backend integration is complete.
* The UI is consistent and responsive.
* Reusable components are consolidated.
* Documentation is complete.
* The application is ready for production use by an independent psychologist.

---

# References

Related documentation:

* PROJECT.md
* ARCHITECTURE.md
* STANDARDS.md
* API_INTEGRATION.md
* DECISION_LOG.md

End of document.
