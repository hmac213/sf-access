// Import statement moved outside class to ensure proper module loading
let large_font_access;
let high_contrast_access;
let largeFontAccessInProgress = false; // Add global flag to track in-progress operations
let contrastAccessInProgress = false;

const moduleLoadPromise = Promise.all([
    import('./gemini_calls/large_font.js'),
    import('./gemini_calls/high_contrast.js')
]).then(([largeModule, highModule]) => {
    large_font_access = largeModule.default;
    high_contrast_access = highModule.default;
}).catch(error => {
    console.error('[EclectechElement] Error loading modules:', error);
});

class EclectechElement extends HTMLElement {
    constructor() {
        super();
        console.log('[EclectechElement] Constructor initializing');
        this.renderedHTML = undefined;
        this.accessButton = null;
        this._pendingFontAccess = false;
        this._pendingContrastAccess = false;
        this._fontAccessInProgress = false; // Add instance level tracking
        this._contrastAccessInProgress = false;
        this.loadingOverlay = null; // Reference to loading overlay element
        this.initializeAccessButton();
        this.createLoadingOverlay(); // Create loading overlay
    }

    connectedCallback() {
        window.requestAnimationFrame(() => {
            this.renderedHTML = document.documentElement.innerHTML;
            this.processAccessibilitySettings();
        });
    }
    
    async processAccessibilitySettings() {
        this.showLoading();
        await moduleLoadPromise; // Ensure modules are loaded first
        
        // Define a dynamic collection of accessibility endpoints
        const accessibilityEndpoints = [
            { attr: 'enable-large-font', sessionKey: 'largeFontUpdated', cacheKey: 'largeFontHtml', moduleFunction: large_font_access },
            { attr: 'enable-high-contrast', sessionKey: 'highContrastUpdated', cacheKey: 'highContrastHtml', moduleFunction: high_contrast_access }
            // Additional endpoints can be added here
        ];
        
        // Filter endpoints based on whether the attribute exists and moduleFunction is defined
        const endpoints = accessibilityEndpoints.filter(ep => this.hasAttribute(ep.attr) && typeof ep.moduleFunction === 'function');
        
        // Process all defined endpoints concurrently
        await Promise.all(endpoints.map(ep => this.processAccessibility(ep)));
        
        this.hideLoading();
    }

    async processAccessibility(endpoint) {
        // endpoint contains: { sessionKey, cacheKey, moduleFunction }
        if (sessionStorage.getItem(endpoint.sessionKey) === 'true') return;
        sessionStorage.setItem(endpoint.sessionKey, 'true');
        
        let cachedHtml = localStorage.getItem(endpoint.cacheKey);
        if (cachedHtml && cachedHtml.length > 100) {
            try {
                document.documentElement.innerHTML = cachedHtml;
                setTimeout(() => {
                    this.initializeAccessButton();
                    this.createLoadingOverlay();
                }, 100);
                return;
            } catch (error) {
                localStorage.removeItem(endpoint.cacheKey);
            }
        }
        const freshHtml = await this.applyFreshAccessibility(endpoint.moduleFunction, this.renderedHTML);
        if (freshHtml) {
            document.documentElement.innerHTML = freshHtml;
            setTimeout(() => {
                this.initializeAccessButton();
                this.createLoadingOverlay();
                localStorage.setItem(endpoint.cacheKey, freshHtml);
            }, 100);
        }
    }

    initializeAccessButton() {
        
        // Create accessibility button container
        this.accessButton = document.createElement('div');
        this.accessButton.className = 'eclectech-access-button';
        
        // Set styles for the button
        this.accessButton.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 20px;
            transform-origin: bottom left;
            border-radius: 8px 8px 0 0;
            background-color: #3B82F6;
            color: white;
            border-radius: 8px 8px 0 0;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            cursor: pointer;
            z-index: 9999;
            transition: all 0.3s ease;
            font-family: system-ui, -apple-system, sans-serif;
            padding: 12px 16px;
            font-size: 14px;
            font-weight: 500;
        `;
        
        // Create content
        this.accessButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="7" r="1"></circle>
                <path d="M9 12h2l1 5.5"></path>
                <path d="M15 12h-2l-1 5.5"></path>
            </svg>
            <span>Accessibility</span>
        `;
        
        // Add event listener for click
        this.accessButton.addEventListener('click', () => {
            console.log('[EclectechElement] Accessibility button clicked');
            this.openAccessibilityConfig();
        });
        
        // Add hover effect
        this.accessButton.addEventListener('mouseenter', () => {
            this.accessButton.style.transform = 'translateY(-3px)';
        });
        
        this.accessButton.addEventListener('mouseleave', () => {
            this.accessButton.style.transform = 'translateY(0)';
        });
        
        // Add to body when DOM is ready
        if (document.body) {
            document.body.appendChild(this.accessButton);
            console.log('[EclectechElement] Accessibility button added to DOM');
        } else {
            console.log('[EclectechElement] Body not ready, waiting for DOMContentLoaded');
            window.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(this.accessButton);
                console.log('[EclectechElement] Accessibility button added to DOM after DOMContentLoaded');
            });
        }
    }
    
    getPositionStyles(position) {
        switch (position) {
            case 'top-left':
                return `
                    top: 0;
                    left: 20px;
                    transform-origin: top left;
                    border-radius: 0 0 8px 8px;
                `;
            case 'top-right':
                return `
                    top: 0;
                    right: 20px;
                    transform-origin: top right;
                    border-radius: 0 0 8px 8px;
                `;
            case 'bottom-right':
                return `
                    bottom: 0;
                    right: 20px;
                    transform-origin: bottom right;
                    border-radius: 8px 8px 0 0;
                `;
            case 'bottom-left':
            default:
                return `
                    bottom: 0;
                    left: 20px;
                    transform-origin: bottom left;
                    border-radius: 8px 8px 0 0;
                `;
        }
    }
    
    openAccessibilityConfig() {
        // Get the current domain for the default config URL
        const originSite = window.location.origin;
        const currentPath = window.location.pathname + window.location.search;
        
        const currentConfig = Array.from(this.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {});
        
        const configParam = encodeURIComponent(JSON.stringify(currentConfig));

        const configUrl = `https://eqlec.tech/config` + 
        `?site=${encodeURIComponent(originSite)}` +
        `&path=${encodeURIComponent(currentPath)}` +
        `&config=${configParam}`;

        const width = 500;
        const height = 600;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        // Open the popup
        window.open(
          configUrl,
          'AccessibilityConfig',
          `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
        );

        
    }

    createLoadingOverlay() {
        // Create loading overlay
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'eclectech-loading-overlay';
        
        // Set styles for the loading overlay
        this.loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
            font-family: system-ui, -apple-system, sans-serif;
            color: white;
        `;
        
        // Create spinner
        const spinner = document.createElement('div');
        spinner.className = 'eclectech-spinner';
        spinner.style.cssText = `
            width: 50px;
            height: 50px;
            border: 5px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 20px;
        `;
        
        // Create animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        // Create message
        const message = document.createElement('div');
        message.textContent = 'Applying accessibility settings...';
        message.style.cssText = `
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 10px;
        `;
        
        // Create sub-message
        const subMessage = document.createElement('div');
        subMessage.textContent = 'This may take a few moments';
        subMessage.style.cssText = `
            font-size: 14px;
            opacity: 0.8;
        `;
        
        // Assemble the loading overlay
        this.loadingOverlay.appendChild(spinner);
        this.loadingOverlay.appendChild(message);
        this.loadingOverlay.appendChild(subMessage);
        
        // Add to body when DOM is ready
        if (document.body) {
            document.body.appendChild(this.loadingOverlay);
        } else {
            window.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(this.loadingOverlay);
            });
        }
    }
    
    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.opacity = '1';
            this.loadingOverlay.style.visibility = 'visible';
            console.log('[EclectechElement] Loading overlay shown');
        }
    }
    
    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.opacity = '0';
            this.loadingOverlay.style.visibility = 'hidden';
            console.log('[EclectechElement] Loading overlay hidden');
        }
    }
    
    logFontSizes(label) {
        console.log(`${label} Font sizes:`);
        
        // Log the computed font sizes of key elements
        const elements = {
            'body': document.body, 
            'h1': document.querySelector('h1'),
            'p': document.querySelector('p'),
            'button': document.querySelector('button')
        };
        
        for (const [name, element] of Object.entries(elements)) {
            if (element) {
                const style = window.getComputedStyle(element);
                console.log(`- ${name}: ${style.fontSize}`);
            } else {
                console.log(`- ${name}: element not found`);
            }
        }
        
        // Log the default/root font size
        console.log(`- Root font size: ${window.getComputedStyle(document.documentElement).fontSize}`);
    }
    
    // Utility method to clear all stored data - helpful for testing
    clearStoredData() {
        console.log('[EclectechElement] Clearing all stored accessibility data');
        localStorage.removeItem('largeFontHtml');
        sessionStorage.removeItem('largeFontUpdated');
        location.reload();
    }

    async applyFreshAccessibility(moduleFunction, htmlSnapshot) {
        try {
            let outputHtml = await moduleFunction(htmlSnapshot);
            if (!outputHtml) return null;
            // Remove markdown-like formatting if present
            outputHtml = outputHtml.replace(/^```html\s*/, '').replace(/```\s*$/, '');
            return outputHtml.length < 100 ? null : outputHtml;
        } catch (error) {
            console.error('[EclectechElement] Error in applyFreshAccessibility:', error);
            return null;
        }
    }
}

customElements.define('eclec-tech', EclectechElement);