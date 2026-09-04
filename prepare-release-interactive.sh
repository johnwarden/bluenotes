#!/usr/bin/env zsh

set -o errexit
set -o pipefail
set -o nounset

echo "🔄 Starting release preparation..."

BLUESKY_RELEASE_TAG=1.109.0

# Fetch latest changes
echo "📥 Fetching latest changes..."
git fetch --all

# Rebase tooling against upstream
git co tooling
echo "🔀 Rebasing tooling against $BLUESKY_RELEASE_TAG..."
git rebase $BLUESKY_RELEASE_TAG
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

# Test merge FIRST before version bumping
echo ""
echo "🧪 Testing merge of community-notes-feature into bluenotes-rebrand..."
git co release
git reset bluenotes-rebrand --hard

# Try the merge - if it fails, abort the script
if ! git merge community-notes-feature -m "Test merge" --no-commit; then
  echo ""
  echo "❌ MERGE CONFLICT DETECTED!"
  echo ""
  echo "Conflicting files:"
  git diff --name-only --diff-filter=U | sed 's/^/  - /'
  echo ""
  echo "⚠️  You need to fix these conflicts in the SOURCE branches!"
  echo ""
  echo "Steps to resolve:"
  echo "  1. Abort this script (will happen automatically)"
  echo "  2. Decide if the fix belongs in bluenotes-rebrand or community-notes-feature"
  echo "  3. Check out that branch and manually sync the conflicting changes"
  echo "  4. Commit and push your changes"
  echo "  5. Run this script again"
  echo ""
  echo "Example: If README.md conflicts, manually sync it between branches:"
  echo "  git checkout bluenotes-rebrand"
  echo "  git show community-notes-feature:README.md  # view their version"
  echo "  # Manually edit README.md to include both changes"
  echo "  git add README.md"
  echo "  git commit -m 'fix: sync README changes with community-notes-feature'"
  echo "  git push"
  echo ""
  echo "Aborting release preparation."
  git merge --abort
  exit 1
fi

# Merge was successful, but don't commit yet
git reset --hard bluenotes-rebrand
echo "✅ Merge test successful - no conflicts!"

# Now do version bumping on bluenotes-rebrand
git co bluenotes-rebrand
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
  
  # Commit version bump on bluenotes-rebrand
  git add package.json
  git commit -m "chore: bump version to $new_version"
  
  # Store the commit hash for cherry-picking
  version_commit=$(git rev-parse HEAD)
  
  # Push to bluenotes-rebrand
  git push
  
  echo "🍒 Cherry-picking version bump to release branch..."
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

