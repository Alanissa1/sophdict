window.TTSManager = {
    currentUtterance: null,
    activeButton: null,
    lastText: null,
    voicesLoaded: false,

    init() {
        console.log("[TTS] Initializing TTSManager...");
        this.synth = window.speechSynthesis || window.webkitSpeechSynthesis;
        if (!this.synth) {
            console.error("[TTS] TTS support NOT detected");
            return;
        }

        // Force loading voices
        this.synth.getVoices();
        const updateVoices = () => {
            this.voicesLoaded = true;
            console.log("[TTS] Voices loaded:", this.synth.getVoices().length);
        };
        if (this.synth.addEventListener) {
            this.synth.addEventListener('voiceschanged', updateVoices);
        } else if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = updateVoices;
        }
    },

    speak(text, buttonEl, langOverride = null) {
        if (!text) return;

        // Strip HTML tags (like <b>) so they aren't read aloud
        const cleanText = text.replace(/<[^>]*>/g, '');

        // Toggle Logic: If tapping the same button/text while it's active, stop it.
        if (this.activeButton === buttonEl && this.lastText === cleanText) {
            this.stop();
            return;
        }

        // Stop any current speech before starting new one
        this.stop();

        this.lastText = cleanText;
        this.activeButton = buttonEl;

        // Get settings from TextScaler if available
        let selectedVoice = null;
        let speechRate = 1.0;
        let lang = langOverride || 'en';

        if (window.TextScaler && !langOverride) {
            selectedVoice = window.TextScaler.voices.find(v => v.name === window.TextScaler.currentVoiceName);
            speechRate = window.TextScaler.speechRate || 1.0;
            if (selectedVoice) {
                lang = selectedVoice.locale;
            }
        } else if (langOverride) {
            speechRate = window.TextScaler?.speechRate || 1.0;
            // Try to find a voice for the override language
            const voices = this.synth.getVoices();
            selectedVoice = voices.find(v => v.lang.startsWith(langOverride) || v.lang.includes(langOverride.replace('-', '_')));
        }

        // Normalize language code for compatibility (e.g., en_US -> en-US)
        lang = lang.replace('_', '-');

        if (window.AndroidTTS) {
            console.log("[TTS] Using Android Native TTS:", cleanText);
            window.AndroidTTS.speak(cleanText);

            if (buttonEl) buttonEl.classList.add('speaking');

            // Fallback visual clear for Android TTS
            const wordCount = cleanText.split(/\s+/).length;
            const estimateMs = Math.max(2000, (wordCount * 600) / speechRate);
            this.androidTimeout = setTimeout(() => {
                if (buttonEl) buttonEl.classList.remove('speaking');
                if (this.activeButton === buttonEl) this.clearActive();
            }, estimateMs);
            return;
        }

        // Web Speech API Path (Windows, Mac, iOS, Chrome Desktop)
        // Note: On some Android browsers, getVoices() might be empty but synthesis still works with lang.
        if (this.synth && (this.synth.getVoices().length > 0 || /Android/i.test(navigator.userAgent))) {
            console.log("[TTS] Using Web Speech API:", cleanText, "Lang:", lang, "Rate:", speechRate);
            const utterance = new SpeechSynthesisUtterance(cleanText);

            // Set Language first as a baseline
            utterance.lang = lang;

            // Set Voice if we have a match
            if (selectedVoice) {
                const voices = this.synth.getVoices();
                const voice = voices.find(v => v.name === selectedVoice.name);
                if (voice) {
                    utterance.voice = voice;
                }
            }

            utterance.rate = speechRate;

            utterance.onstart = () => {
                if (buttonEl && this.activeButton === buttonEl) {
                    buttonEl.classList.add('speaking');
                }
            };

            utterance.onended = () => {
                if (buttonEl) buttonEl.classList.remove('speaking');
                if (this.activeButton === buttonEl) this.clearActive();
            };

            utterance.onerror = (e) => {
                console.error("[TTS] SpeechSynthesis error:", e);
                if (buttonEl) buttonEl.classList.remove('speaking');
                if (this.activeButton === buttonEl) this.clearActive();
            };

            this.currentUtterance = utterance;
            this.synth.speak(utterance);
            return;
        }

        console.warn("[TTS] Native Speech Synthesis not supported in this browser.");
        this.clearActive();
    },

    stop() {
        if (window.AndroidTTS) {
            window.AndroidTTS.stop();
        }
        if (this.synth && this.synth.speaking) {
            this.synth.cancel();
        }
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
        if (this.androidTimeout) {
            clearTimeout(this.androidTimeout);
            this.androidTimeout = null;
        }
        this.clearActive();
    },

    clearActive() {
        if (this.activeButton) {
            this.activeButton.classList.remove('speaking');
        }
        // Force clear all animations to prevent race condition orphans
        document.querySelectorAll('.tts-btn.speaking').forEach(el => el.classList.remove('speaking'));
        this.activeButton = null;
        this.lastText = null;
        this.audio = null;
        if (this.androidTimeout) {
            clearTimeout(this.androidTimeout);
            this.androidTimeout = null;
        }
    },

    createButton(text, className = "tts-btn", lang = null) {
        const btn = document.createElement('span');
        btn.className = className;
        btn.setAttribute('tabindex', '0');
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                <path class="speaker-body" d="M120-360v-240h160l200-200v640L280-360H120Z"/>
                <path class="speaker-wave-small" d="M560-642q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320v-322Z"/>
                <path class="speaker-wave-large" d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131Z"/>
            </svg>
        `;
        btn.onclick = (e) => {
            e.stopPropagation();
            this.speak(text, btn, lang);
        };
        btn.title = "Read Aloud (Tap to Start/Stop)";
        return btn;
    }
};
