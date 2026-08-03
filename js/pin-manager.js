window.PinManager = {
    async togglePin(word) {
        const isPinned = await DBManager.isPinned(word);
        const result = isPinned ? await DBManager.removePin(word) : await DBManager.addPin(word);
        if (window.location.pathname.startsWith('/favorites_page')) this.render();
        return !isPinned;
    },

    init() {
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    },

    handleRoute() {
        const path = window.location.pathname;
        if (path === '/favorites_page' || path.startsWith('/favorites_page/modal/')) {
            const modalIndex = path.indexOf('/modal/');
            const modalWord = modalIndex !== -1 ? path.substring(modalIndex + 7) : null;

            if (!document.querySelector('.favorites-page')) {
                this.render();
            }

            if (modalWord && window.ModalManager) {
                window.ModalManager.show(decodeURIComponent(modalWord), null, true);
            } else if (window.ModalManager) {
                window.ModalManager.hide(true);
            }
        }
    },

    open() {
        window.history.pushState({ favorites: true }, "", "/favorites_page");
        this.render();
    },

    async render() {
        const container = document.getElementById('results-container');
        if (!container) return;

        document.body.classList.remove('home-state');
        if (window.RestoreSearchUI) window.RestoreSearchUI();

        const pinned = await DBManager.getPinned();

        let html = `
            <div class="list-page favorites-page" style="padding: 20px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: var(--text-main); font-weight: 500;">Favorites</h2>
                    <span style="color: var(--text-sub); font-size: 14px;">${pinned.length} words saved</span>
                </div>

                <div class="tags-row" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 30px;">
                    ${pinned.map(p => `
                        <div class="tag syn-tag" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer;" onclick="window.ModalManager.show('${UIUtils.escapeJS(p.word)}'); event.stopPropagation();">
                            <span>${p.word}</span>
                            <span class="untap-pin" style="color:#d93025; font-size: 18px; margin-left: 5px; opacity: 0.7;" onclick="event.stopPropagation(); window.PinManager.togglePin('${UIUtils.escapeJS(p.word)}');">✕</span>
                        </div>
                    `).join('')}
                    ${pinned.length === 0 ? `<div style="text-align: center; color: var(--text-sub); padding: 40px 0; width: 100%;">Your favorites list is empty.</div>` : ''}
                </div>
            </div>
        `;

        container.innerHTML = html;
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
};
