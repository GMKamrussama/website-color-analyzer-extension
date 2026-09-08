// ============================================================
// Color Analyzer Pro — Sidebar Logic
// ============================================================

'use strict';

// ── State ────────────────────────────────────────────────────
const state = {
  palette: null,
  searchQuery: '',
  settings: {
    showNeutral: true,
    dedupeThreshold: 20
  }
};

// ── Named Color Map (Approximate) ────────────────────────────
const COLOR_NAMES = {
  '#ff0000':'Red','#ff4500':'OrangeRed','#ff6347':'Tomato','#ff7f50':'Coral',
  '#ffa500':'Orange','#ffd700':'Gold','#ffff00':'Yellow','#adff2f':'GreenYellow',
  '#7fff00':'Chartreuse','#00ff00':'Lime','#32cd32':'LimeGreen','#008000':'Green',
  '#006400':'DarkGreen','#00fa9a':'MediumSpringGreen','#00ff7f':'SpringGreen',
  '#00ffff':'Cyan','#00ced1':'DarkTurquoise','#008080':'Teal','#0000ff':'Blue',
  '#0000cd':'MediumBlue','#00008b':'DarkBlue','#000080':'Navy','#4169e1':'RoyalBlue',
  '#1e90ff':'DodgerBlue','#00bfff':'DeepSkyBlue','#87ceeb':'SkyBlue','#6495ed':'CornflowerBlue',
  '#4682b4':'SteelBlue','#7b68ee':'MediumSlateBlue','#6a5acd':'SlateBlue','#483d8b':'DarkSlateBlue',
  '#8a2be2':'BlueViolet','#9400d3':'DarkViolet','#9932cc':'DarkOrchid','#8b008b':'DarkMagenta',
  '#ff00ff':'Magenta','#ff69b4':'HotPink','#ff1493':'DeepPink','#db7093':'PaleVioletRed',
  '#dc143c':'Crimson','#b22222':'Firebrick','#8b0000':'DarkRed','#a52a2a':'Brown',
  '#d2691e':'Chocolate','#cd853f':'Peru','#deb887':'BurlyWood','#f4a460':'SandyBrown',
  '#d2b48c':'Tan','#bc8f8f':'RosyBrown','#808080':'Gray','#a9a9a9':'DarkGray',
  '#c0c0c0':'Silver','#d3d3d3':'LightGray','#ffffff':'White','#000000':'Black',
  '#f5f5f5':'WhiteSmoke','#fffafa':'Snow','#f0f8ff':'AliceBlue','#f8f8ff':'GhostWhite',
  '#2196f3':'MaterialBlue','#3f51b5':'Indigo','#673ab7':'DeepPurple','#9c27b0':'Purple',
  '#e91e63':'Pink','#f44336':'Red500','#ff5722':'DeepOrange','#ff9800':'Orange500',
  '#ffc107':'Amber','#ffeb3b':'Yellow500','#8bc34a':'LightGreen','#4caf50':'Green500',
  '#009688':'Teal500','#00bcd4':'Cyan500','#03a9f4':'LightBlue','#607d8b':'BlueGray',
  '#795548':'Brown500','#9e9e9e':'Gray500','#7c3aed':'Violet600','#2563eb':'Blue600',
  '#0d9488':'Teal600','#059669':'Emerald600','#d97706':'Amber600','#dc2626':'Red600',
};

function getColorName(hex) {
  const key = hex.toLowerCase();
  if (COLOR_NAMES[key]) return COLOR_NAMES[key];
  // Nearest (simple distance)
  let nearest = null, minDist = Infinity;
  const r1 = parseInt(hex.slice(1,3),16), g1 = parseInt(hex.slice(3,5),16), b1 = parseInt(hex.slice(5,7),16);
  for (const [k, name] of Object.entries(COLOR_NAMES)) {
    const r2 = parseInt(k.slice(1,3),16), g2 = parseInt(k.slice(3,5),16), b2 = parseInt(k.slice(5,7),16);
    const d = Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2);
    if (d < minDist) { minDist = d; nearest = name; }
  }
  return minDist < 40 ? nearest : null;
}

// ── Color Utilities ──────────────────────────────────────────

function hexToRgb(hex) {
  const clean = hex.replace('#','');
  const n = parseInt(clean.length===3 ? clean.split('').map(c=>c+c).join('') : clean, 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}

function isColorSimilar(hex1, hex2, threshold = 15) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const dist = Math.sqrt((c1.r-c2.r)**2 + (c1.g-c2.g)**2 + (c1.b-c2.b)**2);
  return dist < threshold;
}

function deduplicateColors(colors) {
  if (!colors || !colors.length) return [];
  const result = [];
  colors.forEach(c => {
    const existing = result.find(r => isColorSimilar(r.hex, c.hex));
    if (existing) {
      existing.count += c.count;
    } else {
      result.push({ ...c });
    }
  });
  return result;
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v+0.055)/1.055)**2.4; };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = luminance(hex1), l2 = luminance(hex2);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return +((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

function getWcagGrade(ratio) {
  if (ratio >= 7)   return { grade: 'AAA', cls: 'wcag-aaa' };
  if (ratio >= 4.5) return { grade: 'AA',  cls: 'wcag-aa' };
  return { grade: 'Fail', cls: 'wcag-fail' };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function suggestContrastColors(fg, bg, targetRatio) {
  const bgLum = luminance(bg);
  const rgb = hexToRgb(fg);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const suggestions = [];

  // Try to find nearest L that passes
  const step = bgLum > 0.5 ? -1 : 1;
  let currentL = hsl.l;
  
  while (currentL >= 0 && currentL <= 100) {
    const hex = hslToHex(hsl.h, hsl.s, currentL);
    if (contrastRatio(hex, bg) >= targetRatio) {
      suggestions.push(hex);
      break;
    }
    currentL += step;
  }
  
  // Also try different saturation if L doesn't work well
  if (suggestions.length === 0) {
    suggestions.push(bgLum > 0.5 ? '#000000' : '#ffffff');
  }
  
  return suggestions;
}

// ── Export Generators ────────────────────────────────────────

function generateCSSVars(colors) {
  if (!colors || !colors.length) return '/* No colors found */';
  const lines = [':root {'];
  colors.forEach((c, i) => {
    const label = slugLabel(c.hex, i);
    lines.push(`  --color-${label}: ${c.hex};`);
  });
  lines.push('}');
  return lines.join('\n');
}

function generateSCSS(colors) {
  if (!colors || !colors.length) return '// No colors found';
  return colors.map((c, i) => `$color-${slugLabel(c.hex, i)}: ${c.hex};`).join('\n');
}

function generateTailwind(colors) {
  if (!colors || !colors.length) return '// No colors found';
  const lines = ["/** @type {import('tailwindcss').Config} */", 'module.exports = {', '  theme: {', '    extend: {', '      colors: {'];
  colors.forEach((c, i) => {
    lines.push(`        '${slugLabel(c.hex, i)}': '${c.hex}',`);
  });
  lines.push('      },', '    },', '  },', '};');
  return lines.join('\n');
}

function generateJSON(palette) {
  if (!palette) return '{}';
  const obj = {
    site: palette.site,
    colors: {},
    cssVariables: {}
  };
  const groups = ['background','text','border','gradient','svg'];
  for (const g of groups) {
    obj.colors[g] = (palette.groups[g] || []).map(c => ({ hex: c.hex, rgb: c.rgb, hsl: c.hsl }));
  }
  palette.cssVars.forEach(v => { obj.cssVariables[v.name] = v.hex; });
  return JSON.stringify(obj, null, 2);
}

function hexToOklch(hex) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const lrgb = [
    r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92,
    g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92,
    b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92
  ];
  const l = 0.4122214708 * lrgb[0] + 0.5363325363 * lrgb[1] + 0.0514459929 * lrgb[2];
  const m = 0.2119034982 * lrgb[0] + 0.6806995451 * lrgb[1] + 0.1073969566 * lrgb[2];
  const s = 0.0883024619 * lrgb[0] + 0.2817188376 * lrgb[1] + 0.6299787005 * lrgb[2];
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720403 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  const C = Math.sqrt(a * a + b_ * b_);
  const h = Math.atan2(b_, a) * (180 / Math.PI);
  return {
    l: +(L * 100).toFixed(1),
    c: +(C).toFixed(3),
    h: +(h >= 0 ? h : h + 360).toFixed(1)
  };
}

function detectColorScheme(pal) {
  const top = (pal.topColors || []).slice(0, 10).map(c => hexToHsl(c.hex));
  if (top.length < 2) return null;
  const hues = top.map(c => c.h).sort((a, b) => a - b);
  const dists = [];
  for (let i = 0; i < hues.length; i++) {
    dists.push((hues[(i + 1) % hues.length] - hues[i] + 360) % 360);
  }
  const maxD = Math.max(...dists);
  const minD = Math.min(...dists);
  if (maxD < 40) return 'Monochromatic';
  if (maxD < 90) return 'Analogous';
  if (Math.abs(maxD - 180) < 30) return 'Complementary';
  if (Math.abs(maxD - 120) < 30) return 'Triadic';
  return 'Diverse';
}

function slugLabel(hex, index) {
  const name = getColorName(hex);
  if (name) return name.toLowerCase().replace(/\s+/g,'-');
  return `color-${(index+1).toString().padStart(2,'0')}`;
}

// ── Messaging ────────────────────────────────────────────────

function sendToContent(action, data = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'SIDEBAR_TO_CONTENT',
      payload: { action, ...data }
    }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: false });
      }
    });
  });
}

// ── DOM Helpers ──────────────────────────────────────────────

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function showState(which) {
  ['state-loading','state-empty','state-error'].forEach(id => {
    $(id).classList.add('hidden');
  });
  ['tab-colors','tab-accessibility','tab-export','tab-history'].forEach(id => {
    // Only hide color group containers but keep tabs
  });
  if (which) $(which).classList.remove('hidden');
}

function setSiteBar(text, status = '') {
  $('site-bar-text').textContent = text;
  const dot = $('site-status-dot');
  dot.className = 'site-bar-dot' + (status ? ' ' + status : '');
}

// ── Copy to Clipboard ────────────────────────────────────────

async function copyText(text, btn, label = 'Copy') {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = '✓ Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
    }
    return true;
  } catch { return false; }
}

// ── Render Sections ──────────────────────────────────────────

function renderSections(palette) {
  const container = $('sections-container');
  container.innerHTML = '';
  const sections = palette.sections || [];

  if (!sections.length) {
    $('sections-empty').classList.remove('hidden');
    return;
  }
  $('sections-empty').classList.add('hidden');

  sections.forEach(s => {
    const card = document.createElement('div');
    card.className = 'section-card';
    card.innerHTML = `
      <div class="section-card-header">
        <span class="section-card-title">${s.name}</span>
      </div>
      <div class="section-card-body">
        <div class="section-palette-grid"></div>
      </div>
    `;

    // Interactive Section Click-to-Scroll
    card.addEventListener('click', () => {
      document.querySelectorAll('.section-card').forEach(c => c.classList.remove('is-active'));
      card.classList.add('is-active');
      sendToContent('HIGHLIGHT_SECTION', { id: s.analyzerId, scroll: true });
    });
    
    card.addEventListener('mouseenter', () => {
      if (!card.classList.contains('is-active')) {
        sendToContent('HIGHLIGHT_SECTION', { id: s.analyzerId, scroll: false });
      }
    });

    card.addEventListener('mouseleave', () => {
      if (!card.classList.contains('is-active')) {
        sendToContent('REMOVE_HIGHLIGHT');
      }
    });
    
    const grid = card.querySelector('.section-palette-grid');
    s.colors.forEach(c => {
      const item = document.createElement('div');
      item.className = 'section-color-item';
      item.innerHTML = `
        <div class="section-color-swatch" style="background:${c.hex}" title="${c.hex}"></div>
        <span class="section-color-hex">${c.hex.toUpperCase()}</span>
      `;
      item.querySelector('.section-color-swatch').addEventListener('click', () => copyText(c.hex, null));
      item.querySelector('.section-color-swatch').addEventListener('mouseenter', () => sendToContent('HIGHLIGHT_COLOR', { hex: c.hex }));
      item.querySelector('.section-color-swatch').addEventListener('mouseleave', () => sendToContent('REMOVE_HIGHLIGHT'));
      grid.appendChild(item);
    });
    container.appendChild(card);
  });
}

// ── Multi-page Audit ──────────────────────────────────────────

async function startMultiPageAudit() {
  const btn = $('start-audit-btn');
  btn.disabled = true;
  $('audit-loading').classList.remove('hidden');
  $('audit-results').classList.add('hidden');
  
  try {
    // 1. Get links from current page
    const linksRes = await sendToContent('GET_DOMAIN_LINKS');
    const links = (linksRes?.links || []).slice(0, 30); // Scan up to 30 other pages
    
    if (links.length === 0) {
      alert('No internal links found to audit.');
      throw new Error('No links');
    }

    const auditResults = [];
    const mainPalette = state.palette.topColors.map(c => c.hex.toLowerCase());

    for (const url of links) {
      $('audit-loading-text').textContent = `Analyzing ${new URL(url).pathname}...`;
      try {
        const resp = await fetch(url);
        const html = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Simple color extraction from external HTML (inline + style tags)
        // This is a "light" version
        const foundColors = new Set();
        const bodyText = doc.body.innerHTML;
        const colorRegex = /#[0-9a-f]{3,6}|rgba?\([^)]+\)/gi;
        let m;
        while ((m = colorRegex.exec(bodyText)) !== null) {
          const hex = m[0].startsWith('#') ? m[0] : '#cccccc'; // simplification
          if (hex.length >= 4) foundColors.add(hex.toLowerCase());
          if (foundColors.size > 50) break;
        }

        // Calculate overlap with main palette
        const subPalette = Array.from(foundColors);
        const overlap = subPalette.filter(c => mainPalette.some(m => contrastRatio(c, m) < 1.1));
        const score = Math.min(100, Math.round((overlap.length / Math.max(1, subPalette.length)) * 150));
        
        auditResults.push({ url, score, matches: overlap.length });
      } catch (e) { console.error('Audit fetch failed', e); }
    }

    // 2. Render Results
    const totalScore = Math.round(auditResults.reduce((a,b) => a + b.score, 0) / auditResults.length);
    $('audit-score-val').textContent = totalScore;
    $('audit-score-label').textContent = totalScore > 80 ? 'Excellent Brand Alignment' : totalScore > 50 ? 'Good Consistency' : 'Inconsistent Branding';
    
    const list = $('audit-pages-list');
    list.innerHTML = '';
    auditResults.forEach(res => {
      const name = new URL(res.url).pathname || '/';
      const row = document.createElement('div');
      row.className = 'audit-page-row';
      row.innerHTML = `
        <div class="audit-page-dot"></div>
        <div class="audit-page-name">${name}</div>
        <div class="audit-page-diff">${res.score}% Match</div>
      `;
      list.appendChild(row);
    });

    $('audit-results').classList.remove('hidden');
  } catch (e) {
    console.error(e);
  } finally {
    $('audit-loading').classList.add('hidden');
    btn.disabled = false;
  }
}

// ── Render Color Card ────────────────────────────────────────

function createColorCard(colorObj) {
  const hex = colorObj.hex;
  const rgb = colorObj.rgb;
  const hsl = colorObj.hsl;
  const oklch = hexToOklch(hex);
  const oklchStr = `${oklch.l}% ${oklch.c} ${oklch.h}`;
  const name = getColorName(hex);
  const isPrimary = colorObj.isPrimary || false;
  const isSecondary = colorObj.isSecondary || false;

  // Auto A11y logic
  const domBg = state.palette?.groups?.background?.[0]?.hex || '#ffffff';
  const ratio = contrastRatio(domBg, hex);
  const { grade } = getWcagGrade(ratio);

  const card = document.createElement('div');
  card.className = `color-card ${isPrimary ? 'is-primary' : ''} ${isSecondary ? 'is-secondary' : ''}`;
  card.dataset.hex = hex.toLowerCase();
  card.tabIndex = 0; 

  card.innerHTML = `
    <div class="color-card-top">
      <div class="color-swatch-large" style="background:${hex}">
        <div class="swatch-overlay">Click to Copy</div>
      </div>
      <div class="color-meta">
        <div class="color-name-row">
          <span class="color-hex-title">${hex.toUpperCase()}</span>
          ${isPrimary ? '<span class="badge-primary">Primary</span>' : ''}
          ${isSecondary ? '<span class="badge-secondary">Secondary</span>' : ''}
          <span class="badge-a11y ${grade.toLowerCase()}" title="Contrast ratio vs page background">
             ${ratio}:1 ${grade} vs BG
          </span>
        </div>
        ${name ? `<div class="color-friendly-name">${name}</div>` : ''}
        <div class="color-values-stack">
          <div class="val-row"><span>RGB</span> <code>${rgb}</code></div>
          <div class="val-row"><span>HSL</span> <code>${hsl}</code></div>
          <div class="val-row"><span>OKLCH</span> <code>${oklchStr}</code></div>
        </div>
      </div>
    </div>
    <div class="color-card-footer">
      <button class="btn-card-action" data-action="copy">Copy HEX</button>
      <button class="btn-card-action" data-action="audit">Audit A11y</button>
    </div>
  `;

  // Listeners
  card.addEventListener('click', (e) => {
    if (e.target.closest('.btn-card-action')) return;
    document.querySelectorAll('.color-card').forEach(c => c.classList.remove('is-active'));
    card.classList.add('is-active');
    sendToContent('HIGHLIGHT_COLOR', { hex: hex.toLowerCase(), scroll: true });
  });

  const swatch = card.querySelector('.color-swatch-large');
  swatch.addEventListener('click', (e) => {
    e.stopPropagation();
    copyText(hex.toUpperCase(), null);
  });
  
  card.addEventListener('mouseenter', () => {
    if (!card.classList.contains('is-active')) {
       sendToContent('HIGHLIGHT_COLOR', { hex: hex.toLowerCase(), scroll: false });
    }
  });

  card.addEventListener('mouseleave', () => {
    if (!card.classList.contains('is-active')) {
       sendToContent('REMOVE_HIGHLIGHT');
    }
  });

  card.querySelector('[data-action="copy"]').addEventListener('click', (e) => {
    e.stopPropagation();
    copyText(hex.toUpperCase(), e.target);
  });
  
  card.querySelector('[data-action="audit"]').addEventListener('click', (e) => {
    e.stopPropagation();
    state.a11yFilter = hex.toLowerCase();
    const a11yTab = document.querySelector('[data-tab="accessibility"]');
    if (a11yTab) a11yTab.click();
    if (state.palette) renderAccessibility(state.palette);
  });

  return card;
}

// ── Render Groups ────────────────────────────────────────────

const GROUP_CONFIG = {
  background: { label: 'Backgrounds', dot: '#60a5fa' },
  text:       { label: 'Text Colors',  dot: '#a78bfa' },
  border:     { label: 'Borders',      dot: '#6b7280' },
  gradient:   { label: 'Gradients',    dot: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  svg:        { label: 'SVG & Icons',  dot: '#34d399' },
};

function renderColorGroups(palette) {
  const container = $('color-groups');
  container.innerHTML = '';

  // 1. Brand Identity Section (Top Colors)
  const brandColors = (palette.topColors || []).slice(0, 4);
  if (brandColors.length) {
    const brandGroup = document.createElement('div');
    brandGroup.className = 'brand-identity-section';
    brandGroup.innerHTML = `
      <div class="brand-header">
        <div class="brand-glow"></div>
        <h3>Brand Identity</h3>
        <p>Dominant colors used for professional brand recognition.</p>
      </div>
      <div class="brand-grid"></div>
    `;
    const bGrid = brandGroup.querySelector('.brand-grid');
    brandColors.forEach((c, i) => {
       c.isPrimary = i === 0;
       c.isSecondary = i === 1;
       bGrid.appendChild(createColorCard(c));
    });
    container.appendChild(brandGroup);
  }

  // 2. Functional Categories
  for (const [key, cfg] of Object.entries(GROUP_CONFIG)) {
    const colors = palette.groups[key] || [];
    if (!colors.length) continue;

    const group = document.createElement('div');
    group.className = 'color-group';
    group.dataset.group = key;

    group.innerHTML = `
      <div class="group-header" data-group="${key}">
        <div class="group-pill" style="background:${cfg.dot}"></div>
        <span class="group-name">${cfg.label}</span>
        <span class="group-count">${colors.length}</span>
        <span class="group-toggle">▾</span>
      </div>
      <div class="color-grid" id="grid-${key}"></div>
    `;

    const grid = group.querySelector(`#grid-${key}`);
    colors.forEach(c => grid.appendChild(createColorCard(c)));

    const header = group.querySelector('.group-header');
    header.addEventListener('click', () => {
      header.classList.toggle('collapsed');
      grid.style.display = header.classList.contains('collapsed') ? 'none' : '';
    });

    container.appendChild(group);
  }

  // CSS Vars
  const cssVars = palette.cssVars || [];
  if (cssVars.length) {
    const varGroup = $('group-css-vars');
    varGroup.classList.remove('hidden');
    $('css-vars-count').textContent = cssVars.length;
    const grid = $('css-vars-grid');
    grid.innerHTML = '';
    cssVars.forEach(v => {
      const card = document.createElement('div');
      card.className = 'cssvar-card';
      card.innerHTML = `
        <div class="cssvar-swatch" style="background:${v.hex}"></div>
        <div class="cssvar-details">
          <div class="cssvar-name">${v.name}</div>
          <div class="cssvar-hex">${v.hex.toUpperCase()}</div>
        </div>
        <button class="btn-copy-var">Copy</button>
      `;
      const btn = card.querySelector('.btn-copy-var');
      btn.addEventListener('click', () => copyText(`${v.name}: ${v.hex}`, btn));
      grid.appendChild(card);
    });
  } else {
    $('group-css-vars').classList.add('hidden');
  }
}

// ── Render Accessibility Tab ─────────────────────────────────

function renderAccessibility(palette) {
  const grid = $('a11y-grid');
  grid.innerHTML = '';

  const topColors = (palette.topColors || []).slice(0, 8);
  if (!topColors.length) { $('a11y-empty').classList.remove('hidden'); return; }
  $('a11y-empty').classList.add('hidden');

  const textColors = (palette.groups.text || []).slice(0, 4);
  const bgColors   = (palette.groups.background || []).slice(0, 4);

  const pairs = [];
  for (const bg of bgColors) {
    for (const txt of textColors) {
      if (bg.hex === txt.hex) continue;
      pairs.push({ bg: bg.hex, txt: txt.hex });
    }
  }

  topColors.slice(0,5).forEach(c => {
    pairs.push({ bg: '#ffffff', txt: c.hex });
    pairs.push({ bg: '#000000', txt: c.hex });
  });

  const seen = new Set();
  const filtered = pairs.filter(p => {
    const k = p.bg + p.txt;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 24);

  let displayPairs = filtered;

  if (state.a11yFilter) {
    const filterHex = state.a11yFilter.toLowerCase();
    const filteredByHex = filtered.filter(p => p.bg.toLowerCase() === filterHex || p.txt.toLowerCase() === filterHex);
    if (!filteredByHex.length) {
      filteredByHex.push({ bg: '#ffffff', txt: filterHex });
      filteredByHex.push({ bg: '#000000', txt: filterHex });
      for (const bg of bgColors) {
        if (bg.hex.toLowerCase() !== filterHex) {
          filteredByHex.push({ bg: bg.hex, txt: filterHex });
        }
      }
    }
    const banner = document.createElement('div');
    banner.style.cssText = 'padding:8px 12px;margin-bottom:12px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);border-radius:8px;font-size:12px;display:flex;justify-content:space-between;align-items:center;';
    banner.innerHTML = `<span>Filtered contrast for <strong>${filterHex.toUpperCase()}</strong></span><button id="clear-a11y-filter" style="background:none;border:none;color:#a78bfa;cursor:pointer;font-weight:600;font-size:11px;">Show All</button>`;
    grid.appendChild(banner);
    banner.querySelector('#clear-a11y-filter').addEventListener('click', () => {
      state.a11yFilter = null;
      renderAccessibility(palette);
    });
    displayPairs = filteredByHex;
  }

  for (const pair of displayPairs) {
    const ratio = contrastRatio(pair.bg, pair.txt);
    const { grade, cls } = getWcagGrade(ratio);
    const item = document.createElement('div');
    item.className = 'a11y-pair';

    // Interactive Click-to-Scroll & Lock for A11y Pairs
    item.addEventListener('click', () => {
      document.querySelectorAll('.a11y-pair').forEach(c => c.classList.remove('is-active'));
      item.classList.add('is-active');
      sendToContent('HIGHLIGHT_COLOR', { hex: pair.txt, bg: pair.bg, scroll: true });
    });

    item.addEventListener('mouseenter', () => {
      if (!item.classList.contains('is-active')) {
         sendToContent('HIGHLIGHT_COLOR', { hex: pair.txt, bg: pair.bg, scroll: false });
      }
    });

    item.addEventListener('mouseleave', () => {
      if (!item.classList.contains('is-active')) {
         sendToContent('REMOVE_HIGHLIGHT');
      }
    });
    
    let suggestionHtml = '';
    if (grade === 'Fail') {
      const suggestions = [
        ...suggestContrastColors(pair.txt, pair.bg, 4.5),
        ...suggestContrastColors(pair.txt, pair.bg, 7.0)
      ];
      const uniqueSug = [...new Set(suggestions)];
      if (uniqueSug.length) {
        suggestionHtml = `
          <div class="a11y-suggestions">
            <span class="a11y-suggestion-label">Suggestions to Fix:</span>
            <div class="suggestion-list">
              ${uniqueSug.map(s => `
                <div class="suggestion-item" data-hex="${s}">
                  <div class="suggestion-swatch" style="background:${s}"></div>
                  <span class="suggestion-hex">${s.toUpperCase()}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    item.innerHTML = `
      <div class="a11y-pair-header">
        <div class="a11y-preview" style="background:${pair.bg};color:${pair.txt}">Aa</div>
        <div class="a11y-info">
          <div class="a11y-colors">${pair.txt.toUpperCase()} on ${pair.bg.toUpperCase()}</div>
          <div class="a11y-ratio">Ratio: ${ratio}:1</div>
        </div>
        <span class="wcag-badge ${cls}">${grade}</span>
      </div>
      ${suggestionHtml}
    `;
    item.querySelectorAll('.suggestion-item').forEach(sug => {
       sug.addEventListener('click', (e) => {
         e.stopPropagation();
         copyText(sug.dataset.hex.toUpperCase(), sug);
       });
    });

    grid.appendChild(item);
  }
}

// ── Render Export Tab ────────────────────────────────────────

function renderExport(palette) {
  const topColors = palette.topColors || [];
  $('export-css').textContent      = generateCSSVars(topColors);
  $('export-scss').textContent     = generateSCSS(topColors);
  $('export-tailwind').textContent = generateTailwind(topColors);
  $('export-json').textContent     = generateJSON(palette);
  $('export-empty').classList.add('hidden');
}

// ── Stats Bar ────────────────────────────────────────────────

function renderStats(palette) {
  const totalColors = Object.values(palette.groups).reduce((a, b) => a + b.length, 0);
  const scheme = detectColorScheme(palette);
  
  $('stat-total').textContent = `${totalColors} colors`;
  $('stat-elements').textContent = `${palette.totalScanned?.toLocaleString() || 0} elements`;
  $('stat-vars').textContent = `${palette.cssVars?.length || 0} CSS vars`;
  
  const existingScheme = $('stat-scheme');
  if (existingScheme) existingScheme.remove();

  if (scheme) {
    const schemeSpan = document.createElement('span');
    schemeSpan.id = 'stat-scheme';
    schemeSpan.textContent = `Scheme: ${scheme}`;
    $('stats-bar').appendChild(schemeSpan);
  }
  
  $('stats-bar').classList.remove('hidden');
}

// ── Full Render ──────────────────────────────────────────────

function renderPalette(palette) {
  // Apply Smart Deduplication to reduce color noise
  palette.topColors = deduplicateColors(palette.topColors);
  for (const key in palette.groups) {
    palette.groups[key] = deduplicateColors(palette.groups[key]);
  }
  if (palette.sections) {
    palette.sections.forEach(s => {
      s.colors = deduplicateColors(s.colors);
    });
  }

  state.palette = palette;
  showState(null);
  renderColorGroups(palette);
  renderAccessibility(palette);
  renderExport(palette);
  renderStats(palette);
  renderSections(palette);

  $('save-btn').disabled = false;
  $('copy-all-btn').disabled = false;

  const domain = palette.site?.domain || 'unknown';
  setSiteBar(domain, 'ready');
}

// ── Search / Filter ──────────────────────────────────────────

function applySearch(query) {
  const q = query.toLowerCase().trim();
  $$('.color-card').forEach(card => {
    const hex = card.dataset.hex || '';
    const name = card.dataset.name || '';
    const match = !q || hex.includes(q) || name.includes(q);
    card.style.display = match ? '' : 'none';
  });
}

// ── Scan ─────────────────────────────────────────────────────

async function scanColors() {
  const scanBtn = $('scan-btn');
  scanBtn.disabled = true;
  scanBtn.classList.add('scanning');
  scanBtn.querySelector('span').textContent = 'Scanning…';

  setSiteBar('Analyzing Layout...', 'scanning');
  $('state-loading').classList.remove('hidden');
  $('state-empty').classList.add('hidden');
  $('state-error').classList.add('hidden');
  $('stats-bar').classList.add('hidden');

  // Small delay to show initial progress
  await new Promise(r => setTimeout(r, 400));
  setSiteBar('Recursive Shadow DOM Scan...', 'scanning');

  let res = await sendToContent('EXTRACT_COLORS');

  if (!res || !res.success) {
    const errMsg = res?.error || 'Unknown error';
    
    // Auto-reload if content script is missing
    if (errMsg.includes('Could not establish connection') || errMsg.includes('Receiving end does not exist')) {
      await reloadAndScan();
      return;
    }

    scanBtn.disabled = false;
    scanBtn.classList.remove('scanning');
    scanBtn.querySelector('span').textContent = 'Scan Page Colors';
    $('state-loading').classList.add('hidden');

    let title = 'Scan Failed';
    let body = 'An unexpected error occurred. Please try again or reload the page.';

    if (errMsg === 'RESTRICTED_PAGE') {
      title = 'Restricted Page';
      body = 'Chrome internal pages cannot be analyzed. Navigate to a real website and try again.';
    } else if (errMsg === 'No active tab found') {
      title = 'No Tab Selected';
      body = 'Please click on a website tab first, then click Scan.';
    } else {
      body = `Error: ${errMsg}`;
    }

    $('error-title').textContent = title;
    $('error-msg').innerHTML = body;
    $('state-error').classList.remove('hidden');
    setSiteBar(title, 'error');
    return;
  }

  setSiteBar('Scientific Blending...', 'scanning');
  await new Promise(r => setTimeout(r, 300));

  scanBtn.disabled = false;
  scanBtn.classList.remove('scanning');
  scanBtn.querySelector('span').textContent = 'Scan Page Colors';
  $('state-loading').classList.add('hidden');

  renderPalette(res.data);
}

// ── EyeDropper ───────────────────────────────────────────────

async function openEyeDropper() {
  if (!window.EyeDropper) {
    alert('EyeDropper is not supported in this browser. Requires Chrome 95+.');
    return;
  }
  const eyeDropper = new EyeDropper();
  try {
    const result = await eyeDropper.open();
    const hex = result.sRGBHex.toUpperCase();
    const { r, g, b } = hexToRgb(hex);
    const hsl = hexToHsl(hex);

    $('picker-swatch').style.background = hex;
    $('picker-hex').textContent = hex;
    $('picker-formats').textContent = `rgb(${r},${g},${b}) · hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`;
    $('picker-toast').classList.remove('hidden');

    $('picker-copy').onclick = () => copyText(hex, $('picker-copy'), 'Copy');
  } catch (e) { }
}

function hexToHsl(hex) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d + 2)/6; break;
      case b: h = ((r-g)/d + 4)/6; break;
    }
  }
  return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) };
}

// ── History (chrome.storage) ─────────────────────────────────

async function saveCurrentPalette() {
  if (!state.palette) return;
  const entry = {
    id: Date.now().toString(),
    domain: state.palette.site?.domain || 'unknown',
    url: state.palette.site?.url || '',
    title: state.palette.site?.title || '',
    savedAt: Date.now(),
    topColors: (state.palette.topColors || []).slice(0, 10).map(c => c.hex),
    palette: state.palette
  };

  const { history: existing = [] } = await chrome.storage.local.get('history');
  const updated = [entry, ...existing].slice(0, 50);
  await chrome.storage.local.set({ history: updated });

  const btn = $('save-btn');
  const orig = btn.innerHTML;
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Saved!`;
  btn.style.color = 'var(--success)';
  setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);

  renderHistoryTab();
}

async function loadHistory() {
  const { history: entries = [] } = await chrome.storage.local.get('history');
  return entries;
}

async function deleteHistoryEntry(id) {
  const { history: entries = [] } = await chrome.storage.local.get('history');
  const updated = entries.filter(e => e.id !== id);
  await chrome.storage.local.set({ history: updated });
  renderHistoryTab();
}

async function clearHistory() {
  if (!confirm('Clear all saved palettes?')) return;
  await chrome.storage.local.set({ history: [] });
  renderHistoryTab();
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function renderHistoryTab() {
  const entries = await loadHistory();
  const list = $('history-list');
  list.innerHTML = '';

  if (!entries.length) {
    $('history-empty').classList.remove('hidden');
    return;
  }
  $('history-empty').classList.add('hidden');

  for (const entry of entries) {
    const item = document.createElement('div');
    item.className = 'history-item';
    const swatches = (entry.topColors || []).slice(0, 12)
      .map(hex => `<div class="history-swatch" style="background:${hex}" title="${hex}"></div>`)
      .join('');

    item.innerHTML = `
      <div class="history-item-header">
        <span class="history-domain" title="${entry.url}">${entry.domain}</span>
        <span class="history-date">${formatDate(entry.savedAt)}</span>
      </div>
      <div class="history-swatches">${swatches}</div>
      <div class="history-item-actions">
        <button class="btn-history-load">Load</button>
        <button class="btn-history-delete">Delete</button>
      </div>
    `;

    item.querySelector('.btn-history-load').addEventListener('click', () => {
      renderPalette(entry.palette);
      document.querySelector('[data-tab="colors"]')?.click();
    });
    item.querySelector('.btn-history-delete').addEventListener('click', () => {
      deleteHistoryEntry(entry.id);
    });

    list.appendChild(item);
  }
}

// ── Settings ─────────────────────────────────────────────────

function openSettings() {
  const panel = document.createElement('div');
  panel.className = 'settings-panel';
  panel.innerHTML = `
    <div class="settings-inner">
      <div class="settings-title">Settings</div>
      <div class="setting-row">
        <div>
          <div class="setting-label">Show Neutral Colors</div>
          <div class="setting-desc">Include grays in color groups</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="setting-neutral" ${state.settings.showNeutral ? 'checked' : ''}>
          <div class="toggle-track"></div>
        </label>
      </div>
      <button class="btn-close-settings">Close</button>
    </div>
  `;
  document.body.appendChild(panel);
  panel.querySelector('.btn-close-settings').addEventListener('click', () => panel.remove());
  panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });
  panel.querySelector('#setting-neutral').addEventListener('change', e => {
    state.settings.showNeutral = e.target.checked;
    chrome.storage.local.set({ settings: state.settings });
  });
}

// ── Export Actions ────────────────────────────────────────────

function setupExportActions() {
  const map = {
    css: () => $('export-css').textContent,
    scss: () => $('export-scss').textContent,
    tailwind: () => $('export-tailwind').textContent,
    json: () => $('export-json').textContent,
  };

  $$('.btn-export-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const format = btn.dataset.format;
      const action = btn.dataset.action;
      const content = map[format]?.();
      if (!content) return;

      if (action === 'copy') {
        await copyText(content, btn, 'Copy');
      } else if (action === 'download') {
        const ext = format === 'json' ? 'json' : format === 'css' ? 'css' : format === 'scss' ? 'scss' : 'js';
        const domain = state.palette?.site?.domain?.replace(/\./g, '-') || 'palette';
        const filename = `${domain}-colors.${ext}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }
    });
  });
}

// ── Tab Switching ─────────────────────────────────────────────

function setupTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $$('.tab-panel').forEach(p => p.classList.add('hidden'));
      btn.classList.add('active');
      const panel = $(`tab-${btn.dataset.tab}`);
      if (panel) {
        panel.classList.remove('hidden');
        panel.classList.add('active');
      }
      if (btn.dataset.tab === 'history') renderHistoryTab();
      if (btn.dataset.tab === 'accessibility' && !state.a11yFilter && state.palette) {
        renderAccessibility(state.palette);
      }
    });
  });
}

function showState(which) {
  ['state-loading','state-empty','state-error'].forEach(id => {
    $(id).classList.add('hidden');
  });
  if (which) $(which).classList.remove('hidden');
}

// ── Reload & Scan ────────────────────────────────────────────

async function reloadAndScan() {
  setSiteBar('Reloading tab...', 'scanning');
  
  // 1. Request reload
  chrome.runtime.sendMessage({ type: 'RELOAD_TAB' });

  // 2. Wait a bit for reload to start
  await new Promise(r => setTimeout(r, 1200));

  // 3. Ping until ready
  let attempts = 0;
  const maxAttempts = 20; // 10 seconds total
  
  const checkReady = async () => {
    attempts++;
    setSiteBar(`Waiting for page... (${attempts})`, 'scanning');
    
    chrome.runtime.sendMessage({
      type: 'SIDEBAR_TO_CONTENT',
      payload: { action: 'PING' }
    }, (res) => {
      if (res && res.success) {
        setSiteBar('Ready! Scanning...', 'ready');
        scanColors();
      } else if (attempts < maxAttempts) {
        setTimeout(checkReady, 600);
      } else {
        setSiteBar('Reload timed out', 'error');
        showState('state-error');
        $('error-title').textContent = 'Reload Timed Out';
        $('error-msg').textContent = 'The page took too long to respond. Please try refreshing manually.';
      }
    });
  };

  checkReady();
}

// ── Init ─────────────────────────────────────────────────────

async function init() {
  const { settings } = await chrome.storage.local.get('settings');
  if (settings) Object.assign(state.settings, settings);

  setupTabs();
  setupExportActions();

  $('scan-btn').addEventListener('click', scanColors);

  // Keyboard Navigation Support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const active = document.activeElement;
      if (active && active.classList.contains('color-card')) {
        copyText(active.dataset.hex.toUpperCase(), null);
      }
      if (active && (active.classList.contains('tab-btn'))) {
        active.click();
      }
    }
  });

  $('eyedropper-btn').addEventListener('click', openEyeDropper);
  $('picker-close').addEventListener('click', () => $('picker-toast').classList.add('hidden'));
  $('settings-btn').addEventListener('click', openSettings);
  $('save-btn').addEventListener('click', saveCurrentPalette);
  $('copy-all-btn').addEventListener('click', async () => {
    if (!state.palette) return;
    const allHex = (state.palette.topColors || []).map(c => c.hex.toUpperCase()).join('\n');
    await copyText(allHex, $('copy-all-btn'), 'Copy All HEX');
  });
  
  $('clear-highlights-btn').addEventListener('click', () => {
    sendToContent('REMOVE_HIGHLIGHT');
    document.querySelectorAll('.is-active').forEach(el => el.classList.remove('is-active'));
  });

  $('clear-history-btn')?.addEventListener('click', clearHistory);

  $('start-audit-btn').addEventListener('click', startMultiPageAudit);

  $('color-search').addEventListener('input', e => applySearch(e.target.value));

  setSiteBar('Ready to scan', '');
  $('state-empty').classList.remove('hidden');

  setTimeout(() => scanColors(), 400);
}

document.addEventListener('DOMContentLoaded', init);
