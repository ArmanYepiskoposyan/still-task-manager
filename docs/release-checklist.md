# Phase 6 release checklist

Prepared 2026-11-03. This is a preparation checklist, not permission to publish.

## VERIFIED

- [x] Exact existing `java-task-manager` repository inspected before local Git changes; remote empty, configured default `main`, no refs/history/files.
- [x] SSH remote/authentication read verified; no remote mutation, repository creation, rename or push.
- [x] Approved functional architecture/data formats preserved; focused release fixes documented.
- [x] Node 24 clean installation, types, lint, unit/component tests and production build.
- [x] Three-engine production regression coverage, axe, responsive/reflow, storage migration, backup/recovery and failed-write tests.
- [x] Manual keyboard interaction, visible focus and dialog restoration review.
- [x] Dependency advisory correction, full/prod audits and registry signature verification.
- [x] Real production screenshots; historical evidence preserved; public README and third-party notices.
- [x] Verification-only GitHub Actions and Vercel static configuration prepared.

See [verification](phase6-verification.md) for final format/package integrity, extracted equality, image readability and exact counts. Checked items describe local evidence only.

## NOT VERIFIED

- [ ] Screen-reader speech and navigation (VoiceOver/NVDA/JAWS).
- [ ] Actual browser zoom at 200% and 400%; available embedded browser did not expose a working zoom control. Equivalent viewport reflow was tested separately.
- [ ] Physical iOS/Android devices, OS high-contrast and older browser versions.
- [ ] GitHub-hosted CI/Ubuntu execution, branch protection and public source availability after publication.
- [ ] Vercel build, public HTTPS/CDN behavior, live URL, provider rollback or field performance.

## REQUIRES OWNER ACTION

- [x] Independent final Phase 6 review approved by the owner on 2026-11-03.
- [ ] Explicit Git author name/email; effective configuration was unset, so no release commit was created.
- [x] MIT License approved by the owner on 2026-11-03; see [LICENSE](../LICENSE), copyright 2026 Arman Yepiskoposyan.
- [ ] Complete remaining manual assistive-technology/real-zoom/device checks before claiming their coverage.
- [ ] Explicit authorization to publish to the existing repository, followed by a fresh remote inspection and normal history-preserving integration.
- [ ] Explicit authorization to deploy; only then connect Vercel, verify the live site and add its actual URL.

The approved review package remains the historical review snapshot. MIT licensing was subsequently authorized and added to the working project. No new repository, push, deployment, domain purchase or account/cloud-storage feature is authorized by this checklist.
