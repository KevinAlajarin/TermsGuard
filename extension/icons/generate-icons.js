/**
 * Run this script once with Node.js to generate PNG icons from SVG.
 * Requires: npm install -g sharp (or use any SVG→PNG converter)
 *
 * Usage: node generate-icons.js
 *
 * Alternatively, use any online SVG to PNG converter with the SVG below.
 */

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#7c3aed"/>
  <path d="M64 16 L100 28 L100 64 C100 88 64 112 64 112 C64 112 28 88 28 64 L28 28 Z"
        fill="none" stroke="white" stroke-width="6" stroke-linejoin="round"/>
  <path d="M48 64 L58 74 L80 52"
        fill="none" stroke="white" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

console.log('Icon SVG content (paste into online converter or use sharp):');
console.log(SVG);
console.log('\nGenerate icons at sizes: 16x16, 48x48, 128x128');
console.log('Save as: icon16.png, icon48.png, icon128.png in this folder');
