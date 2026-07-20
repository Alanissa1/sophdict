window.SearchMode = {
    mode: 'dictionary', // 'dictionary' or 'thesaurus'

    init() {
        const saved = localStorage.getItem('sophdict_search_mode');
        if (saved) this.mode = saved;
        this.render();
    },

    setMode(newMode) {
        if (this.mode === newMode) return;
        this.mode = newMode;
        localStorage.setItem('sophdict_search_mode', this.mode);
        this.updateUI();

        // Trigger search if there's text in input and we are on results page
        const input = document.getElementById('wordInput');
        if (input && input.value.trim() && !document.body.classList.contains('home-state')) {
            window.AppSearch(input.value.trim());
        }
    },

    updateUI() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.mode);
        });

        // Update placeholder based on mode
        const input = document.getElementById('wordInput');
        if (input) {
            input.placeholder = this.mode === 'dictionary'
                ? 'Search dictionary...'
                : 'Search thesaurus...';
        }
    },

    render() {
        const container = document.createElement('div');
        container.className = 'search-mode-container';
        container.innerHTML = `
            <button class="mode-btn ${this.mode === 'dictionary' ? 'active' : ''}" data-mode="dictionary" onclick="SearchMode.setMode('dictionary')">Dictionary</button>
            <button class="mode-btn ${this.mode === 'thesaurus' ? 'active' : ''}" data-mode="thesaurus" onclick="SearchMode.setMode('thesaurus')">Thesaurus</button>
        `;
        this.container = container;
        this.inject();
    },

    inject() {
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer) return;

        // On Home Screen: Above search-container inside welcome-screen
        if (document.body.classList.contains('home-state')) {
            const welcomeScreen = document.querySelector('.welcome-screen');
            if (welcomeScreen) {
                if (welcomeScreen.contains(this.container)) {
                    // Ensure it's BEFORE the search container
                    if (this.container.nextElementSibling !== searchContainer) {
                        welcomeScreen.insertBefore(this.container, searchContainer);
                    }
                } else {
                    welcomeScreen.insertBefore(this.container, searchContainer);
                }
            }
        } else {
            // On Results Page: Inside header before search-container (for wide)
            // or above it (for narrow)
            const header = document.getElementById('appHeader');
            if (header) {
                if (header.contains(this.container)) {
                    // Ensure it's BEFORE the search container
                    if (this.container.nextElementSibling !== searchContainer) {
                        header.insertBefore(this.container, searchContainer);
                    }
                } else {
                    header.insertBefore(this.container, searchContainer);
                }
            }
        }
        this.updateUI();
    }
};

// Initialize search mode when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SearchMode.init());
} else {
    SearchMode.init();
}
