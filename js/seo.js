/**
 * SEO and Structured Data Manager for SophDict
 */
(function() {
    // 1. Inject Global WebSite JSON-LD
    const injectJSONLD = () => {
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "SophDict",
            "alternateName": "The Sophisticated Dictionary",
            "url": window.location.origin + "/",
            "description": "SophDict - the sophisticated dictionary with thesaurus tool for definitions, synonyms, and language learning.",
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

    // Helper: Update DefinedTerm schema for Google Rich Snippets
    const updateWordSchema = (word) => {
        let schemaScript = document.getElementById('jsonld-definedterm');
        if (!schemaScript) {
            schemaScript = document.createElement('script');
            schemaScript.id = 'jsonld-definedterm';
            schemaScript.type = 'application/ld+json';
            document.head.appendChild(schemaScript);
        }
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "DefinedTerm",
            "name": word,
            "inDefinedTermSet": {
                "@type": "DefinedTermSet",
                "name": "SophDict Dictionary",
                "url": window.location.origin + "/"
            }
        };
        schemaScript.textContent = JSON.stringify(jsonLd);
    };

    // 2. Dynamic Metadata Updates
    window.updateMetadata = (word) => {
        if (!word) return;
        const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);

        // Update Title
        document.title = `${capitalizedWord} Definition & Synonyms - SophDict`;

        // Update Meta Description
        const description = `Discover the definition, pronunciation, and synonyms for "${capitalizedWord}" on SophDict, the sophisticated dictionary.`;
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = "description";
            document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', description);

        // Update Open Graph Tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', `${capitalizedWord} - SophDict`);

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', description);

        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) {
            ogUrl.setAttribute('content', window.location.origin + window.location.pathname);
        }

        // Update Word Structured Data
        updateWordSchema(capitalizedWord);
    };

    // 3. Hook into AppSearch to update URL path
    const originalAppSearch = window.AppSearch;
    if (originalAppSearch) {
        window.AppSearch = async function(target, isSilent, isHistoryNav) {
            const result = await originalAppSearch(target, isSilent, isHistoryNav);
            const wordInput = document.getElementById('wordInput');
            const word = (target || wordInput?.value || "").trim().toLowerCase();

            if (word && !isSilent) {
                if (!isHistoryNav) {
                    window.history.pushState({ word }, "", `/${encodeURIComponent(word)}`);
                }
                window.updateMetadata(word);
            }
            return result;
        };
    }

    // 4. Hook into ModalManager to fix URL state issues on opening and closing
    const initModalManagerHooks = () => {
        const hookInterval = setInterval(() => {
            if (window.ModalManager) {
                clearInterval(hookInterval);
                
                if (window.ModalManager._seoHooked) return;
                window.ModalManager._seoHooked = true;

                const originalShow = window.ModalManager.show;
                const originalHide = window.ModalManager.hide;

                window.ModalManager.show = function(word, sourceElement, isHistoryNav) {
                    if (!word) return;
                    const result = originalShow ? originalShow.apply(this, arguments) : undefined;
                    
                    if (!isHistoryNav) {
                        const pathname = window.location.pathname;
                        const isAlreadyInModal = pathname.includes('/modal/');

                        if (pathname.startsWith('/570academic') || pathname.startsWith('/listname/') || pathname.startsWith('/llistname/') || pathname.startsWith('/formal-')) {
                            const base = pathname.split('/modal/')[0];
                            if (isAlreadyInModal) {
                                window.history.replaceState({ modal: true, word }, "", `${base}/modal/${encodeURIComponent(word)}`);
                            } else {
                                window.history.pushState({ modal: true, word }, "", `${base}/modal/${encodeURIComponent(word)}`);
                            }
                        } else {
                            const mainWord = localStorage.getItem('lastWord');
                            if (isAlreadyInModal) {
                                if (mainWord) {
                                    window.history.replaceState({ modal: true, word }, "", `/${encodeURIComponent(mainWord)}/modal/${encodeURIComponent(word)}`);
                                } else {
                                    window.history.replaceState({ modal: true, word }, "", `/modal/${encodeURIComponent(word)}`);
                                }
                            } else {
                                if (mainWord) {
                                    window.history.pushState({ modal: true, word }, "", `/${encodeURIComponent(mainWord)}/modal/${encodeURIComponent(word)}`);
                                } else {
                                    window.history.pushState({ modal: true, word }, "", `/modal/${encodeURIComponent(word)}`);
                                }
                            }
                        }
                    }
                    return result;
                };

                window.ModalManager.hide = function(isHistoryNav) {
                    const result = originalHide ? originalHide.apply(this, arguments) : undefined;
                    
                    if (!isHistoryNav) {
                        if (window.history.state?.modal) {
                            window.history.back();
                        } else {
                            const pathname = window.location.pathname;
                            if (pathname.includes('/modal/')) {
                                const newPath = pathname.split('/modal/')[0];
                                window.history.pushState({}, "", newPath);
                            } else {
                                const mainWord = localStorage.getItem('lastWord');
                                if (mainWord) {
                                    window.history.pushState({ word: mainWord }, "", `/${encodeURIComponent(mainWord)}`);
                                    window.updateMetadata(mainWord);
                                } else {
                                    window.history.pushState({}, "", "/");
                                    document.title = 'SophDict - The Sophisticated Dictionary';
                                }
                            }
                        }
                    }
                    return result;
                };
            }
        }, 100);
    };

    // 5. Handle initial load from a path
    const handleRouting = () => {
        const path = window.location.pathname.substring(1);
        if (!path || path === "index.html") return;

        if (path.startsWith('570academic') || path.startsWith('listname/') || path.startsWith('llistname/') || path === 'feedbackandsupport' || path.includes('/cardsgame')) return;

        if (window.AppClearSearch) window.AppClearSearch(true);

        const modalPattern = /^([^/]+)\/modal\/([^/]+?)\/?$/;
        const modalMatch = path.match(modalPattern);
        
        if (modalMatch) {
            const mainWord = decodeURIComponent(modalMatch[1]);
            const modalWord = decodeURIComponent(modalMatch[2]);
            
            if (window.AppSearch) {
                window.AppSearch(mainWord, true, true).then((success) => {
                    if (success && window.ModalManager) {
                        window.ModalManager.show(modalWord, null, true);
                        window.history.replaceState({ modal: true, word: modalWord }, "", window.location.pathname);
                    }
                });
            }
        } else if (path.startsWith('modal/')) {
            const word = decodeURIComponent(path.substring(6).replace(/\/$/, ""));
            if (word && window.ModalManager) {
                window.ModalManager.show(word, null, true);
                window.history.replaceState({ modal: true, word }, "", window.location.pathname);
            }
        } else if (!path.includes('/')) {
            const word = decodeURIComponent(path);
            if (window.AppSearch) {
                window.AppSearch(word, true, true);
                window.history.replaceState({ word }, "", `/${encodeURIComponent(word)}`);
                window.updateMetadata(word);
            }
        }
    };

    // Handle back/forward buttons
    window.addEventListener('popstate', (e) => {
        const path = window.location.pathname.substring(1);

        if (path.startsWith('570academic') || path.startsWith('listname/') || path.startsWith('llistname/') || path === 'feedbackandsupport' || path.includes('/cardsgame')) return;

        const modalPattern = /^([^/]+)\/modal\/([^/]+?)\/?$/;
        const modalMatch = path.match(modalPattern);
        const currentMainWord = localStorage.getItem('lastWord');

        let nextMainWord = null;
        if (modalMatch) {
            nextMainWord = decodeURIComponent(modalMatch[1]);
        } else if (path && !path.includes('/')) {
            nextMainWord = decodeURIComponent(path);
        } else if (e.state && e.state.word) {
            nextMainWord = e.state.word;
        }

        if (nextMainWord && nextMainWord !== currentMainWord) {
            if (window.AppClearSearch) window.AppClearSearch(true);
        }

        if (modalMatch) {
            const mainWord = decodeURIComponent(modalMatch[1]);
            const modalWord = decodeURIComponent(modalMatch[2]);

            if (mainWord !== currentMainWord) {
                if (window.AppSearch) {
                    window.AppSearch(mainWord, true, true).then((success) => {
                        if (success && window.ModalManager) {
                            window.ModalManager.show(modalWord, null, true);
                        }
                    });
                }
            } else {
                if (window.ModalManager) {
                    window.ModalManager.show(modalWord, null, true);
                }
            }
        } else if (e.state && e.state.modal && e.state.word) {
            if (window.ModalManager) window.ModalManager.show(e.state.word, null, true);
        } else if (e.state && e.state.word) {
            if (e.state.word !== currentMainWord) {
                window.AppSearch(e.state.word, true, true);
                window.updateMetadata(e.state.word);
            } else {
                if (window.ModalManager) window.ModalManager.hide(true);
                window.updateMetadata(e.state.word);
            }
        } else if (window.location.pathname === "/") {
            if (window.ModalManager) window.ModalManager.hide(true);
            if (window.AppClearSearch && !document.body.classList.contains('home-state')) window.AppClearSearch();
            document.title = 'SophDict - The Sophisticated Dictionary';
        }

        if (window.AppClosePinnedPanel) window.AppClosePinnedPanel(true);
        if (window.StatsManager) window.StatsManager.hide(true);
        if (window.TextScaler && document.getElementById('text-scale-control')?.style.display === 'flex') {
            window.TextScaler.hide(true);
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
