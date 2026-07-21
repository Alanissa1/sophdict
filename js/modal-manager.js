window.ModalManager = {
    win: null,
    dim: null,
    content: null,

    lastTriggerElement: null,

    init() {
        this.win = document.getElementById('microWindow');
        this.dim = document.getElementById('microDimmer');
        this.content = document.getElementById('microContent');

        const closeBtn = document.querySelector('.micro-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.hide();
        }
    },

    async show(word, targetContext = null, isHistoryNav = false) {
        if (!this.win || !this.dim) this.init();

        this.lastTriggerElement = document.activeElement;

        if (window.ScrollFixer) window.ScrollFixer.save();
        if (window.StatsManager) window.StatsManager.recordTagOpen(word);

        if (window.updateMetadata) window.updateMetadata(word);

        if (this.win) this.win.style.display = 'flex';
        UIUtils.updateSharedDimmer();
        if (this.dim) UIUtils.setupQuickClose(this.dim);

        this.content.innerHTML = '<div style="text-align:center; padding:40px;"><div class="spinner" style="display:inline-block;"></div></div>';

        const data = await APIClient.fetchWordData(word);
        UIEntry.render(data, 'microContent', targetContext);
    },

    hide(fromHistory = false) {
        if (this.win) this.win.style.display = 'none';
        UIUtils.updateSharedDimmer();

        if (window.StatsManager) window.StatsManager.recordTagClose();

        TTSManager.stop();

        if (this.lastTriggerElement && typeof this.lastTriggerElement.focus === 'function') {
            const el = this.lastTriggerElement;
            // Ensure the navigator knows we want to keep keyboard state if we were tabbing
            if (window.KeyboardNavigator && window.KeyboardNavigator.isKeyboard) {
                el.focus({ preventScroll: true });
                window.KeyboardNavigator.syncSelection(el);
            } else {
                el.focus({ preventScroll: true });
            }
        }

        if (window.ScrollFixer) window.ScrollFixer.restore();
    }
};
