.PHONY: ALL_LOGOS
ALL_LOGOS: APP_ICONS ICONS LOGO_COMPONENTS WEB_FAVICONS BSKYWEB_FAVICONS APPLE_TOUCH_ICONS

# Build all themed icons
.PHONY: APP_ICONS 
 APP_ICONS: app-icons/android_icon_core_aurora.png app-icons/ios_icon_core_aurora.png app-icons/android_icon_core_bonfire.png app-icons/ios_icon_core_bonfire.png app-icons/android_icon_default_dark.png app-icons/ios_icon_default_dark.png app-icons/android_icon_default_light.png app-icons/ios_icon_default_light.png app-icons/android_icon_core_flat_black.png app-icons/ios_icon_core_flat_black.png app-icons/android_icon_core_flat_blue.png app-icons/ios_icon_core_flat_blue.png app-icons/android_icon_core_flat_white.png app-icons/ios_icon_core_flat_white.png app-icons/android_icon_core_midnight.png app-icons/ios_icon_core_midnight.png app-icons/android_icon_core_sunrise.png app-icons/ios_icon_core_sunrise.png app-icons/android_icon_core_sunset.png app-icons/ios_icon_core_sunset.png app-icons/icon_default_next.png

# Build all icon variants
.PHONY: ICONS
ICONS: splash-android-icon.png splash-android-icon-dark.png icon-android-notification.png icon-android-foreground.png default-avatar.png logo.png logotype.png favicon.png

# Build web favicon variants
.PHONY: WEB_FAVICONS
WEB_FAVICONS: ../web-build/favicon-16.png ../web-build/favicon-32.png ../web-build/favicon.ico

# Build bskyweb favicon variants
.PHONY: BSKYWEB_FAVICONS
BSKYWEB_FAVICONS: ../bskyweb/static/favicon.png ../bskyweb/static/favicon-16x16.png ../bskyweb/static/favicon-32x32.png ../bskyweb/embedr-static/favicon.png ../bskyweb/embedr-static/favicon-16x16.png ../bskyweb/embedr-static/favicon-32x32.png

# Build apple touch icon variants
.PHONY: APPLE_TOUCH_ICONS
APPLE_TOUCH_ICONS: ../bskyweb/static/apple-touch-icon.png ../web-build/pwa/apple-touch-icon/apple-touch-icon-180.png

# Update all source files with new logo
.PHONY: LOGO_COMPONENTS
LOGO_COMPONENTS: ../src/view/icons/Logo.tsx ../src/view/icons/Logomark.tsx ../src/view/icons/Logotype.tsx ../src/Splash.tsx ../web/index.html ../bskyweb/templates/base.html


tmp/logo_black_unflattened.svg: logo_master.png
	mkdir -p tmp
	magick convert $< -resize 500x441 -alpha extract -gaussian-blur 0x1 -threshold 5% bmp:- | potrace --unit 1  -s --invert --turdsize 20 --opttolerance 0.4 --alphamax 4 -o $@

tmp/logo_black.svg: tmp/logo_black_unflattened.svg
	svgo --multipass -o $@ --input $<

logo.svg: tmp/logo_black.svg
	cp $< $@
	sed "s/viewBox=/fill=\"#1185FE\" viewBox=/g" $< > $@

logo.png: logo.svg
	magick -background none $< $@

community-notes.png: community-notes.svg
	magick -background none $< $@

favicon.png: logo.svg
	magick -background none $< -resize 64x64 $@

tmp/working_black_unflattened.svg: working_input.png
	mkdir -p tmp
	magick convert $< -alpha extract -gaussian-blur 0x1 -threshold 5% bmp:- | potrace --unit 1  -s --invert --turdsize 20 --opttolerance 2.0 --alphamax 1.2 -o $@

tmp/working_black.svg: tmp/working_black_unflattened.svg
	svgo --multipass -o $@ --input $<

logotype.svg: logotype_master.svg
	cp $< $@

logotype.png: logotype.svg
	magick -background none $< $@

app-icons/android_icon_core_aurora.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh android aurora '#083367' '#9FE8C1'

app-icons/ios_icon_core_aurora.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh ios aurora '#083367' '#9FE8C1'

# Bonfire theme - Dark Teal to Orange
app-icons/android_icon_core_bonfire.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh android bonfire '#203E4E' '#EF956D'

app-icons/ios_icon_core_bonfire.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh ios bonfire '#203E4E' '#EF956D'

# Default Dark theme - Dark gradient with starry overlay
app-icons/android_icon_default_dark.png: templates/themed-icon-template.svg templates/stars-overlay.svg logo.svg
	./generate_themed_icon.sh android default_dark '#0F1217' '#074485'; \
	mv app-icons/android_icon_core_default_dark.png app-icons/android_icon_default_dark.png
	magick -background none templates/stars-overlay.svg -resize 1024x1024 tmp/stars.png; \
	magick app-icons/android_icon_default_dark.png tmp/stars.png -composite app-icons/android_icon_default_dark.png

app-icons/ios_icon_default_dark.png: templates/themed-icon-template.svg templates/stars-overlay.svg logo.svg
	./generate_themed_icon.sh ios default_dark '#0F1217' '#074485'; \
	mv app-icons/ios_icon_core_default_dark.png app-icons/ios_icon_default_dark.png
	magick -background none templates/stars-overlay.svg -resize 1024x1024 tmp/stars.png; \
	magick app-icons/ios_icon_default_dark.png tmp/stars.png -composite app-icons/ios_icon_default_dark.png

# Default Light theme - Dark Blue to Light Blue
app-icons/android_icon_default_light.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh android default_light '#0A7AFF' '#59BAFF'
	mv app-icons/android_icon_core_default_light.png app-icons/android_icon_default_light.png

app-icons/ios_icon_default_light.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh ios default_light '#0A7AFF' '#59BAFF'
	mv app-icons/ios_icon_core_default_light.png app-icons/ios_icon_default_light.png

# Flat Black theme - Solid Black
app-icons/android_icon_core_flat_black.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh android flat_black '#000000'

app-icons/ios_icon_core_flat_black.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh ios flat_black '#000000'

# Flat Blue theme - Solid Bluesky Blue
app-icons/android_icon_core_flat_blue.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh android flat_blue '#1185FE'

app-icons/ios_icon_core_flat_blue.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh ios flat_blue '#1185FE'

# Flat White theme - Blue logo on white background (render SVG directly)
app-icons/android_icon_core_flat_white.png: templates/themed-icon-template.svg logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	sed "s/\$$(PATH_DATA)/$$PATH_DATA/g; s/\$$(LOGO_TRANSFORM)/translate(200, 250) scale(1.2)/g; s/\$$(LOGO_COLOR)/#1185FE/g" templates/themed-icon-template.svg > tmp/android_flat_white.svg; \
	magick -size 1024x1024 xc:white tmp/android_flat_white.svg -composite $@; \
	rm -f tmp/android_flat_white.svg

app-icons/ios_icon_core_flat_white.png: templates/themed-icon-template.svg logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	sed "s/\$$(PATH_DATA)/$$PATH_DATA/g; s/\$$(LOGO_TRANSFORM)/translate(155, 205) scale(1.42)/g; s/\$$(LOGO_COLOR)/#1185FE/g" templates/themed-icon-template.svg > tmp/ios_flat_white.svg; \
	magick -size 1024x1024 xc:white tmp/ios_flat_white.svg -composite $@; \
	rm -f tmp/ios_flat_white.svg

# Midnight theme - Dark Navy to Blue
app-icons/android_icon_core_midnight.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh android midnight '#022C5D' '#4078BC'

app-icons/ios_icon_core_midnight.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh ios midnight '#022C5D' '#4078BC'

# Sunrise theme - Red-Orange to Yellow
app-icons/android_icon_core_sunrise.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh android sunrise '#FF6A56' '#FFDE87'

app-icons/ios_icon_core_sunrise.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh ios sunrise '#FF6A56' '#FFDE87'

# Sunset theme - Purple to Pink
app-icons/android_icon_core_sunset.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh android sunset '#6772AF' '#FFA6AC'

app-icons/ios_icon_core_sunset.png: templates/themed-icon-template.svg logo.svg
	./generate_themed_icon.sh ios sunset '#6772AF' '#FFA6AC'

# Default Next theme - White logo on bright blue background (same for iOS and Android)
app-icons/icon_default_next.png: templates/themed-icon-template.svg logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	sed "s/\$$(PATH_DATA)/$$PATH_DATA/g; s/\$$(LOGO_TRANSFORM)/translate(200, 250) scale(1.2)/g; s/\$$(LOGO_COLOR)/white/g" templates/themed-icon-template.svg > tmp/default_next.svg; \
	magick -size 1024x1024 -colorspace sRGB xc:'#006AFF' tmp/default_next_bg.png; \
	magick -background none -colorspace sRGB tmp/default_next.svg -resize 1024x1024 -extent 1024x1024 tmp/default_next_logo.png; \
	magick tmp/default_next_bg.png tmp/default_next_logo.png -composite $@; \
	rm -f tmp/default_next.svg tmp/default_next_bg.png tmp/default_next_logo.png

icons/logomark.svg: templates/logomark-template.svg logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	sed "s/\$$(PATH_DATA)/$$PATH_DATA/g" templates/logomark-template.svg > $@

../src/view/icons/Logo.tsx: logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	VIEWBOX=$$(grep -o 'viewBox="[^"]*"' logo.svg | sed 's/viewBox="//;s/"//'); \
	WIDTH=$$(echo "$$VIEWBOX" | cut -d' ' -f3); \
	HEIGHT=$$(echo "$$VIEWBOX" | cut -d' ' -f4); \
	ASPECT_RATIO=$$(echo "scale=6; $$HEIGHT / $$WIDTH" | bc -l); \
	sed -i \
		-e '/^[[:space:]]*const ratio = /s/const ratio = .*/const ratio = '"$$ASPECT_RATIO"'/' \
		-e '/^[[:space:]]*viewBox="/s/viewBox="[^"]*"/viewBox="'"$$VIEWBOX"'"/' \
		-e '/^[[:space:]]*<Path/,/^[[:space:]]*\/>/ s/d="[^"]*"/d="'"$$PATH_DATA"'"/' \
		../src/view/icons/Logo.tsx

../src/view/icons/Logomark.tsx: logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	VIEWBOX=$$(grep -o 'viewBox="[^"]*"' logo.svg | sed 's/viewBox="//;s/"//'); \
	WIDTH=$$(echo "$$VIEWBOX" | cut -d' ' -f3); \
	HEIGHT=$$(echo "$$VIEWBOX" | cut -d' ' -f4); \
	ASPECT_RATIO=$$(echo "scale=6; $$HEIGHT / $$WIDTH" | bc -l); \
	sed -i \
		-e '/^[[:space:]]*const ratio = /s/const ratio = .*/const ratio = '"$$ASPECT_RATIO"'/' \
		-e '/^[[:space:]]*viewBox="/s/viewBox="[^"]*"/viewBox="'"$$VIEWBOX"'"/' \
		-e '/^[[:space:]]*<Path/,/^[[:space:]]*\/>/ s/d="[^"]*"/d="'"$$PATH_DATA"'"/' \
		$@

../src/view/icons/Logotype.tsx: logotype_master.svg
	VIEWBOX=$$(grep -o 'viewBox="[^"]*"' $< | sed 's/viewBox="//;s/"//'); \
	WIDTH=$$(echo "$$VIEWBOX" | cut -d' ' -f3); \
	HEIGHT=$$(echo "$$VIEWBOX" | cut -d' ' -f4); \
	ASPECT_RATIO=$$(echo "scale=6; $$HEIGHT / $$WIDTH" | bc -l); \
	mkdir -p tmp; \
	sed -n '1,/height={Number(size) \* ratio}>/p' $@ > tmp/logotype_header.tsx; \
	grep -o '<path[^>]*\/>' $< | sed 's/<path/      <Path/g; s/\/>/\n      \/>/g' >> tmp/logotype_header.tsx; \
	echo "    </Svg>" >> tmp/logotype_header.tsx; \
	echo "  )" >> tmp/logotype_header.tsx; \
	echo "}" >> tmp/logotype_header.tsx; \
	echo "" >> tmp/logotype_header.tsx; \
	sed -i \
		-e '/^[[:space:]]*const ratio = /s/const ratio = .*/const ratio = '"$$ASPECT_RATIO"'/' \
		-e '/^[[:space:]]*viewBox="/s/viewBox="[^"]*"/viewBox="'"$$VIEWBOX"'"/' \
		tmp/logotype_header.tsx; \
	mv tmp/logotype_header.tsx $@


# Update the Splash component with the new logo path data and correct dimensions
../src/Splash.tsx: logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	VIEWBOX=$$(grep -o 'viewBox="[^"]*"' logo.svg | sed 's/viewBox="//;s/"//'); \
	WIDTH=$$(echo "$$VIEWBOX" | cut -d' ' -f3); \
	HEIGHT=$$(echo "$$VIEWBOX" | cut -d' ' -f4); \
	ASPECT_RATIO=$$(echo "scale=6; $$HEIGHT / $$WIDTH" | bc -l); \
	sed -i \
		-e '/^[[:space:]]*const width = /s/const width = .*/const width = 1000/' \
		-e '/^[[:space:]]*const height = /s/const height = .*/const height = width * ('"$$ASPECT_RATIO"')/' \
		-e '/^[[:space:]]*viewBox="/s/viewBox="[^"]*"/viewBox="'"$$VIEWBOX"'"/' \
		-e '/^[[:space:]]*<Path/,/^[[:space:]]*\/>/ s/d="[^"]*"/d="'"$$PATH_DATA"'"/' \
		../src/Splash.tsx


../bskyembed/assets/logo.svg: logo.svg
	magick -background none $< -resize 320x286  $@

# Update web splash screens with new logo
../web/index.html: logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	VIEWBOX=$$(grep -o 'viewBox="[^"]*"' logo.svg | sed 's/viewBox="//;s/"//'); \
	sed -i \
		-e '/<!-- Bluesky SVG -->/,/<\/svg>/ s/viewBox="[^"]*"/viewBox="'"$$VIEWBOX"'"/' \
		-e '/<!-- Bluesky SVG -->/,/<\/svg>/ s/d="[^"]*"/d="'"$$PATH_DATA"'"/' \
		../web/index.html

../bskyweb/templates/base.html: logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	VIEWBOX=$$(grep -o 'viewBox="[^"]*"' logo.svg | sed 's/viewBox="//;s/"//'); \
	sed -i \
		-e '/<!-- Bluesky SVG -->/,/<\/svg>/ s/viewBox="[^"]*"/viewBox="'"$$VIEWBOX"'"/' \
		-e '/<!-- Bluesky SVG -->/,/<\/svg>/ s/d="[^"]*"/d="'"$$PATH_DATA"'"/' \
		../bskyweb/templates/base.html


# Android splash icons (already have templates)
splash-android-icon.png: templates/splash-android-icon-template.svg logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	sed "s/\$$(PATH_DATA)/$$PATH_DATA/g" templates/splash-android-icon-template.svg > tmp/splash-android-icon.svg; \
	magick -background none tmp/splash-android-icon.svg -colorspace Gray -depth 8 $@

splash-android-icon-dark.png: templates/splash-android-icon-dark-template.svg logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	sed "s/\$$(PATH_DATA)/$$PATH_DATA/g" templates/splash-android-icon-dark-template.svg > tmp/splash-android-icon-dark.svg; \
	magick -background none tmp/splash-android-icon-dark.svg -colorspace Gray -depth 8 $@

# Android notification icon
icon-android-notification.png: templates/icon-android-notification-template.svg logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	sed "s/\$$(PATH_DATA)/$$PATH_DATA/g" templates/icon-android-notification-template.svg > tmp/icon-android-notification.svg; \
	magick -background none tmp/icon-android-notification.svg $@

# Android foreground icon
icon-android-foreground.png: templates/icon-android-foreground-template.svg logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	sed "s/\$$(PATH_DATA)/$$PATH_DATA/g" templates/icon-android-foreground-template.svg > tmp/icon-android-foreground.svg; \
	magick -background none tmp/icon-android-foreground.svg $@

# Default avatar
default-avatar.png: templates/default-avatar-template.svg logo.svg
	PATH_DATA=$$(grep -o 'd="[^"]*"' logo.svg | sed 's/d="//;s/"//'); \
	sed "s/\$$(PATH_DATA)/$$PATH_DATA/g" templates/default-avatar-template.svg > tmp/default-avatar.svg; \
	magick -background none tmp/default-avatar.svg -depth 8 $@

# Web favicon files (generated from favicon.png)
../web-build/favicon-16.png: favicon.png
	mkdir -p ../web-build
	magick $< -resize 16x16 $@

../web-build/favicon-32.png: favicon.png
	mkdir -p ../web-build
	magick $< -resize 32x32 $@

../web-build/favicon.ico: favicon.png
	mkdir -p ../web-build
	magick $< -resize 16x16 tmp/favicon-16.png
	magick $< -resize 32x32 tmp/favicon-32.png
	magick $< -resize 48x48 tmp/favicon-48.png
	magick tmp/favicon-16.png tmp/favicon-32.png tmp/favicon-48.png $@
	rm -f tmp/favicon-16.png tmp/favicon-32.png tmp/favicon-48.png

# Bskyweb static favicon files
../bskyweb/static/favicon.png: favicon.png
	mkdir -p ../bskyweb/static
	cp $< $@

../bskyweb/static/favicon-16x16.png: favicon.png
	mkdir -p ../bskyweb/static
	magick $< -resize 16x16 $@

../bskyweb/static/favicon-32x32.png: favicon.png
	mkdir -p ../bskyweb/static
	magick $< -resize 32x32 $@

# Bskyweb embedr-static favicon files
../bskyweb/embedr-static/favicon.png: favicon.png
	mkdir -p ../bskyweb/embedr-static
	cp $< $@

../bskyweb/embedr-static/favicon-16x16.png: favicon.png
	mkdir -p ../bskyweb/embedr-static
	magick $< -resize 16x16 $@

../bskyweb/embedr-static/favicon-32x32.png: favicon.png
	mkdir -p ../bskyweb/embedr-static
	magick $< -resize 32x32 $@

# Apple touch icon files (180x180 for iOS)
../bskyweb/static/apple-touch-icon.png: logo.svg
	mkdir -p ../bskyweb/static
	magick -background none $< -resize 180x180 $@

../web-build/pwa/apple-touch-icon/apple-touch-icon-180.png: logo.svg
	mkdir -p ../web-build/pwa/apple-touch-icon
	magick -background none $< -resize 180x180 $@


