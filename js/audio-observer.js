/**
 * AudioObserver
 * Background watchdog that detects when TTS audio or speech has finished
 * and ensures the UI animation is terminated.
 */
(function() {
    const CHECK_INTERVAL = 500; // Check every 0.5 seconds

    setInterval(() => {
        const tts = window.TTSManager;
        if (!tts || !tts.activeButton) return;

        // 1. Check Web Speech API (speechSynthesis)
        // Note: On some browsers, speechSynthesis.speaking can get stuck.
        // We also check if it's paused or if there are pending utterances.
        const isSynthSpeaking = window.speechSynthesis && window.speechSynthesis.speaking;

        // 2. Check Fallback HTML5 Audio
        const isAudioPlaying = tts.audio && !tts.audio.paused && !tts.audio.ended;

        // 3. Check if Android Native TTS timeout is still running
        const isAndroidTimeoutActive = !!tts.androidTimeout;

        // If nothing is actually playing/speaking, but a button is still marked as 'speaking'
        if (!isSynthSpeaking && !isAudioPlaying && !isAndroidTimeoutActive) {
            // Additional check: if we think we are speaking but the synth says otherwise
            console.log("[AudioObserver] No active audio detected. Terminating animation.");
            tts.clearActive();
        }
    }, CHECK_INTERVAL);
})();
