# Changelog

## RC.FE.1 - CSV Formula Injection Closure

### Changed
- Documented the closure of FE-RC-001 after central CSV hardening in `ReportsExportService`.
- Confirmed protected export coverage for Financial Report and Agenda Report.
- Recorded the hardened CSV behavior for dangerous prefixes, leading controls and safe preservation of commas, quotes, line breaks and UTF-8 text.

### Validation
- 16 new CSV export tests were added.
- Full suite validation reached 26/26 tests.
- Manual Excel verification confirmed that `=1+1` and `@SUM(1,1)` are rendered as text and not evaluated.

### Notes
- No PDF, UI, contract, dependency or CI/CD changes were introduced.
- A separate UTF-8/BOM compatibility issue with Excel was detected and remains pending outside the scope of RC.FE.1.

## Sprint 14.3 â€” Dialog Baseline Consolidation (Delete Dialogs)

### Changed
- Homologated the delete dialogs for:
  - Documents
  - Session Notes
  - Financial Transactions

### UI Improvements
- Unified dialog hierarchy using the shared dialog baseline.
- Standardized:
  - dialog header
  - descriptive subtitle
  - summary card
  - warning section
  - destructive action button
  - spacing and typography
- Improved responsive behavior and button alignment.
- Restored proper Spanish localization with UTF-8 accents.

### Technical
- No business logic changes.
- No API or backend modifications.
- No routing changes.
- No contract changes.
- Build completed successfully.

## Sprint 14.2 â€” Global Styles & Tokens Cleanup

### Added
- Added missing global design tokens:
  - `--app-color-text`
  - `--app-color-border-subtle`
  - `--app-color-warning-text`

### Changed
- Stabilized global color tokens for both light and dark themes.
- Preserved existing visual behavior without introducing UI regressions.

### Notes
- Evaluated extraction of feature-specific styles from `styles.scss`.
- Deferred extraction after confirming component style budget limitations.
- Build completed successfully with no functional changes.
