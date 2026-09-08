# Chrome Web Store Listing & Publishing Specification

> **Color Analyzer Pro** — Single Source of Truth for Chrome Web Store Dashboard Metadata, Permissions Justification, Privacy Disclosures, and Version History.

---

## 1. Store Metadata

- **Extension Name**: Color Analyzer Pro
- **Short Name**: ColorAnalyzer
- **Version**: 1.0.0
- **Summary / Short Description** (Max 132 chars):
  Enterprise-grade website color palette extractor with WCAG accessibility, export tools, and history.
- **Category**: Developer Tools / Productivity
- **Primary Language**: English

### Detailed Store Description
```text
Color Analyzer Pro is an enterprise-grade color palette extractor and design inspector built with Google Chrome's modern Side Panel API.

Extract, audit, and export the complete color palette of any website in seconds—right inside your browser side panel without blocking your view.

KEY CAPABILITIES:

⚡ Instant 1-Click Palette Extraction
Scans the entire webpage (DOM, Shadow DOM, CSS custom properties, inline styles, gradients, and SVG graphics) to produce an organized brand color system.

🎨 Smart Categorization
Automatically organizes discovered colors into:
• Brand Identity (Primary & Secondary dominant colors)
• Backgrounds
• Text & Typography
• Borders & Outlines
• Gradients & Vector SVGs
• CSS Variables & Design Tokens (:root, html, body)
• Page Sections (Header, Hero, Features, Pricing, Footer)

🛡️ WCAG 2.1 Contrast & Accessibility Suite
Verify accessibility compliance before shipping:
• Real-time relative luminance & contrast ratio calculation (1:1 to 21:1)
• Instant AA and AAA badges
• 1-click suggested color adjustments to repair failing text pairs

📐 Modern Color Formats
Seamlessly view and copy colors in HEX, RGB, HSL, and OKLCH color space.

💻 Developer Code Export
Copy or download production-ready code in one click:
• Tailwind CSS 3/4 theme colors configuration
• CSS Custom Properties (:root variables)
• SCSS / Sass variables
• Clean JSON palette schema

🔍 Built-in Eyedropper & Precision Highlighting
• Sample any pixel on your monitor using the native Chrome EyeDropper
• Hover or click swatches to spotlight matching elements directly on the active webpage with pulsating highlights

🌐 Multi-Page Brand Audit & History
• Audit brand color consistency across related subpages
• Save palettes to local storage with one click for offline reference

100% Client-Side & Privacy-First:
All color analysis and processing executes locally on your device. Color Analyzer Pro does NOT track your browsing history or transmit your data to external servers.
```

---

## 2. Permissions Justifications (CWS Compliance)

Every permission declared in `manifest.json` requires an explicit, plain-English justification for the Chrome Web Store review team:

| Permission | Reviewer Justification |
| :--- | :--- |
| `sidePanel` | Required to render the extension's user interface directly inside the native Chrome Side Panel window alongside web pages. |
| `tabs` | Required to query the active tab's URL and title for identifying the website domain during analysis and auditing. |
| `activeTab` | Required to inspect the current active tab and execute color sampling on user gesture. |
| `scripting` | Required to dynamically inject the DOM extraction script (`content.js`) when the user initiates analysis on an existing tab. |
| `storage` | Required to save palettes and user settings locally on the user's browser (`chrome.storage.local`). |
| `contextMenus` | Required to provide an "Analyze Colors on This Page" right-click option for quick access. |
| `host_permissions` (`<all_urls>`) | Required to analyze CSS styles, computed colors, gradients, and SVG elements on any website the user chooses to analyze. |

---

## 3. Privacy & Data Use Disclosures

- **Single Purpose**: Analyze and display color palettes, WCAG contrast ratios, and design tokens from user-selected web pages.
- **Data Collection**: No personal data, cookies, authentication credentials, or financial information are collected or transmitted.
- **Remote Code**: None. The extension complies strictly with Manifest V3 restrictions; all code is bundled locally.
- **Telemetry / Analytics**: None.

---

## 4. Visual Assets Checklist

- [x] Icon 16x16: `icons/icon16.png`
- [x] Icon 32x32: `icons/icon32.png`
- [x] Icon 48x48: `icons/icon48.png`
- [x] Icon 128x128: `icons/icon128.png`
- [ ] Promotional Tile (Small): 440×280 px
- [ ] Promotional Tile (Marquee): 1400×560 px
- [ ] Store Screenshots (at least 1): 1280×800 or 640×400 px

---

## 5. Version History

- **v1.0.0** (Current Release):
  - Full Manifest V3 migration with native Chrome Side Panel support.
  - Real-time DOM, Shadow DOM, CSS Variables, Gradients, and SVG color extraction.
  - WCAG 2.1 AA/AAA contrast auditing with 1-click color repair suggestions.
  - Developer exports: Tailwind CSS config, CSS variables, SCSS, and JSON.
  - OKLCH color space computation.
  - Integrated EyeDropper tool.
  - Multi-page brand consistency auditor.
  - High-resolution PNG icons and SEO-optimized documentation.
