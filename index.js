

// Import statement moved outside class to ensure proper module loading
let apply_changes;
let subtitlesHandler;


const moduleLoadPromise = import('./gemini_calls/gemini.js')
  .then(module => {
    apply_changes = module.default;
  })
  .catch(error => {
    console.error('[EclectechElement] Error loading module:', error);
  });

const subtitlesModulePromise = import('./subtitles.js')
  .then(module => {
    subtitlesHandler = module.default;
  })
  .catch(error => {
    console.error('[EclectechElement] Error loading subtitles module:', error);
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
            'enable-screen-reader',
            'enable-live-subtitles'
        ];
        
        console.log('[EclectechElement] Removing all accessibility attributes');
        
        // If subtitles are enabled, clean them up first
        if (this.hasAttribute('enable-live-subtitles')) {
            if (this.subtitlesCleanup) {
                this.subtitlesCleanup();
                this.subtitlesCleanup = null;
            } else if (subtitlesHandler) {
                subtitlesHandler.cleanup();
            }
        }
        
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
            if (this.hasAttribute('enable-live-subtitles')) {
                activeAttributes.push('enable-live-subtitles');
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

            // Check if live subtitles are enabled
            if (activeAttributes.includes('enable-live-subtitles')) {
                console.log('[EclectechElement] Setting up live subtitles');
                this.setupSubtitles();
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

    // Methods for video subtitle transcription
    async setupSubtitles() {
        // Find the first video element on the page
        const video = document.querySelector('video');
        if (!video) {
            console.warn('[EclectechElement] No video element found for subtitle generation.');
            return;
        }
        
        // Create or recreate the subtitles container
        let subtitlesDiv = document.getElementById('eclectech-subtitles');
        if (subtitlesDiv) {
            subtitlesDiv.remove(); // Remove if it already exists
        }
        
        // Create new subtitles container
        subtitlesDiv = document.createElement('div');
        subtitlesDiv.id = 'eclectech-subtitles';
        subtitlesDiv.className = 'eclectech-subtitles-container';
        
        // Use the same styling as before
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
        
        // Add to the DOM
        document.body.appendChild(subtitlesDiv);
        console.log('[EclectechElement] Subtitles container created');
        
        // Initial state - hide until we have content
        subtitlesDiv.style.opacity = '0';
        subtitlesDiv.style.visibility = 'hidden';
        subtitlesDiv.innerHTML = '<p>Initializing video subtitles...</p>';
        
        // Add controls to video if not present
        if (!video.controls) {
            video.controls = true;
        }
        
        try {
            // First check if the AudioContext is available
            if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
                throw new Error('AudioContext not supported in this browser');
            }
            
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContextClass({sampleRate: 16000}); // 16kHz is better for speech recognition
            
            console.log('[EclectechElement] AudioContext created with sample rate:', audioContext.sampleRate);
            
            // Check if the video has an audio track
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                console.warn('[EclectechElement] Video element may not be properly loaded');
            }
            
            // Create media element source for the video
            const source = audioContext.createMediaElementSource(video);
            console.log('[EclectechElement] Media element source created');
            
            // Connect to both the audio context destination (for playback) and a media stream for recording
            const dest = audioContext.createMediaStreamDestination();
            
            // Connect source to destination for audio playback
            source.connect(audioContext.destination);
            console.log('[EclectechElement] Connected to audio context destination');
            
            // Connect source to media stream destination for recording
            source.connect(dest);
            console.log('[EclectechElement] Connected to media stream destination');
            
            // Get the media stream from the destination
            const mediaStream = dest.stream;
            
            // Check if the media stream has audio tracks
            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error('No audio tracks available in the media stream');
            }
            console.log('[EclectechElement] Media stream has', audioTracks.length, 'audio tracks');
            console.log('[EclectechElement] Audio track settings:', audioTracks[0].getSettings());
            
            // Setup MediaRecorder for audio capture
            const mimeTypes = [
                'audio/webm;codecs=opus', // Preferred format for Chrome
                'audio/wav',              // Preferred format for Azure
                'audio/mp4',             // Another common format
                'audio/webm'             // Fallback
            ];
            
            // Find the first supported MIME type
            let mimeType = null;
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    console.log(`[EclectechElement] Using supported MIME type: ${mimeType}`);
                    break;
                }
            }
            
            if (!mimeType) {
                console.warn('[EclectechElement] None of the preferred MIME types are supported, using default');
            }
            
            // Setup recorder with optimal settings for speech recognition
            const recorder = new MediaRecorder(mediaStream, {
                mimeType: mimeType,
                audioBitsPerSecond: 16000 // 16kHz is optimal for speech recognition
            });
            
            console.log('[EclectechElement] MediaRecorder created with mime type:', recorder.mimeType);
            
            let chunks = [];
            let isRecording = false;
            
            // Handle recording data
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                    console.log('[EclectechElement] Recorded chunk of size:', e.data.size, 'bytes');
                } else {
                    console.warn('[EclectechElement] Received empty data chunk');
                }
            };
            
            // Process recording when stopped
            recorder.onstop = async () => {
                console.log('[EclectechElement] Recorder stopped, processing chunks');
                
                if (chunks.length === 0) {
                    console.warn('[EclectechElement] No audio chunks recorded');
                    
                    // Show a message in the subtitles container
                    subtitlesDiv.innerHTML = '<p>No audio detected</p>';
                    subtitlesDiv.style.opacity = '1';
                    subtitlesDiv.style.visibility = 'visible';
                    
                    // Continue recording if video is still playing
                    if (!video.paused && !video.ended) {
                        startRecording();
                    }
                    return;
                }
                
                const audioBlob = new Blob(chunks, {type: recorder.mimeType});
                console.log('[EclectechElement] Created audio blob of size:', audioBlob.size, 'bytes');
                chunks = [];
                
                // For debugging: Play the recorded audio to verify it's working
                // Uncomment this to test the audio capture in browser
                
                // const audioURL = URL.createObjectURL(audioBlob);
                // const audioElement = document.createElement('audio');
                // console.log('[EclectechElement] Created audio element');
                // audioElement.src = audioURL;
                // audioElement.controls = true;
                // document.body.appendChild(audioElement);
                // audioElement.play();
                
                
                // Make sure we have actual audio content
                if (audioBlob.size < 1000) {
                    console.warn('[EclectechElement] Audio blob is too small, may not contain speech');
                    subtitlesDiv.innerHTML = '<p>Audio level too low</p>';
                } else {
                    // Get transcription
                    subtitlesDiv.innerHTML = '<p>Processing audio...</p>';
                    const transcript = await this.getTranscription(audioBlob);
                    
                    // Display transcription with timestamp
                    const timestamp = this.formatTime(video.currentTime);
                    subtitlesDiv.innerHTML = `<p>${timestamp}: ${transcript}</p>`;
                    console.log('[EclectechElement] Updated subtitles:', transcript);
                }
                
                // Show subtitles
                subtitlesDiv.style.opacity = '1';
                subtitlesDiv.style.visibility = 'visible';
                
                // Continue recording if video is still playing
                if (!video.paused && !video.ended) {
                    startRecording();
                }
            };
            
            // Function to start recording
            const startRecording = () => {
                if (isRecording) return;
                
                try {
                    // Ensure AudioContext is running
                    if (audioContext.state === 'suspended') {
                        audioContext.resume().then(() => {
                            console.log('[EclectechElement] AudioContext resumed');
                        });
                    }
                    
                    recorder.start();
                    isRecording = true;
                    console.log('[EclectechElement] Recording started');
                    
                    // Process in chunks for more responsive captions
                    setTimeout(() => {
                        if (isRecording) {
                            console.log('[EclectechElement] Stopping recording for processing');
                            recorder.stop();
                            isRecording = false;
                        }
                    }, 3000); // Process every 3 seconds for more frequent updates
                } catch (error) {
                    console.error('[EclectechElement] Error starting recording:', error);
                    subtitlesDiv.innerHTML = `<p>Error: ${error.message}</p>`;
                    subtitlesDiv.style.opacity = '1';
                    subtitlesDiv.style.visibility = 'visible';
                }
            };
            
            // Handle video events
            const onPlay = () => {
                console.log('[EclectechElement] Video started playing');
                
                // Ensure AudioContext is running
                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        console.log('[EclectechElement] AudioContext resumed on play');
                    });
                }
                
                // Show container
                subtitlesDiv.style.opacity = '1';
                subtitlesDiv.style.visibility = 'visible';
                
                // Start recording
                if (!isRecording) {
                    startRecording();
                }
            };
            
            const onPause = () => {
                console.log('[EclectechElement] Video paused');
                
                // Stop any active recording
                if (isRecording) {
                    recorder.stop();
                    isRecording = false;
                }
                
                // Hide container when paused
                subtitlesDiv.style.opacity = '0';
                subtitlesDiv.style.visibility = 'hidden';
            };
            
            // Add event listeners
            video.addEventListener('play', onPlay);
            video.addEventListener('pause', onPause);
            video.addEventListener('ended', onPause);
            
            // Store cleanup function
            this.subtitlesCleanup = () => {
                console.log('[EclectechElement] Cleaning up subtitles');
                
                // Remove event listeners
                video.removeEventListener('play', onPlay);
                video.removeEventListener('pause', onPause);
                video.removeEventListener('ended', onPause);
                
                // Stop recording if active
                if (isRecording) {
                    try {
                        recorder.stop();
                    } catch (e) {
                        // Ignore errors during cleanup
                    }
                    isRecording = false;
                }
                
                // Close audio context
                try {
                    audioContext.close();
                } catch (e) {
                    // Ignore errors during cleanup
                }
                
                // Remove subtitles container
                if (subtitlesDiv && subtitlesDiv.parentNode) {
                    subtitlesDiv.remove();
                }
            };
            
            // Start if video is already playing
            if (!video.paused && !video.ended) {
                onPlay();
            }
            
            console.log('[EclectechElement] Video subtitles setup complete');
        } catch (error) {
            console.error('[EclectechElement] Error setting up video subtitles:', error);
            subtitlesDiv.innerHTML = `<p>Error: ${error.message}</p>`;
            subtitlesDiv.style.opacity = '1';
            subtitlesDiv.style.visibility = 'visible';
        }
    }

    // Helper to format time as MM:SS
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    async getTranscription(audioBlob) {
        console.log('[EclectechElement] Audio blob ready for Azure transcription:', audioBlob.size, 'bytes');

        try {
            // Check if the audio blob is valid
            if (!audioBlob || audioBlob.size < 100) {
                console.warn('[EclectechElement] Audio blob is too small or invalid:', audioBlob.size, 'bytes');
                return "No speech detected (audio too small)";
            }

            // Log audio blob type for debugging
            console.log('[EclectechElement] Audio blob type:', audioBlob.type);
            
        } catch (error) {
            console.error('[EclectechElement] Error getting transcription:', error);
            return "Error getting transcription";
        }
    }
    
    // Helper method for demo transcription when Azure is not configured
    getDemoTranscription() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const demoTexts = [
                    "This is a demo transcript. Configure Azure for real transcription.",
                    "Azure Speech-to-Text not configured. This is placeholder text.",
                    "Set your Azure credentials to enable real-time transcription.",
                    "This placeholder shows where real transcripts will appear."
                ];
                const randomIndex = Math.floor(Math.random() * demoTexts.length);
                resolve(demoTexts[randomIndex]);
            }, 1000);
        });
    }
}

customElements.define('eclec-tech', EclectechElement);