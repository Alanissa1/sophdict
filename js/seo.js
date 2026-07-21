/**
 * SEO and Structured Data Manager for SophDict
 */
(function() {
    // 1. Inject JSON-LD Structured Data
    const injectJSONLD = () => {
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "SophDict",
            "alternateName": "The Sophisticated Dictionary",
            "url": window.location.origin + "/",
            "description": "SophDict - A sophisticated dictionary and thesaurus tool for definitions, synonyms, and language learning.",
            "potentialAction": {
                "@type": "SearchAction",
                "target": window.location.origin + "/?search={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(jsonLd);
        document.head.appendChild(script);
    };

    // 2. Dynamic Metadata Updates
    window.updateMetadata = (word) => {
        if (!word) return;
        const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);

        // Update Title
        document.title = `${capitalizedWord} Definition & Synonyms - SophDict`;

        // Update Description
        const description = `Discover the meaning, pronunciation, synonyms, and antonyms of "${word}" on SophDict. Your go-to sophisticated dictionary.`;
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', description);
        }

        // Update Open Graph Tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', `${capitalizedWord} - SophDict`);

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', description);

        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) {
            const pathname = window.location.pathname;
            ogUrl.setAttribute('content', window.location.origin + pathname);
        }
    };

    // 3. Hook into AppSearch to update URL path
    const originalAppSearch = window.AppSearch;
    if (originalAppSearch) {
        window.AppSearch = async function(target, isSilent, isHistoryNav) {
            const result = await originalAppSearch(target, isSilent, isHistoryNav);
            const wordInput = document.getElementById('wordInput');
            const word = (target || wordInput?.value || "").trim().toLowerCase();

            if (word && !isSilent) {
                // Update URL to /word if not a history navigation
                if (!isHistoryNav) {
                    const pathname = window.location.pathname;
                    // Check if we're in a /word/modal/word2 state
                    if (pathname.includes('/modal/')) {
                        // Keep the modal part, just update the main word. Removed trailing slashes defensively.
                        const modalWord = pathname.split('/modal/')[1].replace(/\/$/, "");
                        window.history.pushState({ word }, "", `/${encodeURIComponent(word)}/modal/${modalWord}`);
                    } else {
                        // Regular word search
                        window.history.pushState({ word }, "", `/${encodeURIComponent(word)}`);
                    }
                }
                
                // FIXED: Update metadata AFTER pushState so og:url pulls the new, correct location.pathname
                window.updateMetadata(word);
            }
            return result;
        };
    }

    // 4. Hook into ModalManager to fix URL state issues on opening and closing
    const initModalManagerHooks = () => {
        // Poll for ModalManager in case it initializes slightly after this script
        const hookInterval = setInterval(() => {
            if (window.ModalManager) {
                clearInterval(hookInterval);
                
                // Prevent duplicate hooking
                if (window.ModalManager._seoHooked) return;
                window.ModalManager._seoHooked = true;

                const originalShow = window.ModalManager.show;
                const originalHide = window.ModalManager.hide;

                // Intercept modal open to append it to the main word
                window.ModalManager.show = function(word, sourceElement, isHistoryNav) {
                    const result = originalShow ? originalShow.apply(this, arguments) : undefined;
                    
                    if (!isHistoryNav) {
                        const mainWord = localStorage.getItem('lastWord');
                        if (mainWord) {
                            // replaceState fixes the issue where the URL jumps to `/modal/word` by overwriting it instantly 
                            window.history.replaceState({ modal: true, word }, "", `/${encodeURIComponent(mainWord)}/modal/${encodeURIComponent(word)}`);
                        } else {
                            window.history.replaceState({ modal: true, word }, "", `/modal/${encodeURIComponent(word)}`);
                        }
                    }
                    return result;
                };

                // Intercept modal close to revert the URL cleanly to the main word
                window.ModalManager.hide = function(isHistoryNav) {
                    const result = originalHide ? originalHide.apply(this, arguments) : undefined;
                    
                    if (!isHistoryNav) {
                        const mainWord = localStorage.getItem('lastWord');
                        if (mainWord) {
                            window.history.pushState({ word: mainWord }, "", `/${encodeURIComponent(mainWord)}`);
                            window.updateMetadata(mainWord);
                        } else {
                            window.history.pushState({}, "", "/");
                            document.title = 'SophDict - The Sophisticated Dictionary';
                        }
                    }
                    return result;
                };
            }
        }, 100); // 100ms polling until ModalManager is available
    };

    // 5. Handle initial load from a path (e.g., sophdict.vercel.app/apple or /modal/apple or /apple/modal/banana)
    const handleRouting = () => {
        const path = window.location.pathname.substring(1);
        if (!path || path === "index.html") return;

        // Open empty page first as requested
        if (window.AppClearSearch) window.AppClearSearch(true);

        // FIXED: Added optional trailing slash `/?` to regex to prevent routing breaks if a user manually adds a slash
        const modalPattern = /^([^/]+)\/modal\/([^/]+?)\/?$/;
        const modalMatch = path.match(modalPattern);
        
        if (modalMatch) {
            const mainWord = decodeURIComponent(modalMatch[1]);
            const modalWord = decodeURIComponent(modalMatch[2]);
            
            // Search the main word first, then open modal
            if (window.AppSearch) {
                window.AppSearch(mainWord, false, true).then((success) => {
                    // After main word is loaded, show the modal with the second word
                    if (window.ModalManager) {
                        window.ModalManager.show(modalWord, null, true);
                    }
                });
            }
        } else if (path.startsWith('modal/')) {
            // Legacy: /modal/word format
            const word = decodeURIComponent(path.substring(6).replace(/\/$/, ""));
            if (word && window.ModalManager) {
                window.ModalManager.show(word, null, true);
            }
        } else if (!path.includes('/')) {
            // Simple word search
            if (window.AppSearch) {
                window.AppSearch(decodeURIComponent(path), false, true);
            }
        }
    };

    // Handle back/forward buttons
    window.addEventListener('popstate', (e) => {
        // Open empty page first for consistent behavior
        if (window.AppClearSearch) window.AppClearSearch(true);

        const path = window.location.pathname.substring(1);
        const modalPattern = /^([^/]+)\/modal\/([^/]+?)\/?$/;
        const modalMatch = path.match(modalPattern);
        
        if (modalMatch) {
            const mainWord = decodeURIComponent(modalMatch[1]);
            const modalWord = decodeURIComponent(modalMatch[2]);
            const currentMainWord = localStorage.getItem('lastWord');
            
            if (mainWord !== currentMainWord) {
                // Need to load the main word first
                if (window.AppSearch) {
                    window.AppSearch(mainWord, false, true).then((success) => {
                        if (window.ModalManager) {
                            window.ModalManager.show(modalWord, null, true);
                        }
                    });
                }
            } else {
                // Main word already loaded, just show modal
                if (window.ModalManager) {
                    window.ModalManager.show(modalWord, null, true);
                }
            }
        } else if (e.state && e.state.modal && e.state.word) {
            if (window.ModalManager) window.ModalManager.show(e.state.word, null, true);
        } else if (e.state && e.state.word) {
            const currentMainWord = localStorage.getItem('lastWord');
            if (e.state.word !== currentMainWord) {
                window.AppSearch(e.state.word, false, true);
            } else {
                // If returning to the same word from a modal, just hide the modal
                if (window.ModalManager) window.ModalManager.hide(true);
                window.updateMetadata(e.state.word);
            }
        } else if (window.location.pathname === "/") {
            if (window.ModalManager) window.ModalManager.hide(true);
            if (window.AppClearSearch) window.AppClearSearch();
            document.title = 'SophDict - The Sophisticated Dictionary';
        }
    });

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectJSONLD();
            initModalManagerHooks();
            handleRouting();
        });
    } else {
        injectJSONLD();
        initModalManagerHooks();
        handleRouting();
    }
})();