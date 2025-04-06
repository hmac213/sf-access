/**
 * Subtitles Handler Module
 * Handles live subtitles from video elements on the page
 */

// Store module state
const state = {
    audioContext: null,
    audioSource: null, 
    analyser: null,
    subtitlesDiv: null,
    contextElement: null, // Reference to the EclectechElement
    animationFrameId: null, // For tracking requestAnimationFrame
    trackListeners: [], // Track event listeners for cleanup
    recognition: null, // Speech recognition instance
    recognitionActive: false, // Track if recognition is active
    lastTranscript: '', // Store last transcript for display
    transcriptHistory: [] // Store recent transcripts
};

/**
 * Set up subtitles for video elements on the page
 * @param {EclectechElement} contextElement - The custom element instance
 */
function setup(contextElement) {
    try {
        console.log('[SubtitlesHandler] Setting up video subtitles');
        state.contextElement = contextElement;
        
        // Create or get the subtitles container
        let subtitlesDiv = document.getElementById('eclectech-subtitles');
        if (!subtitlesDiv) {
            console.log('[SubtitlesHandler] Creating new subtitles container');
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
            
            // Add to the body
            document.body.appendChild(subtitlesDiv);
            console.log('[SubtitlesHandler] Subtitles container added to DOM');
        } else {
            console.log('[SubtitlesHandler] Using existing subtitles container');
        }
        
        state.subtitlesDiv = subtitlesDiv;
        
        // Find all video elements on the page
        const videoElements = [...document.querySelectorAll('video')];
        
        if (videoElements.length > 0) {
            console.log(`[SubtitlesHandler] Found ${videoElements.length} video elements`);
            subtitlesDiv.innerHTML = '<p>Setting up live subtitles for video...</p>';
            
            // Use the first video element for simplicity, could be extended to handle multiple
            const videoElement = videoElements[0];
            
            // First check if the video has built-in captions/tracks
            if (videoElement.textTracks && videoElement.textTracks.length > 0) {
                processVideoTracks(videoElement, subtitlesDiv);
            } else {
                // Initialize real-time speech recognition
                initializeSpeechRecognition(videoElement, subtitlesDiv);
            }
        } else {
            console.log('[SubtitlesHandler] No video elements found on page');
            subtitlesDiv.innerHTML = '<p>No video elements found on this page.</p>';
        }
    } catch (error) {
        console.error('[SubtitlesHandler] Error setting up video subtitles:', error);
    }
}

/**
 * Initialize real-time speech recognition
 * @param {HTMLVideoElement} videoElement - The video element
 * @param {HTMLElement} subtitlesDiv - The subtitles container element 
 */
function initializeSpeechRecognition(videoElement, subtitlesDiv) {
    try {
        // Check if the browser supports speech recognition
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('[SubtitlesHandler] Speech recognition not supported in this browser');
            subtitlesDiv.innerHTML = '<p>Speech recognition is not supported in this browser.</p>';
            return;
        }
        
        console.log('[SubtitlesHandler] Initializing speech recognition');
        subtitlesDiv.innerHTML = '<p>Initializing speech recognition...</p>';
        
        // Add controls to video if not present
        if (!videoElement.controls) {
            videoElement.controls = true;
        }
        
        // Create speech recognition instance
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Configure recognition
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Store in state
        state.recognition = recognition;
        
        // Keep the subtitlesDiv simple with a single paragraph for transcripts
        subtitlesDiv.innerHTML = '<p>Waiting for speech...</p>';
        
        // Event listeners for recognition
        recognition.onstart = () => {
            console.log('[SubtitlesHandler] Speech recognition started');
            state.recognitionActive = true;
            subtitlesDiv.innerHTML = '<p>Listening...</p>';
        };
        
        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Keep track of the last processed transcript
            const transcript = interimTranscript || finalTranscript;
            if (transcript) {
                // Show the transcript with timestamp if it's from a video
                const timestamp = videoElement && !videoElement.paused ? 
                    `[${formatVideoTime(videoElement.currentTime)}] ` : '';
                
                subtitlesDiv.innerHTML = `<p>${timestamp}${transcript}</p>`;
                state.lastTranscript = transcript;
            }
        };
        
        recognition.onerror = (event) => {
            console.error('[SubtitlesHandler] Recognition error:', event.error);
            
            // Only update UI if no transcript is showing
            if (!state.lastTranscript) {
                subtitlesDiv.innerHTML = `<p>Error: ${event.error}</p>`;
            }
            
            // Try to restart on non-fatal errors
            if (event.error !== 'aborted' && event.error !== 'not-allowed') {
                restartRecognition();
            }
        };
        
        recognition.onend = () => {
            console.log('[SubtitlesHandler] Speech recognition ended');
            state.recognitionActive = false;
            
            // Restart if feature is still enabled
            if (state.contextElement && state.contextElement.hasAttribute('enable-live-subtitles')) {
                console.log('[SubtitlesHandler] Restarting speech recognition');
                restartRecognition();
            }
        };
        
        // Function to restart recognition
        const restartRecognition = () => {
            if (!state.recognitionActive && state.recognition) {
                setTimeout(() => {
                    try {
                        state.recognition.start();
                    } catch (e) {
                        console.error('[SubtitlesHandler] Error restarting recognition:', e);
                    }
                }, 1000);
            }
        };
        
        // Add video event listeners
        const playListener = () => {
            console.log('[SubtitlesHandler] Video playback started');
            startRecognitionIfNeeded();
        };
        
        const pauseListener = () => {
            console.log('[SubtitlesHandler] Video playback paused');
            // We don't stop recognition when video pauses to keep capturing ambient audio
        };
        
        const volumeChangeListener = () => {
            console.log('[SubtitlesHandler] Video volume changed');
            // Only update UI if no transcript is showing
            if (!state.lastTranscript && videoElement.muted) {
                subtitlesDiv.innerHTML = '<p>Video is muted. Speech recognition continues for ambient audio.</p>';
            }
        };
        
        // Add event listeners to video
        videoElement.addEventListener('play', playListener);
        videoElement.addEventListener('pause', pauseListener);
        videoElement.addEventListener('volumechange', volumeChangeListener);
        
        // Track listeners for cleanup
        state.trackListeners.push(
            { track: videoElement, listener: playListener, type: 'play' },
            { track: videoElement, listener: pauseListener, type: 'pause' },
            { track: videoElement, listener: volumeChangeListener, type: 'volumechange' }
        );
        
        // Start recognition
        const startRecognitionIfNeeded = () => {
            if (!state.recognitionActive && state.recognition) {
                try {
                    state.recognition.start();
                } catch (e) {
                    console.error('[SubtitlesHandler] Error starting recognition:', e);
                    
                    // If already started, just update state
                    if (e.name === 'InvalidStateError') {
                        state.recognitionActive = true;
                    }
                }
            }
        };
        
        // Start recognition immediately
        startRecognitionIfNeeded();
        
        console.log('[SubtitlesHandler] Speech recognition initialized');
    } catch (error) {
        console.error('[SubtitlesHandler] Error initializing speech recognition:', error);
        subtitlesDiv.innerHTML = '<p>Error initializing speech recognition.</p>';
    }
}

/**
 * Add transcript to history
 * @param {string} text - The transcript text
 * @param {HTMLElement} container - The history container
 */
function addToTranscriptHistory(text, container) {
    if (!text || !container) return;
    
    // Create element
    const line = document.createElement('p');
    line.textContent = text;
    line.style.margin = '4px 0';
    
    // Add to DOM
    container.insertBefore(line, container.firstChild);
    
    // Add to state (limit to last 10)
    state.transcriptHistory.unshift(text);
    if (state.transcriptHistory.length > 10) {
        state.transcriptHistory.pop();
    }
    
    // Limit DOM elements to 10
    while (container.children.length > 10) {
        container.removeChild(container.lastChild);
    }
}

/**
 * Process text tracks from a video element
 * @param {HTMLVideoElement} videoElement - The video element
 * @param {HTMLElement} subtitlesDiv - The subtitles container element
 */
function processVideoTracks(videoElement, subtitlesDiv) {
    try {
        console.log('[SubtitlesHandler] Processing video text tracks');
        const tracks = videoElement.textTracks;
        
        // Find the first captions or subtitles track
        let captionTrack = null;
        for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].kind === 'captions' || tracks[i].kind === 'subtitles') {
                captionTrack = tracks[i];
                break;
            }
        }
        
        if (captionTrack) {
            console.log('[SubtitlesHandler] Using video caption track:', captionTrack.label);
            subtitlesDiv.innerHTML = '<p>Using built-in video captions</p>';
            
            // Enable the track
            captionTrack.mode = 'showing';
            
            // Listen for cue changes
            const cueChangeListener = () => {
                const cues = captionTrack.activeCues;
                if (cues && cues.length > 0) {
                    const text = Array.from(cues).map(cue => cue.text).join(' ');
                    subtitlesDiv.innerHTML = `<p>${text}</p>`;
                } else {
                    subtitlesDiv.innerHTML = '<p></p>';
                }
            };
            
            captionTrack.addEventListener('cuechange', cueChangeListener);
            
            // Store for cleanup
            state.trackListeners.push({
                track: captionTrack,
                listener: cueChangeListener,
                type: 'cuechange'
            });
        } else {
            console.log('[SubtitlesHandler] No suitable caption tracks found in video');
            subtitlesDiv.innerHTML = '<p>No suitable caption tracks found in video.</p>';
            
            // Fall back to speech recognition
            initializeSpeechRecognition(videoElement, subtitlesDiv);
        }
    } catch (error) {
        console.error('[SubtitlesHandler] Error processing video text tracks:', error);
        subtitlesDiv.innerHTML = '<p>Error processing video captions.</p>';
    }
}

/**
 * Format video time in MM:SS format
 * @param {number} timeInSeconds - Current video time in seconds
 * @returns {string} Formatted time string
 */
function formatVideoTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Clean up all resources used by the subtitles module
 */
function cleanup() {
    console.log('[SubtitlesHandler] Cleaning up resources');
    
    // Stop speech recognition if active
    if (state.recognition) {
        try {
            state.recognition.stop();
            console.log('[SubtitlesHandler] Speech recognition stopped');
        } catch (error) {
            console.error('[SubtitlesHandler] Error stopping speech recognition:', error);
        }
        state.recognition = null;
        state.recognitionActive = false;
    }
    
    // Cancel any animation frames
    if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
    }
    
    // Remove text track and video listeners
    state.trackListeners.forEach(item => {
        try {
            item.track.removeEventListener(item.type, item.listener);
        } catch (error) {
            console.error('[SubtitlesHandler] Error removing event listener:', error);
        }
    });
    state.trackListeners = [];
    
    // Remove subtitles div if it exists
    if (state.subtitlesDiv) {
        state.subtitlesDiv.remove();
        state.subtitlesDiv = null;
        console.log('[SubtitlesHandler] Subtitles container removed');
    }
    
    // Clear context element reference
    state.contextElement = null;
    state.transcriptHistory = [];
    state.lastTranscript = '';
}

// Export methods
export default {
    setup,
    cleanup
}; 