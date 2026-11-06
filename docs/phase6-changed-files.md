# Exact Phase 6 changed-file inventory

Compared with the 192-file approved Phase 5 review package (SHA-256 `77d3dc7015861d3cd5c03718b48133b906865067532573add4470db43269876b`). The comparison used a per-file SHA-256 baseline before Phase 6 changes. There are **15 modified files**, **47 added files**, **0 deleted files**, and **239 release files** total. Git metadata and ignored local tooling/output are outside this inventory.

All 98 historical screenshots remain byte-identical. Application domain models, storage schema, persistence repository and existing test assertions are retained. The only application behavior correction is import-preview focus; stylesheet scanning is restricted for reproducible builds.

## Modified files

| Path                                      | Change                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `.gitignore`                              | Exclude local credentials, tool/browser/test/deployment artifacts.                                |
| `.nvmrc`                                  | Record verified Node 24.22.1.                                                                     |
| `README.md`                               | Professional current web-application presentation, screenshots, reproducible commands and limits. |
| `docs/phase2-verification.md`             | Portable historical commands/log locations and formatting.                                        |
| `docs/phase3-verification.md`             | Portable historical commands/log locations and formatting.                                        |
| `docs/phase4-verification.md`             | Portable historical commands/log locations and formatting.                                        |
| `index.html`                              | Add JavaScript-required fallback notice.                                                          |
| `package-lock.json`                       | Pin patched minimatch 11.0.1 and its required transitive matcher; no other version changes.       |
| `package.json`                            | Repository metadata, release/screenshot/benchmark commands and targeted dependency override.      |
| `src/app/Phase5.test.tsx`                 | Add deterministic import-preview focus regression; existing assertions retained.                  |
| `src/features/workspace/BackupDialog.tsx` | Focus validated preview after React commit using a layout effect.                                 |
| `src/styles.css`                          | Restrict Tailwind source detection to src; existing styling rules retained.                       |
| `tests/e2e/phase5-evidence.spec.ts`       | Write retained screenshot regressions to temporary test output.                                   |
| `tests/performance/phase5.mjs`            | Optional --phase6 output target preserves historical measurement JSON.                            |
| `vite.config.ts`                          | Relative production asset base.                                                                   |

## Added files

- `.gitattributes`
- `.github/workflows/verify.yml`
- `docs/deployment.md`
- `docs/measurements/phase6-build.json`
- `docs/measurements/phase6-dependency-audit-before.json`
- `docs/measurements/phase6-dependency-audit.json`
- `docs/measurements/phase6-direct-dependencies.json`
- `docs/measurements/phase6-performance.json`
- `docs/measurements/phase6-production-audit.json`
- `docs/measurements/phase6-repository-inspection.json`
- `docs/measurements/phase6-screenshots.json`
- `docs/measurements/phase6-static-release.json`
- `docs/measurements/phase6-verification.json`
- `docs/phase6-changed-files.md`
- `docs/phase6-release-audit.md`
- `docs/phase6-repository.md`
- `docs/phase6-verification.md`
- `docs/phase6-visual-review.md`
- `docs/release-checklist.md`
- `docs/screenshots/phase6/01-desktop-light.png`
- `docs/screenshots/phase6/02-desktop-dark.png`
- `docs/screenshots/phase6/03-upcoming-dark.png`
- `docs/screenshots/phase6/04-upcoming-light.png`
- `docs/screenshots/phase6/05-project-view.png`
- `docs/screenshots/phase6/06-task-editor.png`
- `docs/screenshots/phase6/07-project-delete-confirmation.png`
- `docs/screenshots/phase6/08-backup-export.png`
- `docs/screenshots/phase6/09-import-preview.png`
- `docs/screenshots/phase6/10-shortcut-help.png`
- `docs/screenshots/phase6/11-768-light.png`
- `docs/screenshots/phase6/12-768-dark.png`
- `docs/screenshots/phase6/13-390-light.png`
- `docs/screenshots/phase6/14-390-dark.png`
- `docs/screenshots/phase6/15-360-light.png`
- `docs/screenshots/phase6/16-360-dark.png`
- `docs/screenshots/phase6/17-320-light.png`
- `docs/screenshots/phase6/18-320-dark.png`
- `docs/screenshots/phase6/19-320-failed-save-dark.png`
- `docs/screenshots/phase6/20-320-storage-recovery-dark.png`
- `docs/screenshots/phase6/21-today-light.png`
- `docs/screenshots/phase6/22-search-and-filters-light.png`
- `docs/screenshots/phase6/23-no-results-light.png`
- `docs/screenshots/phase6/24-empty-workspace-light.png`
- `public/third-party-notices.txt`
- `tests/e2e/phase6-evidence.spec.ts`
- `tests/release/verify.mjs`
- `vercel.json`

No existing remote files or history were removed; the repository was verified empty. No project LICENSE, live-demo URL or public deployment was created.
