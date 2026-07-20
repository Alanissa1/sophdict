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
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => {
                this.voicesLoaded = true;
                console.log("[TTS] Voices loaded:", this.synth.getVoices().length);
            };
        }
    },

    speak(text, buttonEl) {
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
        let lang = 'en';

        if (window.TextScaler) {
            selectedVoice = window.TextScaler.voices.find(v => v.name === window.TextScaler.currentVoiceName);
            speechRate = window.TextScaler.speechRate || 1.0;
            if (selectedVoice) {
                lang = selectedVoice.locale;
            }
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

        console.log("[TTS] Attempting to speak (Google fallback):", cleanText, "Lang:", lang);

        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${lang}&client=tw-ob`;
        const audio = new Audio(url);
        this.audio = audio;

        audio.onplay = () => {
            if (buttonEl && this.activeButton === buttonEl) {
                buttonEl.classList.add('speaking');
            }
        };

        audio.onended = () => {
            if (buttonEl) buttonEl.classList.remove('speaking');
            if (this.activeButton === buttonEl) this.clearActive();
        };

        audio.onerror = (e) => {
            console.error("[TTS] Audio error:", e);
            if (buttonEl) buttonEl.classList.remove('speaking');
            if (this.activeButton === buttonEl) this.clearActive();
        };

        audio.play().catch(err => {
            console.error("[TTS] Play failed:", err);
            this.clearActive();
        });
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

    createButton(text, className = "tts-btn") {
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
            this.speak(text, btn);
        };
        btn.title = "Read Aloud (Tap to Start/Stop)";
        return btn;
    }
};
