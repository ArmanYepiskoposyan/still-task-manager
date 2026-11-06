# Existing repository inspection and publication preparation

## Current repository

Official URL: https://github.com/ArmanYepiskoposyan/still-task-manager

The owner renamed the existing `java-task-manager` repository to `still-task-manager` after publication. Its initial release commit, `adc5c49a5a842b1a20036341234159eed02b7acf`, and all 240 release files are preserved. Local `main` tracks `origin/main`; both fetch and push use:

```text
git@github.com:ArmanYepiskoposyan/still-task-manager.git
```

The approved author is configured locally as Arman Yepiskoposyan with the GitHub noreply email supplied by the owner. The MIT License is present. The initial release's [GitHub Actions run passed](https://github.com/ArmanYepiskoposyan/still-task-manager/actions/runs/42183243377). Website deployment remains pending explicit authorization. Future authorized changes should extend the existing `main` history using normal pushes.

## Historical preparation record

Inspection date: 2026-11-03, before the initial commit and owner rename. The following findings and commands record the previous repository name at that time; they are not current remote configuration or instructions to initialize a new history.

### Verified before local Git changes

Public repository metadata reports configured default branch `main`, size 0 and no license. Branch listing returned an empty array. Commits API returned HTTP 409, “Git Repository is empty.” Contents API returned HTTP 404, “This repository is empty.” HTTPS and SSH `git ls-remote --symref` both exited successfully with no advertised HEAD/branch/tag refs. Thus `main` is configured but has no commit yet. No Java files, other source files or remote commit history were available to preserve at inspection time. Evidence: [sanitized inspection record](measurements/phase6-repository-inspection.json).

Read-only inspection commands included:

```sh
git ls-remote --symref https://github.com/ArmanYepiskoposyan/java-task-manager.git HEAD 'refs/heads/*' 'refs/tags/*'
GIT_SSH_COMMAND='ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=10' git ls-remote --symref git@github.com:ArmanYepiskoposyan/java-task-manager.git HEAD 'refs/heads/*' 'refs/tags/*'
```

SSH succeeded using existing authentication and strict host-key checking. No private key was read, copied or changed, and no host-trust bypass was used.

### Local preparation at inspection time

After that inspection, initialized the local working directory with branch `main` and configured `origin` fetch/push URL as:

```text
git@github.com:ArmanYepiskoposyan/java-task-manager.git
```

No repository was created on GitHub; no remote files/history were changed. `.gitignore` excludes dependencies, dist, browser downloads, tool/cache directories, test/coverage output, local environment files, keys, logs and deployment metadata. `.gitattributes` gives text LF line endings and treats PNG/WOFF2 as binary.

The effective `git config --get user.name` and `git config --get user.email` were both unset. **REQUIRES OWNER ACTION:** provide/configure the intended commit author name and email (a GitHub privacy email is an option). No machine-inferred identity was used and no commit was created. Release files can be reviewed in the local index; `.git` metadata is excluded from the ZIP.

### Original publication plan (subsequently completed)

1. Resolve the desired author identity and project-license decision. Complete independent review and any release checklist gates.
2. Reinspect remote metadata and refs immediately before publishing. If any branch/history now exists, stop the empty-repository path: fetch it into an isolated checkout, inspect the tree/history and integrate the reviewed web source on a branch based on its default branch. Preserve existing files and commits. Do not use unrelated-history merging or overwrite files blindly.
3. If the remote is still empty, review `git diff --cached --stat`, `git diff --cached --check` and staged paths/content, then create a local release commit with the explicitly configured author. Confirm `origin` is the exact SSH URL above.
4. Only with publication authorization, push the reviewed branch normally. Never force-push. Verify the complete source, README images and configuration are publicly accessible at the exact CV URL, and inspect the GitHub Actions result.
5. Deployment requires its own explicit authorization. Add a real live-demo link to the README only after the live site is verified.

If historical Java source is later supplied or discovered, retain it with its history and propose a clearly labeled `legacy/java-cli/` location. Moving existing files requires owner approval; no Java archive was invented or files moved in this phase.

### CI preparation at inspection time

`.github/workflows/verify.yml` is one verification job on Ubuntu, triggered by main pushes, pull requests and manual workflow dispatch. It uses the `.nvmrc` Node 24 version, npm 12.2.0, `npm ci`, formatting, types/lint/unit/build, official Playwright browser/dependency installation, all three browser projects and static root/subpath release tests. `contents: read`, checkout credentials are not persisted, and checkout/setup-node actions are pinned to full commit SHAs. There is no deployment job, cloud credential or secret requirement. See [GitHub security guidance](https://docs.github.com/en/actions/reference/security/secure-use).

At preparation time, configuration and project commands were checked locally, while hosted CI and public source access were not yet verified. Publication and the successful hosted run are recorded in the current-status section above. Branch protection remains unverified.
