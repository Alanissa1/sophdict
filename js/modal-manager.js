window.ModalManager = {
    win: null,
    dim: null,
    content: null,
    settings: {
        slidingEnabled: false
    },

    lastTriggerElement: null,

    init() {
        this.win = document.getElementById('microWindow');
        this.dim = document.getElementById('microDimmer');
        this.content = document.getElementById('microContent');

        const saved = localStorage.getItem('modalSettings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) {}
        }
        this.applySettings();

        const closeBtn = document.querySelector('.micro-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.hide();
        }
    },

    applySettings() {
        if (!this.win) this.win = document.getElementById('microWindow');
        if (!this.win) return;

        if (this.settings.slidingEnabled) {
            this.win.classList.add('sliding-enabled');
            this.win.style.display = 'flex'; // Needed for transition to work from hidden state
        } else {
            this.win.classList.remove('sliding-enabled');
            this.win.classList.remove('show');
            this.win.style.display = 'none';
        }
    },

    toggleSliding(enabled) {
        this.settings.slidingEnabled = enabled;
        localStorage.setItem('modalSettings', JSON.stringify(this.settings));
        this.applySettings();
    },

    async show(word, targetContext = null, isHistoryNav = false) {
        if (!this.win || !this.dim) this.init();

        this.lastTriggerElement = document.activeElement;

        if (window.ScrollFixer) window.ScrollFixer.save();
        if (window.StatsManager) window.StatsManager.recordTagOpen(word);

        if (window.updateMetadata) window.updateMetadata(word);

        // Pre-render header with word to ensure it shows even if offline/loading
        const headerTop = document.querySelector('.micro-header-top');
        if (headerTop) {
            headerTop.innerHTML = `
                <div class="micro-pron-row" style="flex-shrink: 0; display: flex; align-items: center;"></div>
                <div style="display: flex; flex-direction: column; min-width: 0; flex: 1; overflow-x: auto; overflow-y: hidden;">
                    <div style="display: flex; width: max-content;">
                        <h2 class="micro-title" style="margin:0; line-height:1.2;">${word}</h2>
                    </div>
                    <div style="display: flex; gap: 5px; font-size: 0.9em; width: max-content;">
                        <span class="micro-pronunciation" style="line-height:1.2;">//</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap: 8px; flex-shrink: 0; margin-left: 10px;">
                    <div id="microPin"></div>
                </div>
            `;
            const pronRow = headerTop.querySelector('.micro-pron-row');
            if (pronRow && window.TTSManager) pronRow.appendChild(TTSManager.createButton(word));
        }

        const oldTitleRow = document.querySelector('.micro-title-row');
        if (oldTitleRow) oldTitleRow.style.display = 'none';
        const mInfo = document.getElementById('microInfo');
        if (mInfo) mInfo.style.display = 'none';

        if (this.settings.slidingEnabled) {
            this.win.classList.add('show');
        } else {
            if (this.win) this.win.style.display = 'flex';
        }

        UIUtils.updateSharedDimmer();
        if (this.dim) UIUtils.setupQuickClose(this.dim);

        this.content.innerHTML = '<div style="text-align:center; padding:40px;"><div class="spinner" style="display:inline-block;"></div></div>';

        const data = await APIClient.fetchWordData(word);
        UIEntry.render(data, 'microContent', targetContext);
    },

    hide(fromHistory = false) {
        if (this.settings.slidingEnabled) {
            this.win.classList.remove('show');
        } else {
            if (this.win) this.win.style.display = 'none';
        }

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
