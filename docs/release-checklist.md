# Phase 6 release checklist

Prepared 2026-11-03; subsequently updated for approved licensing, publication and the owner rename. Current repository: [ArmanYepiskoposyan/still-task-manager](https://github.com/ArmanYepiskoposyan/still-task-manager). This checklist does not authorize deployment.

## VERIFIED

- [x] Existing repository inspected before initial local Git changes under its former name `java-task-manager`; it was empty at that time. Published history is now retained under `still-task-manager`.
- [x] SSH remote/authentication verified; local `main` tracks `origin/main` at the renamed repository. The approved initial release was published without rewriting history.
- [x] Approved functional architecture/data formats preserved; focused release fixes documented.
- [x] Node 24 clean installation, types, lint, unit/component tests and production build.
- [x] Three-engine production regression coverage, axe, responsive/reflow, storage migration, backup/recovery and failed-write tests.
- [x] Manual keyboard interaction, visible focus and dialog restoration review.
- [x] Dependency advisory correction, full/prod audits and registry signature verification.
- [x] Real production screenshots; historical evidence preserved; public README and third-party notices.
- [x] Verification-only GitHub Actions and Vercel static configuration prepared.
- [x] Public source and the initial release's [successful GitHub-hosted CI run](https://github.com/ArmanYepiskoposyan/still-task-manager/actions/runs/42183243377) verified.

See [verification](phase6-verification.md) for final format/package integrity, extracted equality, image readability and exact counts. Historical verification results describe the preparation build; the hosted result is linked separately above.

## NOT VERIFIED

- [ ] Screen-reader speech and navigation (VoiceOver/NVDA/JAWS).
- [ ] Actual browser zoom at 200% and 400%; available embedded browser did not expose a working zoom control. Equivalent viewport reflow was tested separately.
- [ ] Physical iOS/Android devices, OS high-contrast and older browser versions.
- [ ] Branch protection configuration.
- [ ] Vercel build, public HTTPS/CDN behavior, live URL, provider rollback or field performance.

## REQUIRES OWNER ACTION

- [x] Independent final Phase 6 review approved by the owner on 2026-11-03.
- [x] Owner-provided Git author name/email configured locally before the initial release commit.
- [x] MIT License approved by the owner on 2026-11-03; see [LICENSE](../LICENSE), copyright 2026 Arman Yepiskoposyan.
- [ ] Complete remaining manual assistive-technology/real-zoom/device checks before claiming their coverage.
- [x] Initial publication explicitly authorized and completed after a fresh remote inspection, using a normal SSH push.
- [ ] Explicit authorization to deploy; only then connect Vercel, verify the live site and add its actual URL.

The approved review package remains the historical review snapshot. MIT licensing was subsequently authorized and added to the working project. The existing repository was subsequently published and renamed by the owner. Further publication work requires its own authorization; this checklist does not authorize a new repository, deployment, domain purchase or account/cloud-storage feature.
