#!/bin/bash
# Prepares a native SwiftUI Xcode project. Mac/Xcode + XcodeGen required.
set -euo pipefail
cd "$(dirname "$0")/../.."
RESOURCE="ios/OneUpAnime/Resources"
mkdir -p "$RESOURCE/Assets.xcassets/AppIcon.appiconset" "$RESOURCE/Assets.xcassets/LaunchBackground.colorset"
cp assets/1up-anime-intro-firma-3seg.mp4 "$RESOURCE/intro.mp4"
curl -fLsS --retry 2 "https://raw.githubusercontent.com/google/fonts/main/ofl/bangers/Bangers-Regular.ttf" -o "$RESOURCE/Bangers-Regular.ttf"
curl -fLsS --retry 2 "https://raw.githubusercontent.com/google/fonts/main/ofl/bangers/OFL.txt" -o "$RESOURCE/OFL-Bangers.txt"
test -s "$RESOURCE/Bangers-Regular.ttf"
test -s "$RESOURCE/OFL-Bangers.txt"
# Existing app icon enlarged provisionally; replace with studio-grade 1024 artwork before submitting.
sips -s format png -z 1024 1024 "assets/1up-anime-app-icon-512.png" --out "$RESOURCE/Assets.xcassets/AppIcon.appiconset/AppIcon.png" >/dev/null
cat > "$RESOURCE/Assets.xcassets/AppIcon.appiconset/Contents.json" <<'JSON'
{"images":[{"filename":"AppIcon.png","idiom":"universal","platform":"ios","size":"1024x1024"}],"info":{"author":"xcode","version":1}}
JSON
cat > "$RESOURCE/Assets.xcassets/LaunchBackground.colorset/Contents.json" <<'JSON'
{"colors":[{"color":{"color-space":"srgb","components":{"red":"0.03","green":"0.07","blue":"0.05","alpha":"1"}},"idiom":"universal"}],"info":{"author":"xcode","version":1}}
JSON
cd ios
xcodegen generate --spec project.yml
echo "Native iPhone project generated at ios/OneUpAnime.xcodeproj"
