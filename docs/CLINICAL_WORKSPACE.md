# Clinical Workspace

> Technical documentation for the patient-centered clinical workspace.

---

# Purpose

This document describes the `Clinical Workspace` implemented in the frontend.

It documents:

* Entry points
* Component composition
* Feature boundaries
* Data loading flow
* Interaction rules
* Current limitations

The Clinical Workspace is a frontend orchestration layer.

It combines existing patient, case file, appointment, session note and document capabilities into a single working surface without introducing new business rules.

---

# Overview

The Clinical Workspace is currently rendered through:

```text
PatientDetailDialogComponent
```

Its goal is to give the psychologist immediate clinical context for one patient and quick access to the most common actions required during daily work.

The workspace is patient-centered.

The patient is the anchor entity and the rest of the information is resolved from that context.

---

# Entry Points

The current entry points are:

* `features/patients/pages/patients-list.page.ts`
* `features/case-files/pages/case-files-list.page.ts`

From both screens the user can open the same patient-centered workspace dialog.

This keeps the workflow consistent whether the user starts from the patient directory or from the case files list.

---

# Main Responsibilities

The Clinical Workspace is responsible for:

* Presenting a clinical summary for the selected patient
* Displaying the current case file foundation
* Surfacing related appointments
* Surfacing related session notes
* Surfacing related documents
* Building a read-only clinical timeline from already available records
* Providing quick actions for the most common CRUD flows

The Clinical Workspace is not responsible for:

* Creating new backend contracts
* Recomputing business rules owned by the backend
* Validating ownership or permissions
* Replacing feature-specific forms or delete confirmations

---

# Component Structure

Current main component:

```text
features/patients/components/patient-detail-dialog.component.ts
```

The workspace is composed of reusable UI blocks and existing feature dialogs.

Current high-level sections:

* Hero with patient identity and case file status
* Clinical summary cards
* Quick actions
* Clinical timeline
* Appointments section
* Case file foundation section
* Session notes section
* Documents section
* Administrative patient information

The workspace reuses shared presentation components such as:

* `SectionCardComponent`
* `MetricCardComponent`
* `ActionCardComponent`
* `StatusBadgeComponent`
* `ClinicalTimelineComponent`
* `DataTableToolbarComponent`
* `DataTableEmptyStateComponent`

This keeps the workspace aligned with the shared design system instead of introducing a custom parallel UI pattern.

---

# Data Sources

The Clinical Workspace receives a `Patient` as dialog input and prefers a case-file-centered aggregated backend contract whenever a `caseFileId` is available.

Current service orchestration:

* `CaseFilesService.getWorkspace(caseFileId)` is the primary source for patient, case file, summary, appointments, session notes, documents and timeline
* `CaseFilesService.getCaseFileByPatientId(patientId)` remains as a fallback only when the workspace is opened from a context that still does not provide a `caseFileId`

This creates the preferred loading path:

```text
Case File Id
  -> GET /case-files/:id/workspace
```

Fallback path:

```text
Patient
  -> Case File
      -> Workspace
```

The aggregated workspace endpoint replaces the previous manual frontend composition of:

* appointments
* sessionNotes
* documents
* caseFile
* patient
* timeline

---

# Loading And Empty States

The workspace handles each section independently.

Current behavior:

* Missing case file is treated as a valid empty state, not as a frontend error
* Session notes and documents remain unavailable until a case file exists
* Summary metrics use backend-provided values when the workspace contract is available
* The workspace still allows partial empty states when it is opened before any case file exists

This allows partial rendering and prevents one failed section from collapsing the entire patient workflow.

---

# Quick Actions

The workspace provides direct actions for:

* Creating or editing the case file
* Editing the patient
* Creating appointments
* Creating session notes
* Jumping to documents

Action availability follows the current UI contract:

* Session note creation is disabled when no case file exists
* Document navigation is disabled when no case file exists
* Case file action adapts between create and edit depending on current availability

The workspace launches existing feature dialogs instead of duplicating forms inside the detail surface.

---

# Timeline Strategy

The clinical timeline is now consumed directly from the backend workspace contract.

Current accepted event sources:

* `CASE_FILE_CREATED`
* `APPOINTMENT_COMPLETED`
* `SESSION_NOTE_CREATED`
* `DOCUMENT_UPLOADED`

## Clinical Timeline - Scheduled Appointments

Current product decision:

* The timeline represents clinical history, not the agenda
* `SCHEDULED` appointments do not appear in the clinical timeline
* Scheduled appointments remain visible in the summary, appointments section and calendar flows

Future evaluation remains open for:

* Whether `CANCELLED` appointments should appear in the timeline
* Whether `NO_SHOW` appointments should appear in the timeline
* Whether a fuller appointment status-history timeline is needed later

The frontend only maps copy, iconography and click behavior.

Current interactions:

* Session note events open the note detail dialog
* Document events open the document preview dialog
* Appointment events open the appointment detail dialog
* Case file events remain informational

---

# Session Note Workspace

Session notes also expose a dedicated read-oriented surface through:

```text
features/session-notes/components/session-note-workspace.component.ts
```

This component is used inside:

```text
SessionNoteDetailDialogComponent
```

Its role is to present one note as a compact clinical reading view with:

* Session summary
* Narrative content
* Record metadata
* Optional edit, delete and close actions

This follows the same principle as the patient-level workspace: detail reading should be separated from CRUD forms whenever the user needs a clearer clinical context.

---

# Cross-Feature Boundaries

The Clinical Workspace spans multiple features, but ownership remains local to each domain.

Current ownership boundaries:

* `patients` owns the workspace shell and patient context
* `case-files` owns case file forms and models
* `appointments` owns appointment CRUD flows
* `session-notes` owns note CRUD and note detail reading
* `documents` owns uploads, listing and file actions
* `shared` owns reusable presentational building blocks

This is a composed workflow, not a new business feature with independent backend ownership.

---

# Architectural Constraints

The Clinical Workspace must continue to respect these rules:

* Backend remains the source of truth
* No frontend-only clinical rules should be introduced
* New workspace sections should reuse feature services instead of bypassing them
* Shared UI components should be preferred before creating workspace-specific primitives
* Feature dialogs remain the standard place for create, edit and delete flows

If future requirements introduce broader clinical orchestration, the workspace should evolve by composition and not by centralizing business logic in the dialog component.

---

# Known Limitations

Current limitations include:

* The workspace is dialog-based and not yet a standalone route
* Timeline drill-down is currently implemented only for session notes
* Data is refreshed by reloading the aggregated workspace after dialogs close or document actions finish
* The workspace depends on the current backend contract and intentionally avoids inferred relationships beyond it
* Minor visual flicker remains when closing the child `Editar paciente` dialog back into the workspace shell

---

# Sprint 10 Final Validation

This sprint is a closure and validation sprint.

Target validation flow:

1. Open case file from `/case-files`
2. Open case file from `/patients`
3. Create appointment from Clinical Workspace
4. Confirm summary refresh
5. Confirm `SCHEDULED` appointment appears in appointments and next appointment summary, but not in timeline
6. Change appointment to `COMPLETED`
7. Confirm it appears in timeline
8. Create session note from Clinical Workspace
9. Confirm the note appears in timeline
10. Open session note from timeline
11. Upload document from Clinical Workspace
12. Confirm the document appears in timeline
13. Open document from timeline
14. Edit patient
15. Edit case file
16. Delete note or document and confirm refresh
17. Confirm workspace context is preserved

Current execution status in this repository session:

* Frontend local target reachable at `http://localhost:4200`
* Backend local target reachable at `http://localhost:3000`
* Manual browser-driven E2E validation could not be completed from this session because no browser runtime was available for interactive navigation

This means Sprint 10 closure documentation is complete, but the manual UI checklist above still requires execution in a browser-capable session with backend access.

These limitations are acceptable for the current MVP and should only change when the product flow requires it.

---

# References

Related documentation:

* README.md
* ARCHITECTURE.md
* STANDARDS.md
* API_INTEGRATION.md
* ROADMAP.md

End of document.
