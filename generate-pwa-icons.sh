#!/bin/bash

# Create PWA icons using the chart-bar SVG from Heroicons
# This script creates proper icons with the same logo used in the app header

ICON_DIR="/workspaces/allegutta-web/public/icons"
BRAND_COLOR="#3b82f6"  # blue-500 (more blue, less purple)
BG_COLOR="#1f2937"     # gray-800 (dark background)

# Chart-bar SVG path from Heroicons (outline version)
CHART_BAR_PATH="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"

# Icon sizes needed for PWA
SIZES=(16 32 72 96 128 144 152 180 192 384 512)

echo "Creating PWA icons with chart-bar logo..."

# Create icons directory if it doesn't exist
mkdir -p "$ICON_DIR"

for size in "${SIZES[@]}"; do
  filename="${ICON_DIR}/icon-${size}x${size}.png"
  
  # Calculate better scaling for crisp icons
  padding=$((size / 8))
  icon_size=$((size - padding * 2))
  
  # Calculate stroke width based on size for better visibility
  if [ $size -le 32 ]; then
    stroke_width="2"
  elif [ $size -le 96 ]; then
    stroke_width="1.5"
  else
    stroke_width="1.2"
  fi
  
  # Create SVG with crisp rendering
  cat > "${ICON_DIR}/temp-icon-${size}.svg" << EOF
<svg width="$size" height="$size" viewBox="0 0 $size $size" xmlns="http://www.w3.org/2000/svg">
  <rect width="$size" height="$size" fill="$BG_COLOR" rx="$((size/10))"/>
  <g transform="translate($padding,$padding)">
    <svg width="$icon_size" height="$icon_size" viewBox="0 0 24 24">
      <path d="$CHART_BAR_PATH" stroke="$BRAND_COLOR" stroke-width="$stroke_width" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </g>
</svg>
EOF

  # Convert SVG to PNG if ImageMagick is available
  if command -v convert &> /dev/null; then
    # Use higher quality settings for crisp conversion
    convert -background transparent -density 300 "${ICON_DIR}/temp-icon-${size}.svg" -resize "${size}x${size}" -quality 100 "$filename"
    rm "${ICON_DIR}/temp-icon-${size}.svg"
    echo "Created $filename"
  else
    # Keep SVG if no ImageMagick
    mv "${ICON_DIR}/temp-icon-${size}.svg" "${ICON_DIR}/icon-${size}x${size}.svg"
    echo "Created SVG: ${ICON_DIR}/icon-${size}x${size}.svg"
  fi
done

# Create Apple touch icon (180x180) - special case with rounded corners
apple_icon="${ICON_DIR}/apple-touch-icon.png"
if [ -f "${ICON_DIR}/icon-180x180.png" ]; then
  cp "${ICON_DIR}/icon-180x180.png" "$apple_icon"
  echo "Created $apple_icon"
elif [ -f "${ICON_DIR}/icon-180x180.svg" ]; then
  cp "${ICON_DIR}/icon-180x180.svg" "${ICON_DIR}/apple-touch-icon.svg"
  echo "Created ${ICON_DIR}/apple-touch-icon.svg"
fi

# Create maskable icon (should be 512x512 with safe zone)
maskable_icon="${ICON_DIR}/maskable-icon-512x512.png"
cat > "${ICON_DIR}/temp-maskable.svg" << EOF
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <circle cx="256" cy="256" r="256" fill="$BRAND_COLOR"/>
  <g transform="translate(128,128)">
    <svg width="256" height="256" viewBox="0 0 24 24">
      <path d="$CHART_BAR_PATH" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </g>
</svg>
EOF

if command -v convert &> /dev/null; then
  convert -background transparent -density 300 "${ICON_DIR}/temp-maskable.svg" -resize "512x512" -quality 100 "$maskable_icon"
  rm "${ICON_DIR}/temp-maskable.svg"
  echo "Created $maskable_icon"
else
  mv "${ICON_DIR}/temp-maskable.svg" "${ICON_DIR}/maskable-icon-512x512.svg"
  echo "Created ${ICON_DIR}/maskable-icon-512x512.svg"
fi

# Create favicon
favicon="${ICON_DIR}/../favicon.ico"
if [ -f "${ICON_DIR}/icon-32x32.png" ]; then
  cp "${ICON_DIR}/icon-32x32.png" "$favicon"
  echo "Created $favicon"
fi

echo ""
echo "✅ PWA icons created successfully with chart-bar logo!"
echo "📊 Icons use the same chart-bar design as the app header"
echo "🎨 Brand color: $BRAND_COLOR (indigo-500)"
echo ""
echo "Icons created:"
for size in "${SIZES[@]}"; do
  if [ -f "${ICON_DIR}/icon-${size}x${size}.png" ]; then
    echo "  ✓ icon-${size}x${size}.png"
  elif [ -f "${ICON_DIR}/icon-${size}x${size}.svg" ]; then
    echo "  ✓ icon-${size}x${size}.svg"
  fi
done
echo "  ✓ apple-touch-icon"
echo "  ✓ maskable-icon-512x512"
echo "  ✓ favicon.ico"