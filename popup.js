document.addEventListener('DOMContentLoaded', function() {
    const extractBtn = document.getElementById('extract-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    const statusText = document.getElementById('status-text');

    extractBtn.addEventListener('click', extractColors);
    refreshBtn.addEventListener('click', refresh);

    async function extractColors() {
        showLoading();
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
                throw new Error('Cannot analyze Chrome internal pages');
            }
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: analyzeWebsiteColors
            });
            
            const colors = results[0].result;
            displayColors(colors);
            
        } catch (err) {
            console.error('Error:', err);
            showError();
        }
    }

    function analyzeWebsiteColors() {
        function rgbToHex(r, g, b) {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }
        
        function parseColor(color) {
            if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
            
            if (color.includes('rgb')) {
                const match = color.match(/\d+/g);
                if (match && match.length >= 3) {
                    return rgbToHex(parseInt(match[0]), parseInt(match[1]), parseInt(match[2]));
                }
            }
            
            return color.startsWith('#') ? color : null;
        }
        
        function getColorFromElement(element, property) {
            if (!element) return null;
            const style = window.getComputedStyle(element);
            return parseColor(style.getPropertyValue(property));
        }
        
        function findColorfulElements() {
            const elements = document.querySelectorAll('*');
            const colors = {
                primary: [],
                backgrounds: [],
                texts: [],
                borders: []
            };
            
            elements.forEach(el => {
                const style = window.getComputedStyle(el);
                const bgColor = parseColor(style.backgroundColor);
                const textColor = parseColor(style.color);
                const borderColor = parseColor(style.borderColor);
                
                if (bgColor && bgColor !== '#ffffff' && bgColor !== '#000000') {
                    colors.backgrounds.push(bgColor);
                }
                if (textColor && textColor !== '#000000') {
                    colors.texts.push(textColor);
                }
                if (borderColor && borderColor !== '#000000') {
                    colors.borders.push(borderColor);
                }
            });
            
            return colors;
        }
        
        function getMostCommonColor(colors) {
            if (!colors || colors.length === 0) return null;
            
            const frequency = {};
            colors.forEach(color => {
                frequency[color] = (frequency[color] || 0) + 1;
            });
            
            return Object.keys(frequency).reduce((a, b) => 
                frequency[a] > frequency[b] ? a : b
            );
        }
        
        // Analyze the page
        const colorData = findColorfulElements();
        const body = document.body;
        const heading = document.querySelector('h1, h2, h3, h4, h5, h6');
        const paragraph = document.querySelector('p');
        
        // Find primary color (most common background color that's not white/black)
        const primaryColor = getMostCommonColor(colorData.backgrounds) || '#007bff';
        
        // Find secondary color (second most common or complementary)
        const secondaryColor = colorData.backgrounds.find(c => c !== primaryColor) || '#6c757d';
        
        // Get actual text colors
        const titleColor = getColorFromElement(heading, 'color') || getMostCommonColor(colorData.texts) || '#212529';
        const paragraphColor = getColorFromElement(paragraph, 'color') || '#495057';
        
        // Get border colors
        const borderColor = getMostCommonColor(colorData.borders) || '#dee2e6';
        
        // Get background
        const backgroundColor = getColorFromElement(body, 'background-color') || '#ffffff';
        
        return [
            {
                name: 'Primary Color',
                hex: primaryColor
            },
            {
                name: 'Secondary Color',
                hex: secondaryColor
            },
            {
                name: 'Title Color',
                hex: titleColor
            },
            {
                name: 'Paragraph Color',
                hex: paragraphColor
            },
            {
                name: 'Line / Border Color',
                hex: borderColor
            },
            {
                name: 'Background Color',
                hex: backgroundColor
            }
        ];
    }

    function displayColors(colors) {
        results.innerHTML = '';
        
        colors.forEach(color => {
            const item = document.createElement('div');
            item.className = 'color-item';
            
            const rgb = hexToRgb(color.hex);
            const rgbString = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : 'Invalid color';
            
            item.innerHTML = `
                <div class="color-preview" style="background-color: ${color.hex}"></div>
                <div class="color-info">
                    <div class="color-name">${color.name}</div>
                    <div class="color-value">${color.hex} • ${rgbString}</div>
                </div>
                <button class="copy-btn" data-color="${color.hex}">Copy</button>
            `;
            
            const copyBtn = item.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => copyColor(color.hex, copyBtn));
            
            results.appendChild(item);
        });
        
        showResults();
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function copyColor(color, button) {
        navigator.clipboard.writeText(color).then(() => {
            button.textContent = 'Copied!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.textContent = 'Copy';
                button.classList.remove('copied');
            }, 1000);
        });
    }

    function showLoading() {
        loading.classList.remove('hidden');
        results.classList.add('hidden');
        error.classList.add('hidden');
    }

    function showResults() {
        loading.classList.add('hidden');
        results.classList.remove('hidden');
        error.classList.add('hidden');
        statusText.textContent = 'Colors extracted successfully!';
    }

    function showError() {
        loading.classList.add('hidden');
        results.classList.add('hidden');
        error.classList.remove('hidden');
        statusText.textContent = 'Error occurred. Please try again.';
    }

    function refresh() {
        results.classList.add('hidden');
        error.classList.add('hidden');
        statusText.textContent = 'Ready to analyze! Click "Extract Colors" to capture the current website\'s color palette.';
    }
});