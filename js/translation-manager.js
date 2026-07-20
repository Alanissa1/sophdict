window.TranslationManager = {
    isEnabled: false,
    targetLanguage: 'en',
    cache: {},
    languages: [
        { code: 'af', name: 'Afrikaans' }, { code: 'sq', name: 'Albanian' }, { code: 'am', name: 'Amharic' },
        { code: 'ar', name: 'Arabic' }, { code: 'hy', name: 'Armenian' }, { code: 'az', name: 'Azerbaijani' },
        { code: 'eu', name: 'Basque' }, { code: 'be', name: 'Belarusian' }, { code: 'bn', name: 'Bengali' },
        { code: 'bs', name: 'Bosnian' }, { code: 'bg', name: 'Bulgarian' }, { code: 'ca', name: 'Catalan' },
        { code: 'ceb', name: 'Cebuano' }, { code: 'ny', name: 'Chichewa' }, { code: 'zh-CN', name: 'Chinese (Simplified)' },
        { code: 'zh-TW', name: 'Chinese (Traditional)' }, { code: 'co', name: 'Corsican' }, { code: 'hr', name: 'Croatian' },
        { code: 'cs', name: 'Czech' }, { code: 'da', name: 'Danish' }, { code: 'nl', name: 'Dutch' },
        { code: 'en', name: 'English' }, { code: 'eo', name: 'Esperanto' }, { code: 'et', name: 'Estonian' },
        { code: 'tl', name: 'Filipino' }, { code: 'fi', name: 'Finnish' }, { code: 'fr', name: 'French' },
        { code: 'fy', name: 'Frisian' }, { code: 'gl', name: 'Galician' }, { code: 'ka', name: 'Georgian' },
        { code: 'de', name: 'German' }, { code: 'el', name: 'Greek' }, { code: 'gu', name: 'Gujarati' },
        { code: 'ht', name: 'Haitian Creole' }, { code: 'ha', name: 'Hausa' }, { code: 'haw', name: 'Hawaiian' },
        { code: 'iw', name: 'Hebrew' }, { code: 'hi', name: 'Hindi' }, { code: 'hmn', name: 'Hmong' },
        { code: 'hu', name: 'Hungarian' }, { code: 'is', name: 'Icelandic' }, { code: 'ig', name: 'Igbo' },
        { code: 'id', name: 'Indonesian' }, { code: 'ga', name: 'Irish' }, { code: 'it', name: 'Italian' },
        { code: 'ja', name: 'Japanese' }, { code: 'jw', name: 'Javanese' }, { code: 'kn', name: 'Kannada' },
        { code: 'kk', name: 'Kazakh' }, { code: 'km', name: 'Khmer' }, { code: 'ko', name: 'Korean' },
        { code: 'ku', name: 'Kurdish (Kurmanji)' }, { code: 'ky', name: 'Kyrgyz' }, { code: 'lo', name: 'Lao' },
        { code: 'la', name: 'Latin' }, { code: 'lv', name: 'Latvian' }, { code: 'lt', name: 'Lithuanian' },
        { code: 'lb', name: 'Luxembourgish' }, { code: 'mk', name: 'Macedonian' }, { code: 'mg', name: 'Malagasy' },
        { code: 'ms', name: 'Malay' }, { code: 'ml', name: 'Malayalam' }, { code: 'mt', name: 'Maltese' },
        { code: 'mi', name: 'Maori' }, { code: 'mr', name: 'Marathi' }, { code: 'mn', name: 'Mongolian' },
        { code: 'my', name: 'Myanmar (Burmese)' }, { code: 'ne', name: 'Nepali' }, { code: 'no', name: 'Norwegian' },
        { code: 'ps', name: 'Pashto' }, { code: 'fa', name: 'Persian' }, { code: 'pl', name: 'Polish' },
        { code: 'pt', name: 'Portuguese' }, { code: 'pa', name: 'Punjabi' }, { code: 'ro', name: 'Romanian' },
        { code: 'ru', name: 'Russian' }, { code: 'sm', name: 'Samoan' }, { code: 'gd', name: 'Scots Gaelic' },
        { code: 'sr', name: 'Serbian' }, { code: 'st', name: 'Sesotho' }, { code: 'sn', name: 'Shona' },
        { code: 'sd', name: 'Sindhi' }, { code: 'si', name: 'Sinhala' }, { code: 'sk', name: 'Slovak' },
        { code: 'sl', name: 'Slovenian' }, { code: 'so', name: 'Somali' }, { code: 'es', name: 'Spanish' },
        { code: 'su', name: 'Sundanese' }, { code: 'sw', name: 'Swahili' }, { code: 'sv', name: 'Swedish' },
        { code: 'tg', name: 'Tajik' }, { code: 'ta', name: 'Tamil' }, { code: 'tt', name: 'Tatar' },
        { code: 'te', name: 'Telugu' }, { code: 'th', name: 'Thai' }, { code: 'ti', name: 'Tigrinya' },
        { code: 'ts', name: 'Tsonga' }, { code: 'tr', name: 'Turkish' }, { code: 'tk', name: 'Turkmen' },
        { code: 'ak', name: 'Twi' }, { code: 'uk', name: 'Ukrainian' }, { code: 'ur', name: 'Urdu' },
        { code: 'ug', name: 'Uyghur' }, { code: 'uz', name: 'Uzbek' }, { code: 'vi', name: 'Vietnamese' },
        { code: 'cy', name: 'Welsh' }, { code: 'xh', name: 'Xhosa' }, { code: 'yi', name: 'Yiddish' },
        { code: 'yo', name: 'Yoruba' }, { code: 'zu', name: 'Zulu' }
    ],

    init() {
        this.isEnabled = localStorage.getItem('translation_enabled') === 'true';
        this.targetLanguage = localStorage.getItem('translation_target_lang') || 'tr';
        try {
            const savedCache = localStorage.getItem('translation_cache');
            if (savedCache) this.cache = JSON.parse(savedCache);
        } catch (e) { this.cache = {}; }
    },

    toggleEnabled(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('translation_enabled', enabled);
        // Refresh UI to show/hide buttons
        if (window.UIDictionary && document.getElementById('content-body')) {
             // In a real app we might want a cleaner way to refresh,
             // but here we can just let the next search handle it or manually toggle visibility
             this.updateGlobalVisibility();
        }
    },

    setLanguage(langCode) {
        this.targetLanguage = langCode;
        localStorage.setItem('translation_target_lang', langCode);
        // Clear cache when language changes? Or just keep it scoped by lang?
        // Let's just keep it, but the buttons will need to re-fetch if they want new lang.
    },

    updateGlobalVisibility() {
        document.querySelectorAll('.translate-btn').forEach(btn => {
            btn.style.display = this.isEnabled ? 'inline-flex' : 'none';
        });
        if (!this.isEnabled) {
            document.querySelectorAll('.translated-text').forEach(el => el.classList.remove('show'));
            document.querySelectorAll('.translate-btn').forEach(btn => btn.classList.remove('active'));
        }
    },

    async translate(text, targetElement, buttonEl) {
        if (!text) return;

        const cacheKey = `${this.targetLanguage}:${text}`;
        if (this.cache[cacheKey]) {
            this.showTranslation(this.cache[cacheKey], targetElement, buttonEl);
            return;
        }

        buttonEl.innerHTML = '<span class="translation-loading"></span>';

        try {
            // Point to our own API instead of Google directly to enable server-side caching
            const url = `/api/translate?lang=${this.targetLanguage}&text=${encodeURIComponent(text)}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            let translatedText = "";
            if (data && data[0]) {
                data[0].forEach(part => {
                    if (part[0]) translatedText += part[0];
                });
            }

            if (translatedText) {
                this.cache[cacheKey] = translatedText;
                try {
                    localStorage.setItem('translation_cache', JSON.stringify(this.cache));
                } catch (e) {
                    // If localStorage is full, clear it and save current
                    if (e.name === 'QuotaExceededError') {
                        this.cache = { [cacheKey]: translatedText };
                        localStorage.setItem('translation_cache', JSON.stringify(this.cache));
                    }
                }
                this.showTranslation(translatedText, targetElement, buttonEl);
            } else {
                throw new Error("No translation returned");
            }
        } catch (e) {
            console.error("Translation error:", e);
            buttonEl.innerHTML = this.getIcon();
            // Show a brief error toast or status if possible, or just reset button
            buttonEl.classList.remove('active');
        }
    },

    showTranslation(translatedText, targetElement, buttonEl) {
        buttonEl.innerHTML = this.getIcon();
        buttonEl.classList.add('active');

        let transDiv = targetElement.querySelector('.translated-text');
        if (!transDiv) {
            transDiv = document.createElement('div');
            transDiv.className = 'translated-text';
            targetElement.appendChild(transDiv);
        }

        // Save original position to restore later
        if (!buttonEl._originalParent) {
            buttonEl._originalParent = buttonEl.parentNode;
            buttonEl._originalNextSibling = buttonEl.nextSibling;
        }

        transDiv.innerText = translatedText;
        transDiv.classList.add('show');
        transDiv.appendChild(buttonEl);
        buttonEl.focus();
    },

    hideTranslation(targetElement, buttonEl) {
        buttonEl.classList.remove('active');
        const transDiv = targetElement.querySelector('.translated-text');
        if (transDiv) {
            transDiv.classList.remove('show');
        }

        // Restore original position
        if (buttonEl._originalParent) {
            buttonEl._originalParent.insertBefore(buttonEl, buttonEl._originalNextSibling);
            buttonEl.focus();
        }
    },

    getIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m480-80-40-120H160q-33 0-56.5-23.5T80-280v-520q0-33 23.5-56.5T160-880h240l35 120h365q35 0 57.5 22.5T880-680v520q0 33-22.5 56.5T800-80H480ZM286-376q69 0 113.5-44.5T444-536q0-8-.5-14.5T441-564H283v62h89q-8 28-30.5 43.5T287-443q-39 0-67-28t-28-69q0-41 28-69t67-28q18 0 34 6.5t29 19.5l49-47q-21-22-50.5-34T286-704q-67 0-114.5 47.5T124-540q0 69 47.5 116.5T286-376Zm268 20 22-21q-14-17-25.5-33T528-444l26 88Zm50-51q28-33 42.5-63t19.5-47H507l12 42h40q8 15 19 32.5t26 35.5Zm-84 287h280q18 0 29-11.5t11-28.5v-520q0-18-11-29t-29-11H447l47 162h79v-42h41v42h146v41h-51q-10 38-30 74t-47 67l109 107-29 29-108-108-36 37 32 111-80 80Z"/></svg>`;
    },

    createButton(text, targetElement) {
        const btn = document.createElement('span');
        btn.className = 'translate-btn';
        btn.setAttribute('tabindex', '0');
        btn.style.display = this.isEnabled ? 'inline-flex' : 'none';
        btn.innerHTML = this.getIcon();
        btn.onclick = (e) => {
            e.stopPropagation();
            if (btn.classList.contains('active')) {
                this.hideTranslation(targetElement, btn);
            } else {
                this.translate(text, targetElement, btn);
            }
        };
        btn.title = "Translate";
        return btn;
    },

    attachInlineTranslation(container) {
        if (!container) return;
        container.querySelectorAll('.def-text, .example, .word-title, .micro-title').forEach(el => {
            // Find the associated text. For def-text and example, they might have tts-inline-target next to them or inside.
            // But usually we can just grab the textContent minus the TTS button text.

            // To be precise, we look for data-text in the tts button if it exists
            const ttsBtn = el.querySelector('.tts-inline-target');
            let textToTranslate = "";

            if (ttsBtn && ttsBtn.dataset.text) {
                textToTranslate = ttsBtn.dataset.text;
            } else if (el.classList.contains('word-title') || el.classList.contains('micro-title')) {
                textToTranslate = el.innerText;
            } else {
                // Fallback: strip tags and clean up
                textToTranslate = el.innerText.replace(/\s+/g, ' ').trim();
            }

            if (textToTranslate) {
                const btn = this.createButton(textToTranslate, el);
                // If there's a tts-inline-target, insert after it.
                if (ttsBtn) {
                    ttsBtn.parentNode.insertBefore(btn, ttsBtn.nextSibling);
                } else {
                    el.appendChild(btn);
                }

                // Prefetch if enabled: Check Upstash only
                if (this.isEnabled) {
                    this.prefetchFromCache(textToTranslate, el, btn);
                }
            }
        });
    },

    async prefetchFromCache(text, targetElement, buttonEl) {
        const cacheKey = `${this.targetLanguage}:${text}`;
        // Skip if already in local cache
        if (this.cache[cacheKey]) return;

        try {
            // Call API with cacheOnly=true
            const url = `/api/translate?lang=${this.targetLanguage}&cacheOnly=true&text=${encodeURIComponent(text)}`;
            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                let translatedText = "";
                if (data && data[0]) {
                    data[0].forEach(part => { if (part[0]) translatedText += part[0]; });
                }

                if (translatedText) {
                    // Store in local cache for instant click later
                    this.cache[cacheKey] = translatedText;
                    localStorage.setItem('translation_cache', JSON.stringify(this.cache));
                    // Highlight the button slightly to show translation is ready?
                    // No, "do not do anything else".
                }
            }
        } catch (e) {
            // Silently fail prefetch
        }
    }
};

TranslationManager.init();
