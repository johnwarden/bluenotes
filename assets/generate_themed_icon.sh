#!/bin/bash

# Script to generate themed app icons with gradients or solid colors
# Usage: ./generate_themed_icon.sh <platform> <theme> <color1> [color2]
# 
# platform: android or ios
# theme: theme name (e.g., aurora, bonfire, flat_blue)
# color1: start color for gradient or solid color for flat themes
# color2: end color for gradient (optional, omit for solid colors)

set -e

PLATFORM="$1"
THEME="$2"
COLOR1="$3"
COLOR2="$4"

if [ "$#" -lt 3 ]; then
    echo "Usage: $0 <platform> <theme> <color1> [color2]"
    echo "Example: $0 android aurora '#083367' '#9FE8C1'"
    echo "Example: $0 ios flat_blue '#1185FE'"
    exit 1
fi

if [ "$PLATFORM" != "android" ] && [ "$PLATFORM" != "ios" ]; then
    echo "Error: Platform must be 'android' or 'ios'"
    exit 1
fi

# Set logo positioning based on platform
if [ "$PLATFORM" = "android" ]; then
    LOGO_TRANSFORM="translate(200, 250) scale(1.2)"
elif [ "$PLATFORM" = "ios" ]; then
    LOGO_TRANSFORM="translate(155, 205) scale(1.42)"
fi

OUTPUT_FILE="app-icons/${PLATFORM}_icon_core_${THEME}.png"
TEMPLATE_FILE="tmp/${PLATFORM}_${THEME}_template.svg"
LOGO_FILE="tmp/${PLATFORM}_${THEME}_logo.png"
BG_FILE="tmp/${PLATFORM}_${THEME}_bg.png"

# Determine logo color based on theme
case "$THEME" in
    flat_white)
        LOGO_COLOR="#1185FE"  # Blue logo on white background
        ;;
    flat_black|flat_blue)
        LOGO_COLOR="#FFFFFF"  # White logo on black/blue background
        ;;
    *)
        LOGO_COLOR="#FFFFFF"  # Default white logo for gradient themes
        ;;
esac

# Extract path data from logo shape and create template
PATH_DATA=$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//')
sed "s/\$(PATH_DATA)/$PATH_DATA/g; s/\$(LOGO_TRANSFORM)/$LOGO_TRANSFORM/g; s/\$(LOGO_COLOR)/$LOGO_COLOR/g" templates/themed-icon-template.svg > "$TEMPLATE_FILE"

# Create background (gradient or solid)
if [ -n "$COLOR2" ]; then
    # Gradient background
    magick -size 1024x1024 gradient:"$COLOR1-$COLOR2" "$BG_FILE"
else
    # Solid color background
    magick -size 1024x1024 xc:"$COLOR1" "$BG_FILE"
fi

# Render logo (disable anti-aliasing for flat themes to get solid colors)
if [[ "$THEME" == flat_* ]]; then
    magick -background none "$TEMPLATE_FILE" +antialias -resize 1024x1024 -extent 1024x1024 "$LOGO_FILE"
else
    magick -background none "$TEMPLATE_FILE" -resize 1024x1024 -extent 1024x1024 "$LOGO_FILE"
fi

# Composite logo over background
magick "$BG_FILE" "$LOGO_FILE" -composite "$OUTPUT_FILE"

# Clean up temporary files (keep template for debugging)
rm -f "$LOGO_FILE" "$BG_FILE"

echo "Generated: $OUTPUT_FILE"
