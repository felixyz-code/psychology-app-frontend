# Changelog

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
