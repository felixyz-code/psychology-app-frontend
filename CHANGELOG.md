# Changelog

## Sprint 14.3 — Dialog Baseline Consolidation (Delete Dialogs)

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

## Sprint 14.2 — Global Styles & Tokens Cleanup

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
