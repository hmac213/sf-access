// Import statement moved outside class to ensure proper module loading
let apply_changes;

const moduleLoadPromise = import('./gemini_calls/gemini.js')
  .then(module => {
    apply_changes = module.default;
  })
  .catch(error => {
    console.error('[EclectechElement] Error loading module:', error);
  });

class EclectechElement extends HTMLElement {
    constructor() {
        super();
        console.log('[EclectechElement] Constructor initializing');
        this.renderedHTML = undefined;
        this.accessButton = null;
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
        await moduleLoadPromise; // Ensure the accessibility module is loaded

        // Collect active accessibility attributes from the element
        const activeAttributes = [];
        if (this.hasAttribute('enable-large-font')) {
            activeAttributes.push('enable-large-font');
        }
        if (this.hasAttribute('enable-high-contrast')) {
            activeAttributes.push('enable-high-contrast');
        }

        // If no accessibility attributes are active, hide loading and exit
        if (activeAttributes.length === 0) {
            this.hideLoading();
            return;
        }

        console.log(activeAttributes);

        // Check if a cached version exists
        let cachedHtml = localStorage.getItem('accessibilityHtml');
        if (cachedHtml && cachedHtml.length > 100) {
            console.log('cached html exists uh oh')
            try {
                document.documentElement.innerHTML = cachedHtml;
                setTimeout(() => {
                    this.initializeAccessButton();
                    this.createLoadingOverlay();
                }, 100);
                this.hideLoading();
                return;
            } catch (error) {
                localStorage.removeItem('accessibilityHtml');
            }
        }

        // Call the gemini function once with all active attributes
        const freshHtml = await apply_changes(this.renderedHTML, activeAttributes);
        if (freshHtml) {
            document.documentElement.innerHTML = freshHtml;
            setTimeout(() => {
                this.initializeAccessButton();
                this.createLoadingOverlay();
                localStorage.setItem('accessibilityHtml', freshHtml);
            }, 100);
        }

        this.hideLoading();
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

        const configUrl = `https://Eqlectech.vercel.app` + 
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
}

customElements.define('eclec-tech', EclectechElement);