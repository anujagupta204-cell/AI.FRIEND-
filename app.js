/**
 * Voice AI Friend - Frontend Application (Starry Night Edition)
 * Real-time voice conversation with interactive glowing ball
 */

class VoiceAIFriend {
    constructor() {
        // WebSocket connection
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        // Voice settings
        this.voiceGender = 'female';
        this.isListening = false;
        this.isSpeaking = false;

        // Web Speech API
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.voices = [];

        // Audio visualization
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;

        // DOM elements
        this.elements = {
            aiBall: document.getElementById('aiBall'),
            ballStatus: document.getElementById('ballStatus'),
            textInput: document.getElementById('textInput'),
            sendButton: document.getElementById('sendButton'),
            conversation: document.getElementById('conversation'),
            statusText: document.getElementById('statusText'),
            visualizer: document.getElementById('visualizer'),
            visualizerContainer: document.getElementById('visualizerContainer'),
            latencyValue: document.getElementById('latencyValue'),
            sourceValue: document.getElementById('sourceValue'),
            connectionStatus: document.getElementById('connectionStatus'),
            voiceButtons: document.querySelectorAll('.voice-btn'),
        };

        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 Initializing Voice AI Friend...');

        // Load voices for TTS
        this.loadVoices();

        // Initialize Web Speech Recognition
        this.initSpeechRecognition();

        // Initialize audio visualization
        this.initAudioVisualization();

        // Connect to WebSocket server
        this.connectWebSocket();

        // Set up event listeners
        this.setupEventListeners();

        // Set default voice
        this.setVoice('female');
    }

    /**
     * Load available TTS voices
     */
    loadVoices() {
        this.voices = this.synthesis.getVoices();

        if (this.voices.length === 0) {
            // Voices not loaded yet, wait for them
            this.synthesis.addEventListener('voiceschanged', () => {
                this.voices = this.synthesis.getVoices();
                console.log(`🎤 Loaded ${this.voices.length} voices`);
            });
        } else {
            console.log(`🎤 Loaded ${this.voices.length} voices`);
        }
    }

    /**
     * Initialize Web Speech Recognition
     */
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('❌ Speech Recognition not supported');
            this.elements.ballStatus.textContent = 'Speech recognition not supported';
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            console.log('🎤 Listening...');
            this.isListening = true;
            this.elements.aiBall.classList.add('listening');
            this.elements.ballStatus.textContent = 'Listening...';
            this.elements.visualizerContainer.classList.add('active');
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('📝 Transcript:', transcript);
            this.handleUserInput(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('❌ Recognition error:', event.error);
            this.isListening = false;
            this.elements.aiBall.classList.remove('listening');
            this.elements.visualizerContainer.classList.remove('active');

            if (event.error === 'no-speech') {
                this.elements.ballStatus.textContent = 'No speech detected. Try again.';
            } else {
                this.elements.ballStatus.textContent = 'Error: ' + event.error;
            }

            setTimeout(() => {
                this.elements.ballStatus.textContent = 'Click me to talk!';
            }, 3000);
        };

        this.recognition.onend = () => {
            console.log('🎤 Stopped listening');
            this.isListening = false;
            this.elements.aiBall.classList.remove('listening');
            this.elements.visualizerContainer.classList.remove('active');

            if (!this.isSpeaking) {
                this.elements.ballStatus.textContent = 'Click me to talk!';
            }
        };
    }

    /**
     * Initialize audio visualization
     */
    initAudioVisualization() {
        const canvas = this.elements.visualizer;
        const ctx = canvas.getContext('2d');

        // Simple waveform visualization
        const draw = () => {
            this.animationId = requestAnimationFrame(draw);

            const width = canvas.width;
            const height = canvas.height;

            ctx.fillStyle = 'rgba(10, 10, 21, 0.3)';
            ctx.fillRect(0, 0, width, height);

            if (this.isListening || this.isSpeaking) {
                // Animated waveform
                const time = Date.now() / 1000;
                const barCount = 50;
                const barWidth = width / barCount;

                for (let i = 0; i < barCount; i++) {
                    const x = i * barWidth;
                    const amplitude = Math.sin(time * 2 + i * 0.5) * 0.5 + 0.5;
                    const barHeight = amplitude * height * 0.6;
                    const y = (height - barHeight) / 2;

                    const gradient = ctx.createLinearGradient(0, 0, 0, height);
                    gradient.addColorStop(0, '#ff6ec7');
                    gradient.addColorStop(1, '#4ecaff');

                    ctx.fillStyle = gradient;
                    ctx.fillRect(x, y, barWidth - 2, barHeight);
                }
            } else {
                // Idle state - flat line
                ctx.strokeStyle = 'rgba(255, 110, 199, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
                ctx.stroke();
            }
        };

        draw();
    }

    /**
     * Connect to WebSocket server
     */
    connectWebSocket() {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        // IMPORTANT: Replace 'your-backend-name.onrender.com' with your actual Render URL after deployment
        const productionWsUrl = 'wss://your-backend-name.onrender.com';
        
        let wsUrl;
        if (isLocalhost) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            wsUrl = `${protocol}//${window.location.host}`;
        } else {
            wsUrl = productionWsUrl;
        }

        console.log('🔌 Connecting to WebSocket:', wsUrl);
        this.updateConnectionStatus('Connecting...');

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('✅ WebSocket connected');
            this.updateConnectionStatus('Connected');
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            } catch (error) {
                console.error('❌ Error parsing message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            this.updateConnectionStatus('Error');
        };

        this.ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            this.updateConnectionStatus('Disconnected');
            this.attemptReconnect();
        };
    }

    /**
     * Attempt to reconnect to WebSocket
     */
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => this.connectWebSocket(), delay);
        } else {
            console.error('❌ Max reconnect attempts reached');
            this.elements.ballStatus.textContent = 'Connection lost. Refresh page.';
        }
    }

    /**
     * Handle messages from server
     */
    handleServerMessage(data) {
        console.log('📨 Server message:', data.type);

        switch (data.type) {
            case 'connected':
                console.log('✅ Server ready');
                break;

            case 'ai_response':
                this.handleAIResponse(data);
                break;

            case 'config_updated':
                console.log('✅ Voice config updated:', data.gender);
                break;

            case 'error':
                console.error('❌ Server error:', data.message);
                break;

            case 'pong':
                // Keep-alive response
                break;

            default:
                console.warn('⚠️  Unknown message type:', data.type);
        }
    }

    /**
     * Handle AI response from server
     */
    handleAIResponse(data) {
        const { text, source, latency } = data;

        // Update stats
        this.elements.latencyValue.textContent = `${latency}ms`;

        if (source && source.startsWith('http')) {
            const shortSource = source.split('/')[2] || 'Source';
            this.elements.sourceValue.innerHTML = `<a href="${source}" target="_blank" style="color: inherit; text-decoration: underline;">${shortSource}</a>`;
        } else {
            this.elements.sourceValue.textContent = source;
        }

        // Add AI message to conversation
        this.addMessage(text, 'ai');

        // Speak the response
        this.speak(text);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Ball click (replaces microphone button)
        this.elements.aiBall.addEventListener('click', () => {
            this.toggleListening();
        });

        // Send button
        this.elements.sendButton.addEventListener('click', () => {
            this.sendTextMessage();
        });

        // Text input (Enter key)
        this.elements.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendTextMessage();
            }
        });

        // Voice selection buttons
        this.elements.voiceButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const gender = btn.dataset.gender;
                this.setVoice(gender);
            });
        });
    }

    /**
     * Toggle voice listening
     */
    toggleListening() {
        if (!this.recognition) {
            alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            // Stop any ongoing speech
            this.synthesis.cancel();
            this.isSpeaking = false;
            this.elements.aiBall.classList.remove('speaking');

            // Start listening
            try {
                this.recognition.start();
            } catch (error) {
                console.error('❌ Error starting recognition:', error);
            }
        }
    }

    /**
     * Send text message
     */
    sendTextMessage() {
        const text = this.elements.textInput.value.trim();

        if (!text) return;

        this.elements.textInput.value = '';
        this.handleUserInput(text);
    }

    /**
     * Handle user input (voice or text)
     */
    handleUserInput(text) {
        console.log('💬 User input:', text);

        // Add user message to conversation
        this.addMessage(text, 'user');

        // Send to server
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'user_message',
                text: text,
            }));

            this.elements.ballStatus.textContent = 'Thinking...';
        } else {
            console.error('❌ WebSocket not connected');
            this.elements.ballStatus.textContent = 'Not connected';
        }
    }

    /**
     * Add message to conversation
     */
    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';

        const content = document.createElement('div');
        content.className = 'message-content';

        const p = document.createElement('p');
        p.textContent = text;

        content.appendChild(p);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        this.elements.conversation.appendChild(messageDiv);

        // Scroll to bottom
        this.elements.conversation.parentElement.scrollTop =
            this.elements.conversation.parentElement.scrollHeight;
    }

    /**
     * Speak text using TTS
     */
    speak(text) {
        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Select voice based on gender preference
        const voice = this.selectVoice(this.voiceGender);
        if (voice) {
            utterance.voice = voice;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            console.log('🔊 Speaking...');
            this.isSpeaking = true;
            this.elements.aiBall.classList.add('speaking');
            this.elements.ballStatus.textContent = 'Speaking...';
        };

        utterance.onend = () => {
            console.log('🔇 Finished speaking');
            this.isSpeaking = false;
            this.elements.aiBall.classList.remove('speaking');
            this.elements.ballStatus.textContent = 'Click me to talk!';
        };

        utterance.onerror = (error) => {
            console.error('❌ Speech synthesis error:', error);
            this.isSpeaking = false;
            this.elements.aiBall.classList.remove('speaking');
            this.elements.ballStatus.textContent = 'Click me to talk!';
        };

        this.synthesis.speak(utterance);
    }

    /**
     * Select appropriate voice based on gender
     */
    selectVoice(gender) {
        if (this.voices.length === 0) {
            return null;
        }

        // Try to find a voice matching the gender preference
        let voice = null;

        if (gender === 'female') {
            // Prefer female voices
            voice = this.voices.find(v =>
                v.name.toLowerCase().includes('female') ||
                v.name.toLowerCase().includes('woman') ||
                v.name.includes('Zira') ||
                v.name.includes('Samantha')
            );
        } else {
            // Prefer male voices
            voice = this.voices.find(v =>
                v.name.toLowerCase().includes('male') ||
                v.name.toLowerCase().includes('man') ||
                v.name.includes('David') ||
                v.name.includes('Alex')
            );
        }

        // Fallback to first available voice
        return voice || this.voices[0];
    }

    /**
     * Set voice gender preference
     */
    setVoice(gender) {
        this.voiceGender = gender;

        // Update UI
        this.elements.voiceButtons.forEach(btn => {
            if (btn.dataset.gender === gender) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Notify server
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'voice_config',
                gender: gender,
            }));
        }

        console.log('🎤 Voice set to:', gender);
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(status) {
        this.elements.connectionStatus.textContent = status;

        const colors = {
            'Connected': 'var(--success)',
            'Connecting...': 'var(--warning)',
            'Disconnected': 'var(--error)',
            'Error': 'var(--error)',
        };

        this.elements.connectionStatus.style.color = colors[status] || 'var(--text-secondary)';
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.voiceAI = new VoiceAIFriend();
    });
} else {
    window.voiceAI = new VoiceAIFriend();
}
