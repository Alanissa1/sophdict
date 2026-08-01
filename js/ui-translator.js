/**
 * SophDict UI Translator
 * Automatically translates UI elements while excluding dictionary content.
 */
(function() {
    const UI_STRINGS = {
        static: [
            { selector: '.welcome-text', text: 'SophDict - The Sophisticated Dictionary' },
            { selector: '.welcome-hint', text: 'Search for definitions, synonyms, and more' },
            { selector: '#wordInput', attribute: 'placeholder', text: 'Search dictionary...' },
            { selector: '.side-list-header span', text: 'Word Lists' },
            { selector: '#loaderText', text: 'Searching...' },
            { selector: '#pinnedPanel div:first-child', text: 'Favorites' },
            { selector: '.powered', text: 'Definitions powered by', isPrefix: true },
            { selector: '.rights', text: 'All rights reserved.', isSuffix: true },
            { selector: '.contact', text: 'Contact:', isPrefix: true }
        ],
        dynamic: [
            'Word Origin',
            'Related Words',
            'Word not found',
            'Dictionary definition not available.',
            'Thesaurus data not available for this word.',
            'View Full Main Page',
            'Similar:',
            'Opposite:'
        ]
    };

    const EXCLUDED_SELECTORS = [
        '.def-text',
        '.example',
        '.tag',
        '.word-title',
        '.pronunciation',
        '.micro-title',
        '.micro-pronunciation',
        '.run-on-fl',
        '.sense-num',
        '.sense-divider'
    ];

    async function translateUI() {
        if (!window.TranslationManager || !window.TranslationManager.isEnabled || window.TranslationManager.targetLanguage === 'en') return;

        const lang = window.TranslationManager.targetLanguage;

        // 1. Translate Static Elements
        UI_STRINGS.static.forEach(async (item) => {
            const elements = document.querySelectorAll(item.selector);
            elements.forEach(async (el) => {
                // Register in Upstash as 'us' language for future prefetching
                registerInUpstash(item.text);

                const translated = await getTranslation(item.text, lang);
                if (translated && translated !== item.text) {
                    if (item.attribute) {
                        el.setAttribute(item.attribute, translated);
                    } else if (item.isPrefix) {
                        if (el.firstChild && el.firstChild.nodeType === 3) {
                            el.firstChild.textContent = translated + ' ';
                        }
                    } else {
                        // For simple elements, preserve icons if any
                        const icon = el.querySelector('svg');
                        if (icon) {
                            el.innerHTML = '';
                            el.appendChild(icon);
                            el.appendChild(document.createTextNode(' ' + translated));
                        } else {
                            el.innerText = translated;
                        }
                    }
                }
            });
        });

        // 2. Scan for dynamic labels
        translateNode(document.body);
    }

    async function registerInUpstash(text) {
        // We use the existing API to store the English version in the 'us' cache bucket.
        // This ensures prefetching works for all users.
        try {
            fetch(`/api/translate?lang=us&text=${encodeURIComponent(text)}`);
        } catch (e) {}
    }

    async function getTranslation(text, lang) {
        if (!window.TranslationManager) return null;

        const cacheKey = `${lang}:${text}`;
        if (window.TranslationManager.cache[cacheKey]) return window.TranslationManager.cache[cacheKey];

        try {
            const response = await fetch(`/api/translate?lang=${lang}&text=${encodeURIComponent(text)}`);
            if (response.ok) {
                const data = await response.json();
                let translated = "";
                if (data && data[0]) {
                    data[0].forEach(part => { if (part[0]) translated += part[0]; });
                }
                if (translated) {
                    window.TranslationManager.cache[cacheKey] = translated;
                    try { localStorage.setItem('translation_cache', JSON.stringify(window.TranslationManager.cache)); } catch(e) {}
                    return translated;
                }
            }
        } catch (e) {}
        return null;
    }

    function translateNode(root) {
        if (!window.TranslationManager || !window.TranslationManager.isEnabled || window.TranslationManager.targetLanguage === 'en') return;

        const lang = window.TranslationManager.targetLanguage;

        UI_STRINGS.dynamic.forEach(text => {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                const trimmed = node.textContent.trim();
                // Exact match check
                if (trimmed === text) {
                    const parent = node.parentElement;
                    if (parent && EXCLUDED_SELECTORS.some(sel => parent.closest(sel))) continue;

                    registerInUpstash(text);
                    getTranslation(text, lang).then(translated => {
                        if (translated && translated !== text) {
                            node.textContent = node.textContent.replace(text, translated);
                        }
                    });
                }
            }
        });
    }

    // Setup Mutation Observer
    const observer = new MutationObserver((mutations) => {
        if (!window.TranslationManager || !window.TranslationManager.isEnabled) return;

        let needsTranslation = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                needsTranslation = true;
                break;
            }
        }

        if (needsTranslation) {
            clearTimeout(window._uiTransTimer);
            window._uiTransTimer = setTimeout(() => {
                // Only translate the newly added nodes if possible, or just re-run scan
                translateUI();
            }, 500);
        }
    });

    function init() {
        if (window.TranslationManager && window.TranslationManager.isEnabled) {
            translateUI();
        }
        observer.observe(document.body, { childList: true, subtree: true });

        // Hook into TranslationManager events if they exist
        // Since we can't easily modify translation-manager.js, we poll or intercept
        const checkInterval = setInterval(() => {
            if (window.TranslationManager) {
                const originalToggle = window.TranslationManager.toggleEnabled;
                window.TranslationManager.toggleEnabled = function(enabled) {
                    originalToggle.apply(this, arguments);
                    if (enabled) translateUI();
                };

                const originalSetLang = window.TranslationManager.setLanguage;
                window.TranslationManager.setLanguage = function(lang) {
                    originalSetLang.apply(this, arguments);
                    if (this.isEnabled) translateUI();
                };

                clearInterval(checkInterval);
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
