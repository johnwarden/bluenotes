# Continuous Integration & Deployment Plan

**Project**: Bluenotes Social App  
**Target Platform**: Fly.io  
**CI/CD Platform**: GitHub Actions  
**Last Updated**: October 11, 2025

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Phase 1: Basic CI/CD (Current)](#phase-1-basic-cicd-current)
4. [Phase 2: Semantic Versioning (Future)](#phase-2-semantic-versioning-future)
5. [Phase 3: Full Automation (Future)](#phase-3-full-automation-future)
6. [Implementation Steps](#implementation-steps)
7. [Usage Guide](#usage-guide)
8. [Rollback Procedures](#rollback-procedures)
9. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Overview

This document outlines a phased approach to implementing CI/CD for the Bluenotes Social App.

**Phase 1** (Current) focuses on getting basic automated deployment working:
- Automated deployment on push to `release` branch
- Pre-deployment validation with caching
- Manual version management via `prepare-release-interactive.sh`
- Post-deployment health checks
- Optional commit message guidelines (not enforced)

**Phase 2** (Future) adds semantic versioning:
- Auto-detect version bumps from conventional commits
- Modify `prepare-release-interactive.sh` to use semantic-release
- Automatic changelog generation
- Still manually triggered

**Phase 3** (Future) adds full automation:
- Convert release script to GitHub Actions workflow
- Auto-trigger on pushes to upstream/main, community-notes-feature, bluenotes-rebrand
- Automatic branch merging and deployment
- GitHub releases with release notes

---

## Current State

### Existing Infrastructure

- **Dockerfile**: Multi-stage build with Go (1.24.5) and Node.js (20)
- **fly.toml**: Configured for `bluenotes-web` app in `sjc` region
- **justfile**: Contains deployment commands with environment variable management
- **production-vars.just**: Centralized production configuration

### Current Release Process

Manual process defined in `prepare-release-interactive.sh`:
1. Rebase `tooling` branch against `upstream/main`
2. Rebase `community-notes-feature` against `tooling`
3. Rebase `bluenotes-rebrand` against `tooling`
4. Prompt for version bump (major/minor/patch/skip)
5. Update version in `package.json` and commit
6. Cherry-pick version bump back to `bluenotes-rebrand`
7. Reset `release` to `bluenotes-rebrand`
8. Merge `community-notes-feature` into `release`
9. Force push to `origin/release`
10. **Automatic deployment via GitHub Actions**

### Improvements from Phase 1

- ✅ ~~Manual deployment step~~ → Now automatic via GitHub Actions
- ✅ ~~No automated testing~~ → Lint, typecheck, build validation
- ✅ ~~No health checks~~ → Post-deployment health validation
- ✅ ~~Slow builds~~ → Build optimization with caching (2-4 min vs 5-8 min)

### Remaining Manual Steps (to be automated in future phases)

- 📝 Manual version bump decision (Phase 2 will auto-detect)
- 📝 Manual trigger of release script (Phase 3 will auto-trigger)
- 📝 Manual branch rebasing (Phase 3 will automate)

---

## Phase 1: Basic CI/CD (Current)

### Goals

- ✅ Automatic deployment to Fly.io on push to `release` branch
- ✅ Pre-deployment validation (linting, type checking, build tests)
- ✅ Build optimization with caching (2-4 min builds vs 5-8 min)
- ✅ Post-deployment health checks
- ✅ Zero-downtime deployments (canary strategy)
- ✅ Easy rollback capability
- 📝 Optional commit message tools (not enforced)

### Architecture

```
┌─────────────────────┐
│  Pre-Deployment     │
│  - Lint             │
│  - Type Check       │
│  - Build Test       │
│  - Cache Deps       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Deploy             │
│  - Fly.io Deploy    │
│  - Canary Strategy  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Post-Deployment    │
│  - Health Check     │
│  - Validation       │
└─────────────────────┘
```

### Key Components

1. **GitHub Actions Workflow** (`.github/workflows/deploy-production.yml`)
   - Pre-deployment validation with caching
   - Fly.io deployment
   - Health checks

2. **Commit Tools** (optional)
   - `commitlint` installed for validation (if you enable hooks)
   - `commitizen` for interactive commit guide (`yarn commit`)
   - `.gitmessage` template available
   - **Not enforced** - use at your discretion

3. **Build Optimization**
   - Dependency caching (node_modules, yarn cache)
   - TypeScript build caching
   - 40-60% faster builds with cache hits

### GitHub Actions Workflow

**File**: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [release]

concurrency:
  group: production-deployment
  cancel-in-progress: false

jobs:
  pre-deployment:
    name: Pre-Deployment Validation
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'

      # Advanced caching for faster builds
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: |
            node_modules
            ~/.cache/yarn
            .yarn/cache
          key: ${{ runner.os }}-yarn-${{ hashFiles('**/yarn.lock') }}
          restore-keys: |
            ${{ runner.os }}-yarn-

      - name: Cache TypeScript build
        uses: actions/cache@v3
        with:
          path: |
            .tsbuildinfo
            **/.tsbuildinfo
          key: ${{ runner.os }}-typescript-${{ hashFiles('**/tsconfig*.json') }}
          restore-keys: |
            ${{ runner.os }}-typescript-

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Lint
        run: yarn lint --quiet

      - name: Type check
        run: yarn typecheck

      - name: Build test
        run: yarn build-web

  deploy:
    name: Deploy to Fly.io
    needs: pre-deployment
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Flyctl
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly.io
        run: |
          fly deploy \
            --build-arg EXPO_PUBLIC_ENV=production \
            --build-arg EXPO_PUBLIC_RELEASE_VERSION=$(node -p "require('./package.json').version") \
            --build-arg EXPO_PUBLIC_BUNDLE_IDENTIFIER=bluenotes-production \
            --build-arg EXPO_PUBLIC_CHAT_PROXY_DID=did:web:api.bsky.chat \
            --build-arg EXPO_PUBLIC_BLUESKY_PROXY_DID=did:web:api.bsky.app \
            --build-arg EXPO_PUBLIC_SENTRY_DSN= \
            --env ATP_APPVIEW_HOST=https://public.api.bsky.app \
            --env OGCARD_HOST=https://ogcard.cdn.bsky.app \
            --env LINK_HOST= \
            --env DEBUG=false \
            --env DOMAIN=bluenotes.social \
            --env CORS_ALLOWED_ORIGINS=https://bluenotes.social,https://www.bluenotes.social,https://bluenotes-web.fly.dev \
            --env STATIC_CDN_HOST= \
            --env BSKY_CANONICAL_INSTANCE=false \
            --env ROBOTS_DISALLOW_ALL=false \
            --env GOLOG_LOG_LEVEL=info \
            --env GEOLOCATION_URL=/ipcc \
            --remote-only \
            --strategy canary
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  post-deployment:
    name: Post-Deployment Validation
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Wait for deployment to stabilize
        run: sleep 30

      - name: Health check
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://bluenotes.social/)
          if [ "$response" != "200" ]; then
            echo "Health check failed with status code: $response"
            exit 1
          fi
          echo "Health check passed (HTTP $response)"

      - name: Deployment notification
        run: |
          echo "✅ Successfully deployed to https://bluenotes.social/"
```

### Commit Message Guidelines (Recommended)

We recommend [Conventional Commits](https://www.conventionalcommits.org/) format but don't enforce it:

```
<type>(<scope>): <subject>
```

**Types**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples**:
```bash
# Conventional commits (recommended)
git commit -m "feat: add rate notes screen"
git commit -m "fix: resolve navigation bug"
git commit -m "chore: update dependencies"

# Or use interactive guide
yarn commit

# Or just normal commits (also fine)
git commit -m "add rate notes screen"
```

**Benefits of using conventional commits**:
- Better commit history
- Easier to understand changes
- Prepares for Phase 2 (automated versioning)

**Note**: Commit validation is available but not enabled. See `COMMITIZEN_DECISION.md` if you want to enable it later.

---

## Phase 2: Semantic Versioning (Future)

**Reference**: `semantic-release` branch contains dependencies and configuration examples

Phase 2 enhances `prepare-release-interactive.sh` to auto-detect version bumps from conventional commits.

### Goals

- 🎯 Auto-detect version bumps from commit history
  - `fix:` commits → Patch version (1.2.3 → 1.2.4)
  - `feat:` commits → Minor version (1.2.3 → 1.3.0)
  - `BREAKING CHANGE:` → Major version (1.2.3 → 2.0.0)
- 🎯 Automatic changelog generation (CHANGELOG.md)
- 🎯 Git tags for each release
- 📝 Still manually triggered (automation comes in Phase 3)

### Implementation Approach

**Modify `prepare-release-interactive.sh`**:

1. Add semantic-release dependency
2. Analyze commits since last release
3. Suggest version bump (but allow override)
4. Generate changelog automatically
5. Create git tag

**Example flow**:
```bash
$ ./prepare-release-interactive.sh

🔍 Analyzing commits since v0.1.2...
Found:
  - 3 feat: commits
  - 2 fix: commits
  - 0 BREAKING CHANGE commits

💡 Recommended version: 0.2.0 (minor bump)

Choose version bump:
1) Use recommended (0.2.0)
2) Major (1.0.0)
3) Minor (0.2.0)
4) Patch (0.1.3)
5) Custom
6) Skip version bump

Your choice: _
```

### When to Implement Phase 2

Consider implementing when:
- You're consistently using conventional commits
- You want automatic changelog generation
- You need clear version history
- Manual version decisions feel tedious

### Dependencies

Reference the `semantic-release` branch for:
- `semantic-release` and plugins
- `@commitlint` configuration
- Optional: `commitizen` for commit guidance

---

## Phase 3: Full Automation (Future)

Phase 3 converts the release script into a fully automated GitHub Actions workflow.

### Goals

- 🎯 **Auto-trigger on upstream changes**
  - Watch `upstream/main` for Bluesky updates
  - Watch `community-notes-feature` for feature updates
  - Watch `bluenotes-rebrand` for branding updates
- 🎯 **Automatic branch management**
  - Auto-rebase branches
  - Auto-merge using diamond strategy
  - Auto-resolve simple conflicts
- 🎯 **Automatic deployment**
  - Version bump, changelog, release
  - Deploy to Fly.io
  - Create GitHub release

### Architecture

```
┌─────────────────────────────────────┐
│  Trigger Events                     │
│  - Push to upstream/main            │
│  - Push to community-notes-feature  │
│  - Push to bluenotes-rebrand        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Branch Sync Workflow               │
│  1. Rebase tooling ← upstream/main  │
│  2. Rebase features ← tooling       │
│  3. Rebase rebrand ← tooling        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Release Workflow                   │
│  1. Analyze commits                 │
│  2. Auto-version bump               │
│  3. Generate changelog              │
│  4. Merge to release                │
│  5. Push & tag                      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Deploy Workflow (existing)         │
│  - Pre-deployment validation        │
│  - Fly.io deployment                │
│  - Post-deployment checks           │
└─────────────────────────────────────┘
```

### Workflow: Auto-Trigger Release

**File**: `.github/workflows/auto-release.yml` (to be created in Phase 3)

```yaml
name: Auto Release

on:
  push:
    branches:
      - upstream/main
      - community-notes-feature
      - bluenotes-rebrand
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync-and-release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for rebasing
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Configure Git
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"

      - name: Sync branches
        run: |
          # Rebase tooling against upstream/main
          git checkout tooling
          git rebase upstream/main

          # Rebase feature branches
          git checkout community-notes-feature
          git rebase tooling

          git checkout bluenotes-rebrand
          git rebase tooling

      - name: Detect version bump
        id: version
        run: |
          # Use semantic-release to analyze commits
          # Output: new_version, changelog

      - name: Update version
        run: |
          npm version ${{ steps.version.outputs.new_version }} --no-git-tag-version
          git commit -am "chore: bump version to ${{ steps.version.outputs.new_version }}"

      - name: Merge to release
        run: |
          git checkout release
          git reset --hard bluenotes-rebrand
          git merge community-notes-feature -m "Merge features for release"
          git tag v${{ steps.version.outputs.new_version }}

      - name: Push changes
        run: |
          git push origin release --force
          git push origin v${{ steps.version.outputs.new_version }}

      # Deployment workflow triggers automatically from push to release
```

### Safety Considerations

- ⚠️ **Conflict handling**: Script should fail gracefully on merge conflicts
- ⚠️ **Notifications**: Notify on failures (Slack, email, etc.)
- ⚠️ **Manual override**: Keep `workflow_dispatch` for manual intervention
- ⚠️ **Branch protection**: Ensure release branch protection allows bot pushes

### When to Implement Phase 3

Consider implementing when:
- Phase 2 is stable and well-tested
- Team is comfortable with automated merges
- Diamond merge strategy is well-established
- Monitoring and alerting are in place

### Migration Path

1. Test the workflow on a separate test branch first
2. Run in parallel with manual process for 2-4 weeks
3. Monitor for issues and edge cases
4. Gradually increase confidence
5. Switch fully to automated process

---

## Implementation Steps

### One-Time Setup (15 minutes)

1. **Generate Fly.io API token**:
   ```bash
   fly tokens create deploy --app bluenotes-web
   ```

2. **Add GitHub secret**:
   - Go to: GitHub repo → Settings → Secrets and variables → Actions
   - Add `FLY_API_TOKEN` with the token value

3. **Configure branch protection** (optional but recommended):
   - GitHub repo → Settings → Branches → Add rule for `release`
   - Allow administrator bypass for force pushes
   - Require status checks to pass

4. **Setup git commit template** (optional):
   ```bash
   git config commit.template .gitmessage
   ```

### Testing the Setup

1. **Test commit validation locally**:
   ```bash
   # This should fail
   git commit --allow-empty -m "bad commit"
   
   # This should succeed
   git commit --allow-empty -m "chore: test commit validation"
   ```

2. **Test the workflow**:
   - Push to `release` branch using your normal `prepare-release.sh` process
   - Watch the workflow run in GitHub Actions tab
   - Verify deployment at https://bluenotes.social/

---

## Usage Guide

### Daily Development

**Making commits**:
   ```bash
# Option 1: Interactive mode (recommended)
yarn commit

# Option 2: Manual conventional commit
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
```

**Deployment**:
    ```bash
# Use the interactive release script
./prepare-release-interactive.sh

# This will:
# 1. Rebase all branches against upstream
# 2. Prompt for version bump (major/minor/patch/skip)
# 3. Update package.json and commit
# 4. Cherry-pick version bump back to bluenotes-rebrand
# 5. Merge branches to release
# 6. Push to release branch
# 7. Trigger GitHub Actions automatically:
#    - Lint, typecheck, build
#    - Deploy to Fly.io
#    - Run health checks
```

### Version Management (Interactive for Phase 1)

The `prepare-release-interactive.sh` script handles versioning:

```bash
$ ./prepare-release-interactive.sh

...

Choose version bump:
1) Major (1.0.0)
2) Minor (0.2.0) 
3) Patch (0.1.4)
4) Skip version bump

Your choice: _
```

*(Phase 2 will add auto-detection with suggestions based on commits)*

---

## Rollback Procedures

### Option 1: Fly.io Rollback (Fastest - 30 seconds)

```bash
# View deployment history
fly releases

# Rollback to previous version
fly releases rollback
```

### Option 2: Git Rollback (5-10 minutes)

```bash
# View recent commits
git log --oneline release | head -10

# Reset to previous commit
git reset --hard <commit-hash>

# Force push to trigger redeployment
git push origin release --force
```

### Option 3: Redeploy Previous Version

```bash
# Checkout working version
git checkout <working-commit-hash>

# Force push to release
git push origin HEAD:release --force
```

### Rollback Decision Tree

```
Is the app completely broken?
├─ YES → Use Option 1 (Fly.io rollback) - 30 seconds
└─ NO → Is it a code issue?
    ├─ YES → Use Option 2 or 3 (Git rollback) - 5-10 minutes
    └─ NO → Investigate and fix
```

---

## Monitoring & Maintenance

### What to Monitor

1. **GitHub Actions status**
   - Check for failed workflows
   - Review deployment logs

2. **Fly.io metrics**
   ```bash
   fly status
   fly logs
   ```

3. **Application health**
   - Monitor https://bluenotes.social/
   - Check for errors

### Regular Maintenance

**Weekly**:
- Review deployment logs
- Check for failed workflows

**Monthly**:
- Update dependencies
- Review security advisories

**Quarterly**:
- Rotate Fly.io API tokens
- Review branch protection settings

---

## Security Considerations

### GitHub Secrets

**FLY_API_TOKEN**:
- Generate: `fly tokens create deploy --app bluenotes-web`
- Scope: Deploy access only
- Rotation: Every 6-12 months

### Branch Protection

Recommended settings for `release` branch:
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Include administrators (with bypass allowed for force push)
- ✅ Restrict who can push to matching branches (admins only)

---

## Troubleshooting

### Common Issues

**Issue**: Workflow doesn't trigger
- **Cause**: Workflow file not in `.github/workflows/`
- **Solution**: Ensure file is committed and pushed

**Issue**: Fly.io deployment fails
- **Cause**: Invalid API token or configuration
- **Solution**: Regenerate token, check `fly.toml` configuration

**Issue**: Health check fails after deployment
- **Cause**: Application not fully started
- **Solution**: Increase wait time in post-deployment step

**Issue**: Cache not working
- **Cause**: Cache key mismatch
- **Solution**: Check `yarn.lock` hasn't changed unexpectedly

---

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Fly.io GitHub Actions](https://fly.io/docs/launch/continuous-deployment-with-github-actions/)
- [Fly.io Deployment Strategies](https://fly.io/docs/launch/deploy/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

## Next Steps

### Phase 1 - Basic CI/CD ✅ COMPLETE

**Status**: ✅ Deployed and working  
**Key Scripts**: 
- `prepare-release-interactive.sh` - Manual release process
- `.github/workflows/build-and-push-bluenotesweb-flyio.yaml` - Automatic deployment

**What's Working**:
- ✅ Automated deployment on push to `release` branch
- ✅ Pre-deployment validation (lint, typecheck, build)
- ✅ Build optimization with caching
- ✅ Post-deployment health checks
- ✅ Zero-downtime canary deployments

### Phase 2 - Semantic Versioning 📋 PLANNED

**Goal**: Add auto-detection of version bumps from conventional commits  
**Approach**: Enhance `prepare-release-interactive.sh` with semantic-release  
**Prerequisites**: 
- Team consistently using conventional commits
- Reference `semantic-release` branch for dependencies

**Key Changes**:
- Analyze commits since last release
- Suggest version bump automatically
- Generate CHANGELOG.md
- Create git tags
- Still manually triggered

### Phase 3 - Full Automation 🎯 FUTURE

**Goal**: Convert release script to automated GitHub Actions workflow  
**Approach**: New workflow that triggers on pushes to key branches  
**Prerequisites**:
- Phase 2 stable and tested
- Team comfortable with automated merges
- Monitoring and alerting in place

**Key Features**:
- Auto-trigger on push to `upstream/main`, `community-notes-feature`, `bluenotes-rebrand`
- Automatic branch syncing and merging
- Automatic versioning and deployment
- GitHub releases with release notes
