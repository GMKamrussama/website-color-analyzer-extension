# 🎨 Color Analyzer Pro — Website Color Palette Extractor & Design Inspector

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-blue?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Version](https://img.shields.io/badge/version-1.0.0-emerald)](https://github.com/GMKamrussama/website-color-analyzer-extension)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Accessibility](https://img.shields.io/badge/WCAG%202.1-AA%20%2F%20AAA%20Auditing-purple)](#-wcag-accessibility-checker)
[![Export Formats](https://img.shields.io/badge/Exports-Tailwind%20%7C%20CSS%20%7C%20SCSS%20%7C%20JSON-orange)](#-developer-export-tools)

> **Color Analyzer Pro** is an enterprise-grade, privacy-focused Chrome Extension (Manifest V3) that extracts, visualizes, and audits color palettes from any live webpage. Built with a glassmorphic Side Panel UI, automatic Shadow DOM traversal, WCAG accessibility compliance checking, OKLCH color space support, and 1-click developer exports.

---

## 🌟 Overview & Key Highlights

Whether you are a **UI/UX designer** seeking brand inspiration, a **frontend developer** converting client designs into CSS tokens or Tailwind configs, or an **accessibility auditor** verifying WCAG 2.1 contrast compliance, **Color Analyzer Pro** delivers complete color intelligence right inside your browser side panel.

- **⚡ Instant 1-Click Extraction**: Scans DOM, Shadow DOM, CSS stylesheets, inline styles, CSS custom properties (`--var`), gradients, and SVG graphics.
- **🎯 Live On-Page Spotlight**: Hover or click any color swatch or section to spotlight matching elements directly on the active webpage with pulsing highlights.
- **🛡️ WCAG 2.1 Accessibility Suite**: Computes real-time contrast ratios against backgrounds, issues AA/AAA compliance badges, and generates color corrections for failing text pairs.
- **📐 Modern Color Space Formats**: Instant conversions across **HEX**, **RGB**, **HSL**, and next-generation perceptual **OKLCH** color values.
- **💾 One-Click Developer Code Generation**: Export palettes directly into **Tailwind CSS 3/4 config**, **CSS Custom Properties (:root)**, **SCSS variables**, or **JSON**.
- **🔍 Built-in EyeDropper**: Native Chromium EyeDropper integration to sample any pixel color from your screen.
- **🌐 Multi-Page Brand Consistency Audit**: Crawls internal site links to measure palette consistency across pages (Home, About, Pricing, Contact).
- **🔒 100% Private & Client-Side**: No external APIs, no tracking, no cookies, no user data collection.

---

## 🚀 Key Features

### 1. Smart Semantic Palette Extraction
Unlike basic color pickers that only read pixel under the cursor, Color Analyzer Pro recursively analyzes:
- **Brand Identity**: Identifies dominant Primary and Secondary brand colors based on visual weighting.
- **Functional Categorization**: Groups colors intelligently into **Backgrounds**, **Text Colors**, **Borders**, **Gradients**, and **SVG & Icons**.
- **CSS Variable Harvester**: Detects declared `--color-*` and design system tokens from `:root`, `html`, and `body` rules.
- **Section Palettes**: Automatically segments colors by layout areas: *Header*, *Hero*, *Services*, *Portfolio*, *Pricing*, *Testimonials*, and *Footer*.

### 2. WCAG 2.1 AA / AAA Accessibility Checker
- Calculates standard relative luminance and contrast ratios ($1:1$ to $21:1$).
- Evaluates against **WCAG AA** (minimum $4.5:1$ for normal text) and **WCAG AAA** ($7:1$).
- For any combination that **Fails**, the smart contrast engine suggests the nearest lightness-adjusted color that satisfies accessibility standards with a single click.

### 3. Precision Visual Highlighting
- **Interactive Swatch Hover**: Hover over any extracted color swatch to illuminate and highlight all matching elements on the active webpage.
- **Click-to-Scroll**: Click any color card or section to smoothly scroll the browser viewport directly to the highlighted elements.
- **Clear Overlays**: Single-click overlay reset (`Esc` or clear button in the top action bar).

### 4. Developer Export Tools
Generate production-ready code in seconds:
| Export Format | Output Preview |
| :--- | :--- |
| **Tailwind CSS** | Ready-to-paste `theme.extend.colors` module export configuration |
| **CSS Variables** | `:root { --color-primary: #...; }` design tokens |
| **SCSS** | `$color-primary: #...;` Sass variables |
| **JSON** | Machine-readable palette schema with RGB, HSL, and semantic categorizations |

### 5. Multi-Page Site Audit
- Analyzes brand consistency across multiple internal pages of the same domain.
- Calculates an aggregate **Brand Alignment Score** and flags visual discrepancies across subpages.

### 6. Persistent History
- Save extracted palettes to your local browser storage (`chrome.storage.local`).
- Re-open, review, or export previously saved website palettes at any time.

---

## 🛠 Tech Stack & Architecture

- **Platform**: Google Chrome Extension (Manifest Version 3)
- **UI Architecture**: Chrome Side Panel API (`chrome.sidePanel`) with responsive CSS glassmorphism
- **DOM Engine**: Recursive Shadow DOM traversal, `getComputedStyle`, CSS rules parser, and SVG element inspector
- **Color Mathematics**: sRGB luminance, WCAG contrast formula, OKLCH perceptual lightness & chroma matrices, HSL/RGB conversion
- **Storage**: `chrome.storage.local` persistent state management
- **Zero External Runtime Dependencies**: Pure Vanilla JavaScript (ES2022+), CSS3, and HTML5

---

## 📥 Installation & Setup

### Option 1: Load as Unpacked Extension (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/GMKamrussama/website-color-analyzer-extension.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
3. In the top-right corner, turn ON **Developer mode**.
4. Click the **Load unpacked** button.
5. Select the `website-color-analyzer-extension` root folder (containing `manifest.json`).
6. Pin **Color Analyzer Pro** to your Chrome toolbar.

### Option 2: Usage Instructions

1. Navigate to any website (e.g., `https://github.com` or `https://stripe.com`).
2. Click the **Color Analyzer Pro** icon in your browser toolbar or right-click anywhere on the page and select **"Analyze Colors on This Page"**.
3. The sleek Side Panel opens instantly with full color breakdown.
4. Click **Scan Page Colors** to refresh or explore tabs:
   - **Colors**: Brand identity, backgrounds, text, borders, gradients, and CSS variables.
   - **Sections**: Layout section breakdowns (Header, Hero, Footer, etc.).
   - **A11y**: WCAG contrast matrix and 1-click accessibility fixes.
   - **Audit**: Multi-page consistency benchmarking.
   - **Export**: Copy or download Tailwind, CSS, SCSS, or JSON code.
   - **History**: Access and manage saved palettes.

---

## ⌨️ Keyboard Shortcuts & Quick Actions

- <kbd>Enter</kbd> on a focused color card: Copies HEX color code to clipboard.
- <kbd>Enter</kbd> on a navigation tab: Switches tab panel.
- <kbd>Clear Highlight</kbd> button (top header): Clears all spotlight outlines from the webpage.
- **Eyedropper** icon (top header): Opens screen pixel color picker.

---

## 🔍 SEO Keywords & Topic Tags

`chrome-extension` · `manifest-v3` · `color-picker` · `color-palette-extractor` · `wcag-accessibility` · `contrast-checker` · `tailwind-palette-generator` · `css-variables` · `oklch-color` · `design-systems` · `ui-ux-tools` · `front-end-development` · `web-design` · `website-color-scheme`

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m "Add some AmazingFeature"`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

Developed with ❤️ by [G. M. Kamrussama](https://github.com/GMKamrussama).
