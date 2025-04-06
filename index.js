// Import statement moved outside class to ensure proper module loading
import { initializeGemini, apply_changes } from './gemini_calls/gemini.js';

// Setup global event delegation for accessibility button
document.addEventListener('click', function(event) {
  // Check if the click was on the accessibility button or its child elements
  let target = event.target;
  while (target != null) {
    if (target.classList && target.classList.contains('eclectech-access-button')) {
      console.log('[EclectechElement] Accessibility button clicked via delegation');
      // Find the custom element to call its method
      const eclecTechElement = document.querySelector('eqlec-tech');
      if (eclecTechElement) {
        eclecTechElement.openAccessibilityConfig();
      }
      break;
    }
    target = target.parentElement;
  }
}, true);

class EqlectechElement extends HTMLElement {
    // Add api-key to observed attributes
    static get observedAttributes() {
      return ['api-key', 'enable-large-font', 'enable-high-contrast', 'enable-screen-reader', 'enable-live-subtitles'];
    }

    constructor() {
        super();
        console.log('[EclectechElement] Constructor initializing');
        this.renderedHTML = undefined;
        this.apiKey = null; // Store API key
        this.isGeminiInitialized = false; // Track initialization status
        this.accessButton = null;
        this.loadingOverlay = null; // Reference to loading overlay element
        this.isProcessing = false; // Flag to prevent multiple concurrent processing
        this.initializeAccessButton();
        this.createLoadingOverlay(); // Create loading overlay
    }

    connectedCallback() {
        // Get API Key early
        this.apiKey = this.getAttribute('api-key');
        if (!this.apiKey) {
            console.error('[EclectechElement] Missing required attribute: api-key. Gemini features will be disabled.');
            return; // Stop processing if no key
        }

        // Initialize Gemini
        console.time('[Eclectech] Gemini Initialization'); // Start timer
        try {
            initializeGemini(this.apiKey);
            this.isGeminiInitialized = true;
            console.log('[EclectechElement] Gemini initialized successfully.');
        } catch (error) {
            console.error('[EclectechElement] Failed to initialize Gemini:', error);
            return; // Stop if initialization fails
        } finally {
            console.timeEnd('[Eclectech] Gemini Initialization'); // End timer
        }

        window.requestAnimationFrame(() => {
            // Store original HTML before any modifications
            if (!this.renderedHTML) {
                this.renderedHTML = document.documentElement.innerHTML;
            }
            // Only process if Gemini is initialized
            if (this.isGeminiInitialized) {
                 this.processAccessibilitySettings();
            }
            console.log('[EclectechElement] Connected and processed initial settings.');
        });
    }

    attributeChangedCallback(name, oldValue, newValue) {
      console.log(`[EclectechElement] Attribute changed: ${name}, Old: ${oldValue}, New: ${newValue}`);
      if (oldValue === newValue) return; // No change

      switch (name) {
        case 'api-key':
          // Re-initialize or handle key change if necessary
          // Currently, initialization happens once in connectedCallback
          // If the key changes dynamically, we might need more complex logic
          console.warn('[EclectechElement] api-key changed after initial load. Re-initialization logic not implemented yet.');
          // Potentially: re-initialize Gemini and re-process settings
          this.apiKey = newValue;
          // Consider re-running initialization and processing
          break;
        default:
          // Handle changes to accessibility attributes
          // Re-process settings if an accessibility attribute changes and Gemini is ready
          if (this.isGeminiInitialized) {
              // Debounce or throttle this call if attributes change rapidly
              // For simplicity, just re-process immediately
              this.processAccessibilitySettings();
          } else {
              console.warn('[EclectechElement] Accessibility attribute changed, but Gemini is not initialized (missing/invalid API key?).');
          }
          break;
      }
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
            'enable-screen-reader',
            'enable-live-subtitles'
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
        
        // Clear the initialization flag is no longer needed globally
        // window.__geminiInitialized = false;
        
        console.log('[EclectechElement] Attributes after removal:', 
            Array.from(this.attributes).map(attr => attr.name).join(', '));
    }
    
    async processAccessibilitySettings() {
        // Ensure Gemini is initialized before proceeding
        if (!this.isGeminiInitialized) {
            console.warn('[EclectechElement] Attempted to process settings, but Gemini is not initialized.');
            return;
        }
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
                const params = this.constructor.parseQueryParameters();
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
            const activeAttributes = this.getActiveAccessibilityAttributes();
    
            // If no accessibility attributes are active, hide loading and exit
            // BUT: If we previously applied changes and now have none, restore original HTML
            const currentHtmlIsModified = localStorage.getItem('accessibilityHtml') !== null;

            if (activeAttributes.length === 0) {
                console.log('[EclectechElement] No active accessibility attributes.');
                // If HTML was previously modified, restore the original
                if (currentHtmlIsModified && this.renderedHTML) {
                    console.log('[EclectechElement] Restoring original HTML.');
                    document.documentElement.innerHTML = this.renderedHTML;
                    localStorage.removeItem('accessibilityHtml');
                    // Re-initialize button/overlay after restoring
                    setTimeout(() => {
                      this.initializeAccessButton();
                      this.createLoadingOverlay();
                    }, 100);
                }
                this.hideLoading();
                this.isProcessing = false;
                return;
            }
    
            console.log('[EclectechElement] Active accessibility attributes:', activeAttributes);
            
            // Check cache based on current active attributes
            const cacheKey = `accessibilityHtml-${activeAttributes.sort().join('-')}`;
            let cachedHtml = localStorage.getItem(cacheKey);
            if (cachedHtml && cachedHtml.length > 100) {
                console.log(`[EclectechElement] Using cached HTML for configuration: ${cacheKey}`);
                document.documentElement.innerHTML = cachedHtml;
                setTimeout(() => {
                    this.initializeAccessButton();
                    this.createLoadingOverlay();
                }, 100);
                this.hideLoading();
                this.isProcessing = false;
                return;
            }
            // Removed check for window.__geminiInitialized here
            // if (window.__geminiInitialized && activeAttributes.length > 0) { ...

            // If we got here, we need to process from scratch
            console.log('[EclectechElement] No suitable cache found, processing from scratch.');
            this.showLoading();
            // Remove await moduleLoadPromise
            // await moduleLoadPromise; // Ensure the accessibility module is loaded
            
            console.log('[EclectechElement] Calling apply_changes with attributes:', activeAttributes);

            // Use the originally stored HTML as the base for modifications
            const baseHtml = this.renderedHTML || document.documentElement.innerHTML;
            
            const freshHtml = await apply_changes(baseHtml, activeAttributes);
            if (freshHtml) {
                console.time('[Eclectech] DOM Update'); // Start timer
                document.documentElement.innerHTML = freshHtml;
                console.timeEnd('[Eclectech] DOM Update'); // End timer
                setTimeout(() => {
                    this.initializeAccessButton();
                    this.createLoadingOverlay();
                    localStorage.setItem(cacheKey, freshHtml); // Use attribute-specific key
                    console.log(`[EclectechElement] New HTML cached in localStorage with key: ${cacheKey}`);
                }, 100);
            } else {
                console.error('[EclectechElement] apply_changes returned no HTML');
            }
    
            this.hideLoading();

            if (activeAttributes.includes('enable-live-subtitles')) {
                console.log("[EclectechElement] Adding live subtitles");
                try {
                    // Check for video element
                    const video = document.querySelector('video');
                    
                    // Create or get the subtitles container
                    let subtitlesDiv = document.getElementById('eclectech-subtitles');
                    if (!subtitlesDiv) {
                        console.log('[EclectechElement] Creating new subtitles container');
                        subtitlesDiv = document.createElement('div');
                        subtitlesDiv.id = 'eclectech-subtitles';
                        subtitlesDiv.className = 'eclectech-subtitles-container';
                        
                        // Style the subtitles container
                        subtitlesDiv.style.cssText = `
                            position: fixed;
                            bottom: 70px;
                            left: 0;
                            width: 100%;
                            padding: 16px;
                            background-color: rgba(0, 0, 0, 0.7);
                            color: white;
                            font-size: 20px;
                            text-align: center;
                            z-index: 9998;
                            transition: opacity 0.3s;
                            font-family: system-ui, -apple-system, sans-serif;
                        `;
                        
                        // Add an initial message
                        subtitlesDiv.innerHTML = '<p>Live subtitles will appear here when speaking is detected.</p>';
                        
                        // Add to the body
                        document.body.appendChild(subtitlesDiv);
                        console.log('[EclectechElement] Subtitles container added to DOM');
                    } else {
                        console.log('[EclectechElement] Using existing subtitles container');
                    }
                    
                    // If there's a video element, we could set up video caption tracking
                    if (video) {
                        console.log('[EclectechElement] Video element found, setting up captions');
                        // Here you would set up any video-specific caption handling
                    } 
                } catch (error) {
                    console.error('[EclectechElement] Error adding live subtitles:', error);
                }
            }
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

    // Initialize speech recognition for live subtitles
    initializeSpeechRecognition(subtitlesDiv) {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('[EclectechElement] Speech recognition not supported in this browser');
            subtitlesDiv.innerHTML = '<p>Speech recognition is not supported in this browser.</p>';
            return;
        }
        
        try {
            // Create speech recognition instance
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            // Configure speech recognition
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US'; // Default to English
            
            // Store for later cleanup
            this.speechRecognition = recognition;
            
            // Create paragraph for results
            let p = document.createElement('p');
            subtitlesDiv.innerHTML = '';
            subtitlesDiv.appendChild(p);
            
            // Listen for results
            recognition.addEventListener('result', (e) => {
                const results = Array.from(e.results);
                const transcript = results
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('');
                
                // Update the subtitles div with the transcript
                p.textContent = transcript;
                
                // If it's a final result, start a new paragraph
                if (results.some(result => result.isFinal)) {
                    p = document.createElement('p');
                    subtitlesDiv.appendChild(p);
                    
                    // Keep only the last 3 paragraphs to avoid clutter
                    const paragraphs = subtitlesDiv.querySelectorAll('p');
                    if (paragraphs.length > 3) {
                        subtitlesDiv.removeChild(paragraphs[0]);
                    }
                }
            });
            
            // Handle errors
            recognition.addEventListener('error', (e) => {
                console.error('[EclectechElement] Speech recognition error:', e);
                p.textContent = 'Speech recognition error occurred.';
            });
            
            // Restart when it ends
            recognition.addEventListener('end', () => {
                if (this.hasAttribute('enable-live-subtitles')) {
                    recognition.start();
                }
            });
            
            // Start recognition
            recognition.start();
            console.log('[EclectechElement] Speech recognition started');
            
        } catch (error) {
            console.error('[EclectechElement] Error initializing speech recognition:', error);
            subtitlesDiv.innerHTML = '<p>Error initializing speech recognition.</p>';
        }
    }
    
    // Cleanup method to stop speech recognition when disabled
    cleanupSpeechRecognition() {
        if (this.speechRecognition) {
            try {
                this.speechRecognition.stop();
                console.log('[EclectechElement] Speech recognition stopped');
            } catch (error) {
                console.error('[EclectechElement] Error stopping speech recognition:', error);
            }
            this.speechRecognition = null;
        }
        
        // Remove subtitles div if it exists
        const subtitlesDiv = document.getElementById('eclectech-subtitles');
        if (subtitlesDiv) {
            subtitlesDiv.remove();
            console.log('[EclectechElement] Subtitles container removed');
        }
    }

    // Helper to get active attributes
    getActiveAccessibilityAttributes() {
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
        if (this.hasAttribute('enable-live-subtitles')) {
            activeAttributes.push('enable-live-subtitles');
        }
        if (this.hasAttribute('enable-sparse-text')) {
            activeAttributes.push('enable-sparse-text');
        }
        return activeAttributes;
    }
}

customElements.define('eqlec-tech', EqlectechElement);