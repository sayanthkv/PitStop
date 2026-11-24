import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('client', 'public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Crisp NTORQ speedometer/cockpit themed SVG logo
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#121215" />
      <stop offset="100%" stop-color="#09090b" />
    </linearGradient>
    <linearGradient id="amberGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
    <linearGradient id="racingNeedle" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>
  </defs>

  <!-- Background rounded squircle -->
  <rect width="512" height="512" rx="112" fill="url(#bg)" stroke="#27272a" stroke-width="6" />

  <!-- Outer Speedometer Ring Arc -->
  <path d="M 106 360 A 180 180 0 1 1 406 360" fill="none" stroke="#222227" stroke-width="26" stroke-linecap="round" />
  
  <!-- Active Speed Arc (Amber / Carbon Red) -->
  <path d="M 106 360 A 180 180 0 0 1 350 140" fill="none" stroke="url(#amberGlow)" stroke-width="26" stroke-linecap="round" />

  <!-- Speedometer Hash Marks -->
  <line x1="130" y1="330" x2="148" y2="315" stroke="#71717a" stroke-width="4" stroke-linecap="round" />
  <line x1="110" y1="256" x2="132" y2="256" stroke="#71717a" stroke-width="5" stroke-linecap="round" />
  <line x1="148" y1="170" x2="168" y2="185" stroke="#71717a" stroke-width="4" stroke-linecap="round" />
  <line x1="256" y1="102" x2="256" y2="128" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" />
  <line x1="364" y1="170" x2="344" y2="185" stroke="#ea580c" stroke-width="4" stroke-linecap="round" />
  <line x1="402" y1="256" x2="380" y2="256" stroke="#ef4444" stroke-width="5" stroke-linecap="round" />

  <!-- Center Hub -->
  <circle cx="256" cy="276" r="32" fill="#18181c" stroke="#3f3f46" stroke-width="6" />
  <circle cx="256" cy="276" r="14" fill="url(#amberGlow)" />

  <!-- Racing Pointer / Needle -->
  <polygon points="256,268 360,180 256,284" fill="url(#racingNeedle)" filter="drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))" />

  <!-- Bold Brand Badge Text -->
  <text x="256" y="385" font-family="sans-serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle" letter-spacing="6">PITSTOP</text>
  <text x="256" y="418" font-family="sans-serif" font-weight="700" font-size="16" fill="#f59e0b" text-anchor="middle" letter-spacing="4">NTORQ TELEMETRY</text>
</svg>`;

// Save master SVG
fs.writeFileSync(path.join(iconsDir, 'logo.svg'), svgContent);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);

// Simple SVG shortcut icons
const createShortcutSvg = (symbol, color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <rect width="96" height="96" rx="20" fill="#121215" stroke="#27272a" stroke-width="2" />
  <circle cx="48" cy="48" r="28" fill="none" stroke="${color}" stroke-width="6" stroke-dasharray="80 30" />
  <text x="48" y="55" font-family="sans-serif" font-weight="bold" font-size="20" fill="${color}" text-anchor="middle">${symbol}</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'shortcut-ride.svg'), createShortcutSvg('R', '#f59e0b'));
fs.writeFileSync(path.join(iconsDir, 'shortcut-park.svg'), createShortcutSvg('P', '#06b6d4'));
fs.writeFileSync(path.join(iconsDir, 'shortcut-odo.svg'), createShortcutSvg('KM', '#10b981'));
fs.writeFileSync(path.join(iconsDir, 'shortcut-fuel.svg'), createShortcutSvg('F', '#f43f5e'));

console.log('[Icons] SVG icons generated successfully.');
