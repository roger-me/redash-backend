#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "=== Building app without signing ==="
rm -rf release/mac-arm64
npx electron-builder --mac --dir

echo "=== Clearing extended attributes ==="
xattr -cr release/mac-arm64/Redash.app

echo "=== Signing app ==="
codesign --sign "Developer ID Application: Roger Sans Rovira (8DWB4K99QQ)" --force --deep --timestamp --options runtime release/mac-arm64/Redash.app

echo "=== Verifying signature ==="
codesign --verify --deep --strict release/mac-arm64/Redash.app
echo "Signature verified!"

echo "=== Creating DMG and ZIP ==="
npx electron-builder --mac dmg zip --prepackaged release/mac-arm64/Redash.app

echo "=== Building Windows ==="
npx electron-builder --win

echo "=== Done! ==="
ls -la release/*.dmg release/*.zip release/*.exe 2>/dev/null || true
