# Continuous Integration & Deployment Plan

**Project**: Bluenotes Social App  
**Target Platform**: Fly.io  
**CI/CD Platform**: GitHub Actions  
**Last Updated**: October 8, 2025

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Phase 1: Basic CI/CD (Current)](#phase-1-basic-cicd-current)
4. [Phase 2: Semantic Release (Future)](#phase-2-semantic-release-future)
5. [Implementation Steps](#implementation-steps)
6. [Usage Guide](#usage-guide)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Overview

This document outlines a phased approach to implementing CI/CD for the Bluenotes Social App.

**Phase 1** focuses on getting basic automated deployment working:
- Automated deployment on push to `release` branch
- Pre-deployment validation
- Build optimization with caching
- Post-deployment health checks
- Better commit practices

**Phase 2** (future) adds advanced features:
- Automated semantic versioning
- Automatic changelog generation  
- GitHub releases
- Full automation

---

## Current State

### Existing Infrastructure

- **Dockerfile**: Multi-stage build with Go (1.24.5) and Node.js (20)
- **fly.toml**: Configured for `bluenotes-web` app in `sjc` region
- **justfile**: Contains deployment commands with environment variable management
- **production-vars.just**: Centralized production configuration

### Current Release Process

Manual process defined in `prepare-release.sh`:
1. Rebase `tooling` branch against `upstream/main`
2. Rebase `community-notes-feature` against `tooling`
3. Rebase `bluenotes-rebrand` against `tooling`
4. Reset `release` to `bluenotes-rebrand`
5. Merge `community-notes-feature` into `release`
6. Force push to `origin/release`
7. Manual deployment via `just deploy`

### Challenges with Current Process

- ❌ Manual deployment step can be forgotten
- ❌ No automated testing before deployment
- ❌ No health checks after deployment
- ❌ Slow builds without caching

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

## Phase 2: Semantic Release (Future)

**Tracked in branch**: `semantic-release`

Phase 2 adds full automation of versioning and releases. This is ready to implement when needed.

### Additional Features

- ✅ **Automated semantic versioning** based on commit messages
  - `fix:` commits → Patch version (1.2.3 → 1.2.4)
  - `feat:` commits → Minor version (1.2.3 → 1.3.0)
  - `BREAKING CHANGE:` → Major version (1.2.3 → 2.0.0)
- ✅ **Automatic changelog generation** (CHANGELOG.md)
- ✅ **Automatic GitHub releases** with release notes
- ✅ **Automatic version bump** commits
- ✅ **Git tags** for each release

### When to Implement Phase 2

Consider implementing when:
- You want fully automated releases
- You need consistent version numbering
- You want automatic changelogs
- Your team is comfortable with conventional commits

### How to Implement

```bash
# Switch to the semantic-release branch
git checkout semantic-release

# Review the changes
git diff bluenotes-rebrand semantic-release

# Merge when ready
git checkout release
git merge semantic-release
```

See the `semantic-release` branch for full documentation and implementation.

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
# Use your existing prepare-release.sh script
./prepare-release.sh

# This will:
# 1. Merge branches
# 2. Push to release branch
# 3. Trigger GitHub Actions automatically:
#    - Lint, typecheck, build
#    - Deploy to Fly.io
#    - Run health checks
```

### Version Management (Manual for Phase 1)

Update version in `package.json` manually when needed:
```bash
# Edit package.json version field
vim package.json

# Commit the version bump
git commit -am "chore: bump version to 0.2.0"
```

*(This becomes automatic in Phase 2)*

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

**Current Phase**: Phase 1 - Basic CI/CD  
**Status**: ✅ Ready for implementation  
**Action**: Follow [Implementation Steps](#implementation-steps)

**Future Phase**: Phase 2 - Semantic Release  
**Status**: 📦 Ready in `semantic-release` branch  
**Action**: Implement when team is ready for full automation
