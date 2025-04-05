// Import statement moved outside class to ensure proper module loading
let apply_changes;

const moduleLoadPromise = import('./gemini_calls/gemini.js')
  .then(module => {
    apply_changes = module.default;
  })
  .catch(error => {
    console.error('[EclectechElement] Error loading module:', error);
  });

// Setup global event delegation for accessibility button
document.addEventListener('click', function(event) {
  // Check if the click was on the accessibility button or its child elements
  let target = event.target;
  while (target != null) {
    if (target.classList && target.classList.contains('eclectech-access-button')) {
      console.log('[EclectechElement] Accessibility button clicked via delegation');
      // Find the custom element to call its method
      const eclecTechElement = document.querySelector('eclec-tech');
      if (eclecTechElement) {
        eclecTechElement.openAccessibilityConfig();
      }
      break;
    }
    target = target.parentElement;
  }
}, true);

class EclectechElement extends HTMLElement {
    constructor() {
        super();
        console.log('[EclectechElement] Constructor initializing');
        this.renderedHTML = undefined;
        this.accessButton = null;
        this.loadingOverlay = null; // Reference to loading overlay element
        this.isProcessing = false; // Flag to prevent multiple concurrent processing
        this.initializeAccessButton();
        this.createLoadingOverlay(); // Create loading overlay
    }

    connectedCallback() {
        window.requestAnimationFrame(() => {
            // Store original HTML before any modifications
            if (!this.renderedHTML) {
                this.renderedHTML = document.documentElement.innerHTML;
            }
            this.processAccessibilitySettings();
            console.log('[EclectechElement] HERE');
        });
    }

    // Static method to parse URL parameters from current window or provided URL
    static parseQueryParameters(urlString = window.location.href) {
        console.log('[EclectechElement] Parsing query parameters from:', urlString);
        
        try {
            // Create a URL object from the provided or current URL
            const url = new URL(urlString);
            const params = url.searchParams;
            
            // Basic parameters
            const result = {
                site: params.get('site') || '',
                path: params.get('path') || '',
                features: []
            };
            
            
            // Handle array-format config parameter
            const configParam = params.get('config');
            if (configParam) {
                try {
                    // Decode and parse
                    const configData = JSON.parse(decodeURIComponent(configParam));
                    
                    // If it's an array, treat each item as a feature name
                    if (Array.isArray(configData)) {
                        configData.forEach(feature => {
                            if (!result.features.includes(feature)) {
                                result.features.push(feature);
                            }
                        });
                    }
                } catch (error) {
                    console.error('[EclectechElement] Error parsing config parameter:', error);
                }
            }
            
            console.log('[EclectechElement] Parsed parameters:', result);
            return result;
        } catch (error) {
            console.error('[EclectechElement] Error parsing URL parameters:', error);
            return { site: '', path: '', features: [] };
        }
    }
    
    // Usage example: 
    // EclectechElement.parseQueryParameters() - to parse current URL
    // EclectechElement.parseQueryParameters(someUrl) - to parse a specific URL

    // Remove all accessibility-related attributes from the element
    removeAllAccessibilityAttributes() {
        const accessibilityAttributes = [
            'enable-large-font',
            'enable-high-contrast',
            'enable-screen-reader'
        ];
        
        console.log('[EclectechElement] Removing all accessibility attributes');
        
        accessibilityAttributes.forEach(attr => {
            if (this.hasAttribute(attr)) {
                console.log(`[EclectechElement] Removing attribute: ${attr}`);
                this.removeAttribute(attr);
            }
        });
        
        // Clear cached HTML when removing attributes
        console.log('[EclectechElement] Clearing cached HTML from localStorage');
        localStorage.removeItem('accessibilityHtml');
        
        // Clear the initialization flag to force fresh processing
        window.__geminiInitialized = false;
        
        console.log('[EclectechElement] Attributes after removal:', 
            Array.from(this.attributes).map(attr => attr.name).join(', '));
    }
    
    async processAccessibilitySettings() {
        // Prevent concurrent processing
        if (this.isProcessing) {
            console.log('[EclectechElement] Already processing, skipping duplicate call');
            return;
        }
        
        this.isProcessing = true;
        
        try {
            // Check if we should parse URL parameters for configuration
            console.log('[EclectechElement] Initial attributes:', 
                Array.from(this.attributes).map(attr => attr.name).join(', '));
    
            // Only handle URL params on first load to prevent loops
            if (window.location.href.includes('?config') && !window.__configProcessed) {
                console.log('[EclectechElement] Detected configuration page, parsing parameters');
                const params = EclectechElement.parseQueryParameters();
                console.log(params);
                // Use the parsed parameters for configuration
                console.log('[EclectechElement] Configuration parameters:', params);
                let config_params = params['features'];
                
                console.log(config_params);
    
                // Remove all existing attributes and clear cached HTML
                this.removeAllAccessibilityAttributes();
                
                // Only set new attributes if config_params has items
                if (config_params && config_params.length > 0) {
                    console.log('[EclectechElement] Setting new attributes from config parameters:', config_params);
                    config_params.forEach(feature => {
                        this.setAttribute(feature, 'true');
                    });
                } else {
                    console.log('[EclectechElement] No features found in config, all attributes removed');
                }
                
                console.log('[EclectechElement] Final attributes:', Array.from(this.attributes).map(attr => attr.name).join(', '));
                
                // Mark config as processed to prevent loops
                window.__configProcessed = true;
            }
            else {
                console.log('[EclectechElement] No configuration page detected or already processed, using HTML attributes');
            }
            
            // Collect active accessibility attributes from the element
            const activeAttributes = [];
            if (this.hasAttribute('enable-large-font')) {
                activeAttributes.push('enable-large-font');
            }
            if (this.hasAttribute('enable-high-contrast')) {
                activeAttributes.push('enable-high-contrast');
            }
            if (this.hasAttribute('enable-screen-reader')) {
                activeAttributes.push('enable-screen-reader');
            }
    
            // If no accessibility attributes are active, hide loading and exit
            if (activeAttributes.length === 0) {
                console.log('[EclectechElement] No active accessibility attributes found, skipping processing');
                this.hideLoading();
                this.isProcessing = false;
                return;
            }
    
            console.log('[EclectechElement] Active accessibility attributes:', activeAttributes);
            
            // Only check cached version if gemini is already initialized and we have attributes
            if (window.__geminiInitialized && activeAttributes.length > 0) {
                // Check if a cached version exists
                let cachedHtml = localStorage.getItem('accessibilityHtml');
                if (cachedHtml && cachedHtml.length > 100) {
                    try {
                        console.log('[EclectechElement] Using cached HTML for accessibility features');
                        document.documentElement.innerHTML = cachedHtml;
                        setTimeout(() => {
                            this.initializeAccessButton();
                            this.createLoadingOverlay();
                        }, 100);
                        this.hideLoading();
                        this.isProcessing = false;
                        return;
                    } catch (error) {
                        console.error('[EclectechElement] Error applying cached HTML:', error);
                        localStorage.removeItem('accessibilityHtml');
                    }
                }
            }
            
            // If we got here, we need to process from scratch
            this.showLoading();
            await moduleLoadPromise; // Ensure the accessibility module is loaded
    
            console.log('[EclectechElement] Calling apply_changes with attributes:', activeAttributes);
            const freshHtml = await apply_changes(this.renderedHTML, activeAttributes);
            if (freshHtml) {
                document.documentElement.innerHTML = freshHtml;
                window.__geminiInitialized = true;
                setTimeout(() => {
                    this.initializeAccessButton();
                    this.createLoadingOverlay();
                    localStorage.setItem('accessibilityHtml', freshHtml);
                    console.log('[EclectechElement] New HTML cached in localStorage');
                }, 100);
            } else {
                console.error('[EclectechElement] apply_changes returned no HTML');
            }
    
            this.hideLoading();
        } catch (error) {
            console.error('[EclectechElement] Error during processing:', error);
            this.hideLoading();
        } finally {
            // Always reset processing flag
            this.isProcessing = false;
        }
    }

    initializeAccessButton() {
        // Always remove any existing button first to prevent duplicates
        const existingButton = document.querySelector('.eclectech-access-button');
        if (existingButton) {
            existingButton.remove();
        }

        // Create accessibility button container
        this.accessButton = document.createElement('div');
        this.accessButton.className = 'eclectech-access-button';
        this.accessButton.setAttribute('data-eclectech-button', 'true'); // Add data attribute for easier querying
        
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
        
        // We'll rely on event delegation for click handling via the document-level listener
        // Add hover effect using inline styles
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
    
    openAccessibilityConfig() {
        // Get the current domain for the default config URL
        const originSite = window.location.origin;
        const currentPath = window.location.pathname + window.location.search;
        
        const currentConfig = Array.from(this.attributes).reduce((acc, attr) => {
            acc.push(attr.name);
            return acc;
          }, []);
        
        console.log(JSON.stringify(currentConfig));  
        const configParam = encodeURIComponent(JSON.stringify(currentConfig));

        const configUrl = `https://Eqlectech.vercel.app/config` + 
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
        if (document.querySelector('.eclectech-loading-overlay')) return;

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
}

customElements.define('eclec-tech', EclectechElement);