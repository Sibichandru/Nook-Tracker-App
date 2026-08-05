#!/usr/bin/env bash
#
# Regenerates every launcher/splash PNG from the vendored brand SVGs.
#
#   npm run icons
#
# Source of truth is assets/brand/*.svg. To change the app's look, edit or
# replace an SVG there and re-run this — never hand-edit the PNGs in
# assets/images/, they are build output and will be overwritten.
#
# Deliberately excludes the wordmark: "Nook" is set in DM Serif Display, which
# the rasteriser has no access to, so exporting text through this pipeline
# produces mangled glyphs. The wordmark is drawn at runtime instead
# (components/ui/NookMark.tsx), where the real font is loaded.
#
# Requires ImageMagick (`convert`).

set -euo pipefail

cd "$(dirname "$0")/.."

BRAND="assets/brand"
OUT="assets/images"

if ! command -v convert >/dev/null 2>&1; then
  echo "error: ImageMagick 'convert' not found. Install imagemagick and retry." >&2
  exit 1
fi

mkdir -p "$OUT"

render() {
  local src="$1" dst="$2" size="$3" bg="$4"
  convert -background "$bg" "$BRAND/$src" -resize "${size}x${size}" "$OUT/$dst"
  echo "  $dst  ${size}x${size}"
}

echo "Generating launcher icons from $BRAND …"

# App icon. Full-bleed square: iOS and older Android launchers apply their own
# corner mask, so shipping pre-rounded corners here would double-round it.
render nook-icon.svg icon.png 1024 none

# Splash. Mark only, transparent — expo-splash-screen centres it on the
# background colour configured in app.json.
render nook-icon-rounded.svg splash-icon.png 1024 none

# Android adaptive icon. The foreground already carries the 66/108 safe-zone
# inset; the background is a flat colour set in app.json, so no image needed.
render nook-adaptive-foreground.svg android-icon-foreground.png 1024 none

# Android 13+ themed icon: one flat shape on transparency, tinted by the OS.
render nook-mono.svg android-icon-monochrome.png 1024 none

# Android status-bar icon. Android discards colour here and uses only the alpha
# channel, tinting the silhouette itself — so the flat monochrome mark is
# exactly the right source. A full-colour icon would render as a white blob.
render nook-mono.svg notification-icon.png 96 none

# Web favicon.
render nook-icon-rounded.svg favicon.png 96 none

echo "Done. Icons written to $OUT/"
echo "Note: a native rebuild is required for launcher/splash changes to appear."
