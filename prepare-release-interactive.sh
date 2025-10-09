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

# Version bumping
echo ""
echo "📦 Current version: $(node -p "require('./package.json').version")"
echo "❓ What type of version bump?"
echo "   1) patch (0.1.0 → 0.1.1) - bug fixes"
echo "   2) minor (0.1.0 → 0.2.0) - new features"
echo "   3) major (0.1.0 → 1.0.0) - breaking changes"
echo "   4) skip (no version bump)"
echo ""
read "bump_choice?Enter choice (1-4): "

case $bump_choice in
  1)
    bump_type="patch"
    ;;
  2)
    bump_type="minor"
    ;;
  3)
    bump_type="major"
    ;;
  4)
    echo "⏭️  Skipping version bump"
    bump_type=""
    ;;
  *)
    echo "❌ Invalid choice, skipping version bump"
    bump_type=""
    ;;
esac

if [[ -n "$bump_type" ]]; then
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

echo ""
echo "✨ Release preparation complete!"
echo "🔗 GitHub Actions will now deploy automatically"
echo "👀 Watch the deployment: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"

