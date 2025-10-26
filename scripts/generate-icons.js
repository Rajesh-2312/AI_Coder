#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generate placeholder icons for development
 * This creates simple SVG-based icons that can be converted to platform-specific formats
 */

function createSVGIcon(size, text = 'AI') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1E40AF;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" fill="url(#grad1)" stroke="#1E3A8A" stroke-width="2"/>
  
  <!-- Text -->
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" 
        text-anchor="middle" dominant-baseline="middle" fill="white">${text}</text>
  
  <!-- Decorative elements -->
  <circle cx="${size * 0.25}" cy="${size * 0.25}" r="${size * 0.05}" fill="white" opacity="0.8"/>
  <circle cx="${size * 0.75}" cy="${size * 0.75}" r="${size * 0.03}" fill="white" opacity="0.6"/>
</svg>`;
}

function generateIcons() {
  const buildDir = path.join(__dirname, '..', 'build');
  
  // Ensure build directory exists
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  
  console.log('Generating placeholder icons...');
  
  // Generate SVG icons of different sizes
  const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
  
  sizes.forEach(size => {
    const svgContent = createSVGIcon(size);
    const svgPath = path.join(buildDir, `icon-${size}.svg`);
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✓ Generated ${svgPath}`);
  });
  
  // Create a primary icon file
  const primaryIcon = createSVGIcon(512);
  const primaryPath = path.join(buildDir, 'icon.svg');
  fs.writeFileSync(primaryPath, primaryIcon);
  console.log(`✓ Generated ${primaryPath}`);
  
  console.log('\nIcon generation completed!');
  console.log('Note: These are SVG placeholder icons. For production, convert them to:');
  console.log('- icon.ico (Windows)');
  console.log('- icon.icns (macOS)');
  console.log('- icon.png (Linux)');
  console.log('\nYou can use online tools like https://iconverticons.com/ to convert SVG to platform-specific formats.');
}

// Run if executed directly
if (require.main === module) {
  generateIcons();
}

module.exports = { generateIcons, createSVGIcon };
