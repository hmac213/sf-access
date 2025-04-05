// Import statement moved outside class to ensure proper module loading
let large_font_access;
let moduleLoaded = false;
let fontAccessInProgress = false; // Add global flag to track in-progress operations

// Create a promise to track when the module is loaded
const moduleLoadPromise = new Promise((resolve, reject) => {
    try {
        console.log('[EclectechElement] Attempting to import large_font_access');
        import('./gemini_calls/large_font.js')
            .then(module => {
                console.log('[EclectechElement] Successfully imported large_font_access module');
                large_font_access = module.default;
                moduleLoaded = true;
                resolve(module.default);
                
                // Check if we have any pending font access requests
                const element = document.querySelector('eclec-tech');
                if (element && element._pendingFontAccess && !fontAccessInProgress) {
                    console.log('[EclectechElement] Processing pending font access request');
                    element.enableLargeFontAccess();
                }
            })
            .catch(error => {
                console.error('[EclectechElement] Error importing large_font_access:', error);
                reject(error);
            });
    } catch (error) {
        console.error('[EclectechElement] Critical error with import syntax:', error);
        reject(error);
    }
});

// Check for cached HTML
const cachedHtml = localStorage.getItem('largeFontHtml');
const hasCachedHtml = !!cachedHtml && cachedHtml.length > 100;
console.log('[EclectechElement] Cached HTML in localStorage?', hasCachedHtml, 'Length:', cachedHtml ? cachedHtml.length : 0);

// Clear any existing session data on page load to ensure font processing happens
// But only if there's no valid cached result
if (!hasCachedHtml) {
    console.log('[EclectechElement] No valid cache found, clearing session storage');
    sessionStorage.removeItem('largeFontUpdated');
} else {
    console.log('[EclectechElement] Valid cache found, keeping session storage');
}

// Check what's in session storage
const alreadyUpdated = sessionStorage.getItem('largeFontUpdated') === 'true';
console.log('[EclectechElement] Session storage has largeFontUpdated?', alreadyUpdated);

class EclectechElement extends HTMLElement {
    constructor() {
        super();
        console.log('[EclectechElement] Constructor initializing');
        this.renderedHTML = undefined;
        this.accessButton = null;
        this._pendingFontAccess = false;
        this._fontAccessInProgress = false; // Add instance level tracking
        this.loadingOverlay = null; // Reference to loading overlay element
        this.initializeAccessButton();
        this.createLoadingOverlay(); // Create loading overlay
    }

    connectedCallback() {
        console.log('[EclectechElement] Connected to DOM');
        window.requestAnimationFrame(() => {
            console.log('[EclectechElement] First render frame');
            this.renderedHTML = document.documentElement.innerHTML;
            
            console.log('[EclectechElement] Checking for enable-large-font attribute:', this.hasAttribute('enable-large-font'));
            if (this.hasAttribute('enable-large-font')) {
                console.log('[EclectechElement] enable-large-font attribute found, calling enableLargeFontAccess()');
                this.enableLargeFontAccess();
            }
        });
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
        const currentDomain = window.location.hostname;
        console.log('[EclectechElement] Current domain:', currentDomain);
        
        // Default to accessibility.{currentDomain} or fall back to eclectech.io
        let defaultConfigUrl;
        if (currentDomain && currentDomain !== 'localhost') {
            // For production sites, use a subdomain approach
            defaultConfigUrl = `https://accessibility.${currentDomain}`;
        } else {
            // Default to eclectech.io for local development
            defaultConfigUrl = 'https://eclectech.io/accessibility-config';
        }
        
        // Get configuration URL from attribute or use the default
        const configUrl = this.getAttribute('config-url') || defaultConfigUrl;
        console.log('[EclectechElement] Opening accessibility config at URL:', configUrl);
        
        // Check if the user wants to open in a new tab
        if (this.hasAttribute('open-in-new-tab')) {
            window.open(configUrl, '_blank');
        } else {
            window.location.href = configUrl;
        }
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

    async enableLargeFontAccess() {
        console.log('[EclectechElement] Starting enableLargeFontAccess()');
        
        // Prevent multiple simultaneous calls
        if (fontAccessInProgress || this._fontAccessInProgress) {
            console.log('[EclectechElement] Font access already in progress, not starting another instance');
            return;
        }
        
        // Set flags to prevent duplicate calls
        fontAccessInProgress = true;
        this._fontAccessInProgress = true;
        
        // Show loading overlay
        this.showLoading();
        
        // Log initial font sizes for reference
        this.logFontSizes('[BEFORE]');
        
        // Check if we've already updated the page in this session (early check)
        const alreadyUpdated = sessionStorage.getItem('largeFontUpdated') === 'true';
        console.log('[EclectechElement] Already updated in this session? (early check)', alreadyUpdated);
        
        if (alreadyUpdated) {
            console.log('[EclectechElement] Skipping font update as it was already applied in this session');
            // Reset flags before exiting
            fontAccessInProgress = false;
            this._fontAccessInProgress = false;
            this.hideLoading(); // Ensure loading overlay is hidden
            return;
        }
        
        // Immediately mark as updated to prevent multiple concurrent calls
        sessionStorage.setItem('largeFontUpdated', 'true');
        
        // Wait for the module to be loaded first, even if we're using cached content
        try {
            await moduleLoadPromise;
            console.log('[EclectechElement] Module is loaded, proceeding with font access');
        } catch (error) {
            console.error('[EclectechElement] Module failed to load, cannot continue:', error);
            // Reset flags before exiting
            fontAccessInProgress = false;
            this._fontAccessInProgress = false;
            this.hideLoading(); // Ensure loading overlay is hidden
            return;
        }
        
        // Explicitly log storage state
        this.logStorageState();
    
        // Check if we already have a cached result
        const cachedHtml = localStorage.getItem('largeFontHtml');
        const hasCachedHtml = !!cachedHtml && cachedHtml.length > 100;
        console.log('[EclectechElement] Cached HTML found?', hasCachedHtml);
        
        try {
            if (hasCachedHtml) {
                console.log('[EclectechElement] Applying cached large font HTML, cache length:', cachedHtml.length);
                try {
                    document.documentElement.innerHTML = cachedHtml;
                    console.log('[EclectechElement] Successfully applied cached HTML');
                    
                    // Re-initialize the button since it was lost when HTML was replaced
                    setTimeout(() => {
                        this.initializeAccessButton();
                        this.createLoadingOverlay(); // Recreate loading overlay
                        this.hideLoading(); // Hide loading overlay
                        // Log font sizes after applying cached HTML
                        this.logFontSizes('[AFTER CACHED]');
                        // Reset flags
                        fontAccessInProgress = false;
                        this._fontAccessInProgress = false;
                    }, 100);
                    return;
                } catch (error) {
                    console.error('[EclectechElement] Error applying cached HTML:', error);
                    // If there's an error with the cached version, clear it and try to get a fresh version
                    localStorage.removeItem('largeFontHtml');
                    // Fall through to fresh version
                }
            } else {
                console.log('[EclectechElement] No valid cached HTML found');
            }
            
            // No cached version or cache error, try to get a fresh version
            await this.applyFreshLargeFont();
        } finally {
            // Ensure flags are reset even if errors occur
            fontAccessInProgress = false;
            this._fontAccessInProgress = false;
            this.hideLoading(); // Ensure loading overlay is hidden
        }
    }
    
    logStorageState() {
        console.log('[EclectechElement] Storage state:');
        console.log('- sessionStorage.largeFontUpdated:', sessionStorage.getItem('largeFontUpdated'));
        
        const cachedHtml = localStorage.getItem('largeFontHtml');
        console.log('- localStorage.largeFontHtml present:', !!cachedHtml);
        console.log('- localStorage.largeFontHtml length:', cachedHtml ? cachedHtml.length : 0);
    }
    
    async applyFreshLargeFont() {
        console.log('[EclectechElement] Attempting to apply fresh large font');
        
        // At this point module should be loaded because of the moduleLoadPromise earlier,
        // but double-check to be safe
        if (!large_font_access) {
            console.error('[EclectechElement] large_font_access function not available yet - this should not happen!');
            this.hideLoading(); // Hide loading overlay on error
            return;
        }
        
        try {
            // Take a snapshot of the current HTML
            const currentHTML = this.renderedHTML;
            console.log('[EclectechElement] Calling large_font_access with HTML length:', currentHTML.length);
            
            // Call the function with the current HTML
            let outputHtml = await large_font_access(currentHTML);
            console.log('[EclectechElement] Received response from large_font_access');
            
            if (!outputHtml) {
                console.error('[EclectechElement] Received empty response from large_font_access');
                this.hideLoading(); // Hide loading overlay on error
                return;
            }
            
            outputHtml = outputHtml
                .replace(/^```html\s*/, '')
                .replace(/```\s*$/, '');
            
            console.log('[EclectechElement] Processed HTML length:', outputHtml.length);
            
            if (outputHtml.length < 100) {
                console.error('[EclectechElement] Received suspiciously short HTML:', outputHtml);
                this.hideLoading(); // Hide loading overlay on error
                return;
            }
            
            console.log('[EclectechElement] Applying new large font HTML');
            document.documentElement.innerHTML = outputHtml;
            console.log('[EclectechElement] Successfully applied new HTML');
            
            // Re-initialize the button since it was lost when HTML was replaced
            setTimeout(() => {
                this.initializeAccessButton();
                this.createLoadingOverlay(); // Recreate loading overlay
                this.hideLoading(); // Hide loading overlay
                
                // Store in localStorage and sessionStorage
                localStorage.setItem('largeFontHtml', outputHtml);
                // Note: sessionStorage flag already set at start of process
                
                // Log font sizes after applying new HTML
                this.logFontSizes('[AFTER NEW]');
            }, 100);
        } catch (error) {
            console.error('[EclectechElement] Error in applyFreshLargeFont:', error);
            this.hideLoading(); // Hide loading overlay on error
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
}

customElements.define('eclec-tech', EclectechElement);