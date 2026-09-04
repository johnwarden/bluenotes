#!/bin/bash

# iOS Development Environment Script
# This script enters a devbox shell configured specifically for iOS development

set -e

echo "🍎 Starting iOS Development Environment..."
echo ""

# Check if devbox is installed
if ! command -v devbox &> /dev/null; then
    echo "❌ devbox is not installed. Please install it first:"
    echo "   curl -fsSL https://get.jetify.com/devbox | bash"
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode is not installed. Please install Xcode from the App Store."
    exit 1
fi

# Check Xcode path
XCODE_PATH=$(xcode-select --print-path 2>/dev/null || echo "")
if [[ "$XCODE_PATH" != "/Applications/Xcode.app/Contents/Developer" ]]; then
    echo "⚠️  Xcode path is not set correctly. Current path: $XCODE_PATH"
    echo "   Run: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
    echo ""
fi

echo "✅ Prerequisites check complete"
echo ""
echo "🚀 Entering iOS development shell..."
echo "   Available commands:"
echo "   - devbox run ios-build    # Build and run iOS app"
echo "   - devbox run ios-clean    # Clean and reinstall CocoaPods"
echo "   - devbox run ios-reset    # Full reset (prebuild + pods)"
echo ""

# Enter devbox shell with iOS config (in ios-dev directory)
cd ios-dev
exec devbox shell
