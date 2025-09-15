#!/bin/bash

# Create basic colored icons for PWA
# This script creates simple colored placeholder icons
# Replace these with your actual logo designs

ICON_DIR="/workspaces/allegutta-web/public/icons"
COLOR="#1f2937"

# Icon sizes needed for PWA
SIZES=(16 32 72 96 128 144 152 180 192 384 512)

echo "Creating PWA icons..."

for size in "${SIZES[@]}"; do
  # Create a simple colored square icon using ImageMagick (if available)
  # Otherwise, we'll create placeholder text files
  if command -v convert &> /dev/null; then
    convert -size ${size}x${size} xc:"$COLOR" -gravity center -pointsize $((size/4)) -fill white -annotate +0+0 "AG" "${ICON_DIR}/icon-${size}x${size}.png"
  else
    # Create SVG placeholder and convert it (simplified approach)
    cat > "${ICON_DIR}/icon-${size}x${size}.svg" << EOF
<svg width="$size" height="$size" xmlns="http://www.w3.org/2000/svg">
  <rect width="$size" height="$size" fill="$COLOR"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="$((size/4))" fill="white" text-anchor="middle" dy="0.3em">AG</text>
</svg>
EOF
  fi
done

# Create Apple touch icon (180x180)
if [ -f "${ICON_DIR}/icon-180x180.png" ]; then
  cp "${ICON_DIR}/icon-180x180.png" "${ICON_DIR}/apple-touch-icon.png"
elif [ -f "${ICON_DIR}/icon-180x180.svg" ]; then
  cp "${ICON_DIR}/icon-180x180.svg" "${ICON_DIR}/apple-touch-icon.svg"
fi

# Create maskable icon (should be 512x512 with safe zone)
if command -v convert &> /dev/null; then
  convert -size 512x512 xc:"$COLOR" -gravity center -pointsize 128 -fill white -annotate +0+0 "AG" "${ICON_DIR}/maskable-icon-512x512.png"
else
  cat > "${ICON_DIR}/maskable-icon-512x512.svg" << EOF
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="$COLOR"/>
  <circle cx="256" cy="256" r="200" fill="none" stroke="white" stroke-width="4" opacity="0.3"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="128" fill="white" text-anchor="middle" dy="0.3em">AG</text>
</svg>
EOF
fi

# Create favicon
if [ -f "${ICON_DIR}/icon-32x32.png" ]; then
  cp "${ICON_DIR}/icon-32x32.png" "${ICON_DIR}/../favicon.ico"
fi

echo "PWA icons created successfully!"
echo "Note: These are placeholder icons with 'AG' text."
echo "Replace them with your actual logo designs for production."