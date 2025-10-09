#!/usr/bin/env zsh

set -o errexit
set -o pipefail
set -o nounset

echo "🔄 Starting release preparation..."

# Fetch latest changes
echo "📥 Fetching latest changes..."
git fetch

# Rebase tooling against upstream
git co tooling
echo "🔀 Rebasing tooling against upstream/main..."
git rebase upstream/main
git push --force

# Rebase community-notes-feature against tooling
git co community-notes-feature
echo "🔀 Rebasing community-notes-feature against tooling..."
git rebase tooling
git push --force

# Rebase bluenotes-rebrand against tooling
git co bluenotes-rebrand
echo "🔀 Rebasing bluenotes-rebrand against tooling..."
git rebase tooling
git push --force

# Auto-detect version bump type from commits
echo ""
echo "📦 Current version: $(node -p "require('./package.json').version")"
echo "🔍 Analyzing commits since last version bump..."

# Get commits since last version bump commit
last_version_commit=$(git log --grep="^chore: bump version" --format="%H" -n 1 || echo "")

if [[ -n "$last_version_commit" ]]; then
  commit_range="$last_version_commit..HEAD"
else
  # If no version bump found, check last 20 commits
  commit_range="HEAD~20..HEAD"
fi

# Analyze commit messages
has_breaking=false
has_feat=false
has_fix=false

while IFS= read -r commit_msg; do
  if echo "$commit_msg" | grep -q "BREAKING CHANGE"; then
    has_breaking=true
  elif echo "$commit_msg" | grep -q "^feat"; then
    has_feat=true
  elif echo "$commit_msg" | grep -q "^fix"; then
    has_fix=true
  fi
done < <(git log $commit_range --format="%s%n%b")

# Determine bump type
if $has_breaking; then
  bump_type="major"
  bump_reason="breaking changes detected"
elif $has_feat; then
  bump_type="minor"
  bump_reason="new features detected"
elif $has_fix; then
  bump_type="patch"
  bump_reason="bug fixes detected"
else
  bump_type="patch"
  bump_reason="default (no conventional commits detected)"
fi

echo "🎯 Auto-detected bump type: $bump_type ($bump_reason)"
echo ""
read "confirm?Proceed with $bump_type bump? (y/N): "

if [[ "$confirm" =~ ^[Yy]$ ]]; then
  echo "⬆️  Bumping version ($bump_type)..."
  npm version $bump_type --no-git-tag-version
  new_version=$(node -p "require('./package.json').version")
  echo "✅ Version bumped to $new_version"
  
  # Commit version bump
  git add package.json
  git commit -m "chore: bump version to $new_version"
  
  # Store the commit hash for cherry-picking later
  version_commit=$(git rev-parse HEAD)
  
  # Push to bluenotes-rebrand
  git push
else
  echo "⏭️  Skipping version bump"
  version_commit=""
fi

# Prepare release branch
git co release
echo "🔄 Resetting release to bluenotes-rebrand..."
git reset bluenotes-rebrand --hard
echo "🔀 Merging community-notes-feature into release..."
git merge community-notes-feature -m "Merged branch community-notes-feature into release"
echo "🚀 Force pushing to release..."
git push --force

# If we bumped the version, cherry-pick it back to bluenotes-rebrand
if [[ -n "$version_commit" ]]; then
  echo "🍒 Cherry-picking version bump back to bluenotes-rebrand..."
  git co bluenotes-rebrand
  git cherry-pick $version_commit
  git push
  git co release
fi

echo ""
echo "✨ Release preparation complete!"
echo "🔗 GitHub Actions will now deploy automatically"
echo "👀 Watch the deployment: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"

