# Version Bump Options

I've created two versions of `prepare-release.sh` with different approaches to version bumping.

## Option 1: Interactive (`prepare-release-interactive.sh`)

**How it works:**
- Prompts you to choose: patch, minor, major, or skip
- Simple and explicit
- You decide the bump type each time

**Usage:**
```bash
./prepare-release-interactive.sh

# Prompts:
# 1) patch (0.1.0 → 0.1.1) - bug fixes
# 2) minor (0.1.0 → 0.2.0) - new features
# 3) major (0.1.0 → 1.0.0) - breaking changes
# 4) skip
```

**Pros:**
- ✅ Simple and straightforward
- ✅ Full control over version bumps
- ✅ No magic, you decide

**Cons:**
- ❌ Requires manual decision each time
- ❌ Relies on human memory of what changed

---

## Option 2: Auto-Detect (`prepare-release-auto.sh`)

**How it works:**
- Analyzes commits since last version bump
- Looks for conventional commit prefixes:
  - `BREAKING CHANGE:` → major bump
  - `feat:` → minor bump  
  - `fix:` → patch bump
- Shows recommendation and asks for confirmation

**Usage:**
```bash
./prepare-release-auto.sh

# Output:
# 🔍 Analyzing commits since last version bump...
# 🎯 Auto-detected bump type: minor (new features detected)
# Proceed with minor bump? (y/N):
```

**Pros:**
- ✅ Automatically suggests correct bump type
- ✅ Based on your commit history
- ✅ Still asks for confirmation

**Cons:**
- ❌ Slightly more complex
- ❌ Requires consistent use of conventional commits

---

## My Recommendation

**Start with Option 1 (Interactive)** because:
1. You're just getting started with conventional commits
2. It's simpler and more explicit
3. You can always switch to auto-detect later

Once your team is consistently using conventional commits, switch to Option 2 for more automation.

---

## Common Flow (both scripts)

Both scripts do the same thing:

```
1. Fetch and rebase all branches
2. Bump version in package.json
3. Commit: "chore: bump version to X.Y.Z"
4. Push to bluenotes-rebrand
5. Reset release to bluenotes-rebrand
6. Merge community-notes-feature
7. Push to release (triggers GitHub Actions)
8. Cherry-pick version bump back to bluenotes-rebrand
```

**Key improvement:** Version is now committed *before* release, and synchronized back to your dev branch!

---

## To Use

Choose one and rename it:

```bash
# Option 1 (recommended)
mv prepare-release-interactive.sh prepare-release.sh
chmod +x prepare-release.sh

# OR Option 2
mv prepare-release-auto.sh prepare-release.sh
chmod +x prepare-release.sh
```

Then use as normal:
```bash
./prepare-release.sh
```

