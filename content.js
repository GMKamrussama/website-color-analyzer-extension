// ============================================================
// Color Analyzer Pro — Content Script (Extraction Engine)
// ============================================================

'use strict';

// ── Utilities ────────────────────────────────────────────────

function parseRgbString(str) {
  if (!str || str === 'transparent' || str === 'none') return null;
  const m = str.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (m) return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10) };
  return null;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
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
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.toLowerCase().trim().replace('#', '');
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  if (clean.length !== 6) return null; // Ignore alpha/invalid for strict matching
  return '#' + clean;
}

function colorToHex(colorStr) {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') return null;
  const rgb = parseRgbString(colorStr);
  if (rgb) return normalizeHex(rgbToHex(rgb.r, rgb.g, rgb.b));
  if (/^#[0-9a-f]{3,10}$/i.test(colorStr)) return normalizeHex(colorStr);
  return null;
}

function parseGradientColors(gradient) {
  const colors = [];
  const cleanRegex = /#[0-9a-f]{3,6}|rgba?\([^)]+\)/gi;
  let m;
  while ((m = cleanRegex.exec(gradient)) !== null) {
    const hex = colorToHex(m[0]);
    if (hex) colors.push(hex);
  }
  return colors;
}

function colorDistance(hex1, hex2) {
  const a = hexToRgb(hex1), b = hexToRgb(hex2);
  return Math.sqrt(Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2));
}

function isNearWhite(hex) {
  const { r, g, b } = hexToRgb(hex);
  return r > 240 && g > 240 && b > 240;
}

function isNearBlack(hex) {
  const { r, g, b } = hexToRgb(hex);
  return r < 15 && g < 15 && b < 15;
}

function deduplicateColors(colorMap, threshold = 25) {
  const keys = Object.keys(colorMap).sort((a, b) => colorMap[b] - colorMap[a]);
  const result = [];
  for (const key of keys) {
    const isTooClose = result.some(existing => colorDistance(key, existing.hex) < threshold);
    if (!isTooClose) result.push({ hex: key, count: colorMap[key] });
    if (result.length >= 80) break;
  }
  return result;
}

function buildColorEntry(hex, count, source) {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return { hex, count, source, rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` };
}

// ── Extraction Logic ─────────────────────────────────────────

function extractCssVariables() {
  const varsMap = new Map();

  // 1. Inspect stylesheets rules
  try {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      let rules;
      try { rules = Array.from(sheet.cssRules || []); } catch { continue; }
      for (const rule of rules) {
        if (rule.style && (rule.selectorText === ':root' || rule.selectorText === 'html' || rule.selectorText === 'body' || rule.selectorText?.includes(':root'))) {
          const style = rule.style;
          for (let i = 0; i < style.length; i++) {
            const prop = style[i];
            if (prop && prop.startsWith('--')) {
              const val = style.getPropertyValue(prop).trim();
              const hex = colorToHex(val);
              if (hex && !varsMap.has(prop)) {
                varsMap.set(prop, hex);
              }
            }
          }
        }
      }
    }
  } catch (e) {}

  // 2. Also inspect computed styles on documentElement
  try {
    const rootStyle = window.getComputedStyle(document.documentElement);
    for (let i = 0; i < rootStyle.length; i++) {
      const prop = rootStyle[i];
      if (prop && prop.startsWith('--') && !varsMap.has(prop)) {
        const val = rootStyle.getPropertyValue(prop).trim();
        const hex = colorToHex(val);
        if (hex) varsMap.set(prop, hex);
      }
    }
  } catch (e) {}

  const result = [];
  varsMap.forEach((hex, name) => {
    result.push({ name, hex });
  });
  return result.slice(0, 50);
}

function extractGradients() {
  const gradientColors = {};
  const elements = document.querySelectorAll('*');
  for (const el of elements) {
    let style;
    try { style = getComputedStyle(el); } catch (e) { continue; }
    const bg = style.backgroundImage;
    if (bg && (bg.includes('gradient'))) {
      const colors = parseGradientColors(bg);
      colors.forEach(c => {
        if (!isNearWhite(c) && !isNearBlack(c)) {
          gradientColors[c] = (gradientColors[c] || 0) + 1;
        }
      });
    }
  }
  return gradientColors;
}

function blendColors(fg, bg) {
  if (fg.a === 1) return fg;
  const alpha = fg.a;
  return {
    r: Math.round((1 - alpha) * bg.r + alpha * fg.r),
    g: Math.round((1 - alpha) * bg.g + alpha * fg.g),
    b: Math.round((1 - alpha) * bg.b + alpha * fg.b),
    a: 1
  };
}

function parseRgba(rgba) {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return { r: 0, g: 0, b: 0, a: 1 };
  return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]), a: m[4] !== undefined ? parseFloat(m[4]) : 1 };
}

function findParentBg(el) {
  let curr = el.parentElement;
  while (curr) {
    try {
      const style = window.getComputedStyle(curr);
      const bg = parseRgba(style.backgroundColor);
      if (bg.a === 1) return bg;
    } catch(e) {}
    curr = curr.parentElement;
  }
  return { r: 255, g: 255, b: 255, a: 1 };
}

function scanElementColors(root) {
  const backgrounds = {}, texts = {}, borders = {}, svgs = {};
  let totalScanned = 0;

  function traverse(node) {
    if (!node || node.nodeType !== 1) return;
    totalScanned++;

    let style;
    try { style = window.getComputedStyle(node); } catch(e) { return; }
    if (!style) return;

    // Background color
    try {
      const bgStr = style.backgroundColor;
      if (bgStr && bgStr !== 'transparent' && bgStr !== 'rgba(0, 0, 0, 0)') {
        let c = parseRgba(bgStr);
        if (c.a < 1) c = blendColors(c, findParentBg(node));
        const hex = rgbToHex(c.r, c.g, c.b);
        if (hex) backgrounds[hex] = (backgrounds[hex] || 0) + 1;
      }
    } catch(e) {}

    // Text color
    try {
      const txtStr = style.color;
      if (txtStr && txtStr !== 'transparent' && txtStr !== 'rgba(0, 0, 0, 0)') {
        let c = parseRgba(txtStr);
        if (c.a < 1) c = blendColors(c, findParentBg(node));
        const hex = rgbToHex(c.r, c.g, c.b);
        if (hex) texts[hex] = (texts[hex] || 0) + 1;
      }
    } catch(e) {}

    // Border colors
    const borderProps = ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
    for (const bProp of borderProps) {
      try {
        const bStr = style[bProp];
        if (bStr && bStr !== 'transparent' && bStr !== 'rgba(0, 0, 0, 0)') {
          let c = parseRgba(bStr);
          if (c.a < 1) c = blendColors(c, findParentBg(node));
          const hex = rgbToHex(c.r, c.g, c.b);
          if (hex) {
            borders[hex] = (borders[hex] || 0) + 1;
            break; // one border sample per element
          }
        }
      } catch(e) {}
    }

    // SVG fills & strokes
    if (node.tagName && (node.tagName.toLowerCase() === 'svg' || node.ownerSVGElement)) {
      try {
        const fill = style.fill;
        const fillHex = colorToHex(fill);
        if (fillHex && !isNearWhite(fillHex)) {
          svgs[fillHex] = (svgs[fillHex] || 0) + 1;
        }

        const stroke = style.stroke;
        const strokeHex = colorToHex(stroke);
        if (strokeHex && !isNearWhite(strokeHex)) {
          svgs[strokeHex] = (svgs[strokeHex] || 0) + 1;
        }
      } catch(e) {}
    }

    for (const child of node.children) traverse(child);
    if (node.shadowRoot) {
      for (const child of node.shadowRoot.children) traverse(child);
    }
  }

  traverse(root);
  return {
    totalScanned,
    maps: { backgrounds, texts, borders, svgs }
  };
}

function findSections() {
  const sections = [];
  const candidates = [
    { name: 'Header', selectors: ['header', '#header', '.header', 'nav', '.nav-container'] },
    { name: 'Hero', selectors: ['#hero', '.hero', '.banner', '.hero-section', '.jumbotron'] },
    { name: 'Services', selectors: ['#services', '.services', '.features', '.benefits', '#features'] },
    { name: 'Portfolio', selectors: ['#portfolio', '.portfolio', '.work', '.projects', '#work'] },
    { name: 'Pricing', selectors: ['#pricing', '.pricing', '.plans', '#plans'] },
    { name: 'Testimonials', selectors: ['#testimonials', '.reviews', '.feedback', '#reviews'] },
    { name: 'Main', selectors: ['main', '#main', '.main-content', '#content'] },
    { name: 'Contact', selectors: ['#contact', '.contact-section', '#cta'] },
    { name: 'Footer', selectors: ['footer', '#footer', '.footer', '.site-footer'] },
    { name: 'Sidebar', selectors: ['aside', '#sidebar', '.sidebar'] }
  ];

  candidates.forEach(c => {
    for (const sel of c.selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetHeight > 40 && el.offsetParent !== null) {
        const id = `section-${c.name.toLowerCase().replace(/\s+/g, '-')}`;
        el.setAttribute('data-analyzer-id', id);
        sections.push({ name: c.name, analyzerId: id, element: el });
        break;
      }
    }
  });

  return sections;
}

function runExtraction() {
  const scanResult = scanElementColors(document.body);
  const dom = scanResult.maps;
  const sections = findSections();
  const cssVars = extractCssVariables();
  const gradientMap = extractGradients();
  
  const sectionData = sections.map(s => {
    const sResult = scanElementColors(s.element);
    const merged = { ...sResult.maps.backgrounds, ...sResult.maps.texts };
    const top = deduplicateColors(merged, 20).slice(0, 8).map(c => buildColorEntry(c.hex, c.count, 'section'));
    return { name: s.name, analyzerId: s.analyzerId, colors: top };
  });

  const mergedAll = { ...dom.backgrounds, ...dom.texts, ...dom.borders, ...dom.svgs, ...gradientMap };
  const topColors = deduplicateColors(mergedAll, 15).slice(0, 40).map(c => buildColorEntry(c.hex, c.count, 'all'));

  return {
    site: {
      url: window.location.href,
      domain: window.location.hostname,
      title: document.title || window.location.hostname
    },
    totalScanned: scanResult.totalScanned,
    cssVars: cssVars,
    sections: sectionData,
    topColors: topColors,
    groups: {
      background: deduplicateColors(dom.backgrounds, 20).slice(0, 15).map(c => buildColorEntry(c.hex, c.count, 'bg')),
      text: deduplicateColors(dom.texts, 20).slice(0, 15).map(c => buildColorEntry(c.hex, c.count, 'text')),
      border: deduplicateColors(dom.borders, 20).slice(0, 12).map(c => buildColorEntry(c.hex, c.count, 'border')),
      gradient: deduplicateColors(gradientMap, 20).slice(0, 10).map(c => buildColorEntry(c.hex, c.count, 'gradient')),
      svg: deduplicateColors(dom.svgs, 20).slice(0, 12).map(c => buildColorEntry(c.hex, c.count, 'svg'))
    }
  };
}

// ── Absolute Precision Highlighting ──────────────────────────

function removeHighlight() {
  const existing = document.getElementById('__cap_highlight_root__');
  if (existing) existing.remove();
  window.removeEventListener('resize', removeHighlight);
}

function highlightElements(hex, scroll = false, bgHex = null) {
  removeHighlight();
  const targetHex = normalizeHex(hex);
  const targetBg = normalizeHex(bgHex);
  
  const els = queryAllElementsRecursive(document.body);
  const matched = [];
  
  const container = document.createElement('div');
  container.id = '__cap_highlight_root__';
  const dim = targetBg ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.15)';
  container.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:2147483647;background:${dim};transition: background 0.3s;`;
  document.documentElement.appendChild(container);

  for (const el of els) {
    if (el.nodeType !== 1) continue;
    const style = getComputedStyle(el);
    const fg = colorToHex(style.color);
    const bg = colorToHex(style.backgroundColor);
    
    let effectiveBg = bg;
    if (!bg || bg === 'transparent') {
      const pBg = findParentBg(el);
      effectiveBg = normalizeHex(rgbToHex(pBg.r, pBg.g, pBg.b));
    }
    
    const fgMatch = (fg === targetHex);
    const bgMatch = (!targetBg || effectiveBg === targetBg);

    if (fgMatch && bgMatch) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0.5 && rect.height > 0.5) {
        matched.push(el);
        const marker = document.createElement('div');
        marker.style.cssText = `
          position:fixed;
          left:0; top:0;
          width:${rect.width}px;
          height:${rect.height}px;
          border:${targetBg ? '5px' : '3px'} solid #7c3aed;
          background:${targetBg ? 'rgba(255,255,255,0.15)' : 'rgba(124, 58, 237, 0.25)'};
          box-sizing:border-box;
          border-radius:4px;
          box-shadow: 0 0 30px rgba(124,58,237,0.8), inset 0 0 15px rgba(124,58,237,0.5);
          --x: ${rect.left}px;
          --y: ${rect.top}px;
          transform: translate(var(--x), var(--y));
          transform-origin: center;
          z-index: 10;
          animation: __cap_pulse_intense__ 1.2s infinite ease-in-out;
        `;
        container.appendChild(marker);
      }
    }
    if (matched.length > 80) break;
  }

  if (matched.length > 0 && scroll) {
    matched[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  window.addEventListener('resize', removeHighlight);
}

function queryAllElementsRecursive(root) {
  const all = Array.from(root.querySelectorAll('*'));
  const shadows = Array.from(root.querySelectorAll('*')).filter(el => el.shadowRoot);
  shadows.forEach(s => { all.push(...queryAllElementsRecursive(s.shadowRoot)); });
  return all;
}

// ── Message Listener ─────────────────────────────────────────

function normalizeUrl(href) {
  try {
    const url = new URL(href);
    return {
      domain: url.hostname.replace(/^www\./, ''),
      path: url.pathname.replace(/\/$/, '') || '/',
      full: url.origin + url.pathname
    };
  } catch(e) { return null; }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'PING') sendResponse({ success: true });
  else if (message.action === 'EXTRACT_COLORS') sendResponse({ success: true, data: runExtraction() });
  else if (message.action === 'REMOVE_HIGHLIGHT') { removeHighlight(); sendResponse({ success: true }); }
  else if (message.action === 'HIGHLIGHT_SECTION') {
    const el = document.querySelector(`[data-analyzer-id="${message.id}"]`);
    if (el) {
      removeHighlight();
      const rect = el.getBoundingClientRect();
      const container = document.createElement('div');
      container.id = '__cap_highlight_root__';
      container.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:2147483647;background:rgba(0,0,0,0.2);';
      document.documentElement.appendChild(container);
      
      const marker = document.createElement('div');
      marker.style.cssText = `
        position:fixed;
        left:0; top:0;
        width:${rect.width}px;
        height:${rect.height}px;
        border:6px solid #8b5cf6;
        background:rgba(139, 92, 246, 0.2);
        box-shadow: 0 0 50px rgba(139, 92, 246, 0.8), inset 0 0 20px rgba(139, 92, 246, 0.4);
        box-sizing:border-box;
        border-radius:10px;
        transform: translate(${rect.left}px, ${rect.top}px);
        animation: __cap_spotlight__ 2s infinite;
      `;
      container.appendChild(marker);
      if (message.scroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    sendResponse({ success: true });
  }
  else if (message.action === 'HIGHLIGHT_COLOR') {
    highlightElements(message.hex, message.scroll, message.bg);
    sendResponse({ success: true });
  }
  else if (message.action === 'GET_DOMAIN_LINKS') {
    const current = normalizeUrl(window.location.href);
    const links = Array.from(document.querySelectorAll('a'))
      .map(a => normalizeUrl(a.href))
      .filter(u => u && u.domain === current.domain && u.path !== current.path && !u.path.includes('#'))
      .map(u => u.full);
    
    sendResponse({ success: true, links: [...new Set(links)].slice(0, 50) });
  }
  return true;
});

// Animation styles
if (!document.getElementById('__cap_styles__')) {
  const s = document.createElement('style');
  s.id = '__cap_styles__';
  s.textContent = `
    @keyframes __cap_spotlight__ {
      0% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.6), inset 0 0 10px rgba(139, 92, 246, 0.3); }
      50% { box-shadow: 0 0 80px rgba(139, 92, 246, 1.0), inset 0 0 40px rgba(139, 92, 246, 0.6); }
      100% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.6), inset 0 0 10px rgba(139, 92, 246, 0.3); }
    }
    @keyframes __cap_pulse_intense__ {
      0% { opacity: 0.7; transform: translate(var(--x), var(--y)) scale(1); }
      50% { opacity: 1; transform: translate(var(--x), var(--y)) scale(1.03); }
      100% { opacity: 0.7; transform: translate(var(--x), var(--y)) scale(1); }
    }
  `;
  document.head.appendChild(s);
}