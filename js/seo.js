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
            const isModal = window.location.pathname.startsWith('/modal/');
            const path = isModal ? `/modal/${encodeURIComponent(word)}` : `/${encodeURIComponent(word)}`;
            ogUrl.setAttribute('content', window.location.origin + path);
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
                window.updateMetadata(word);
                // Update URL to .com/word if not a history navigation
                if (!isHistoryNav) {
                    window.history.pushState({ word }, "", `/${encodeURIComponent(word)}`);
                }
            }
            return result;
        };
    }

    // 4. Handle initial load from a path (e.g., sophdict.vercel.app/apple or /modal/apple)
    const handleRouting = () => {
        const path = window.location.pathname.substring(1);
        if (!path || path === "index.html") return;

        if (path.startsWith('modal/')) {
            const word = decodeURIComponent(path.substring(6));
            if (word && window.ModalManager) {
                window.ModalManager.show(word, null, true);
            }
        } else if (!path.includes('/') && window.AppSearch) {
            window.AppSearch(decodeURIComponent(path), false, true);
        }
    };

    // Handle back/forward buttons
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.modal && e.state.word) {
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
            handleRouting();
        });
    } else {
        injectJSONLD();
        handleRouting();
    }
})();
