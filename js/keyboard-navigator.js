window.KeyboardNavigator = {
    currentIndex: -1,
    elements: [],
    isKeyboard: false,
    targetSelector: '.tag, .tts-btn, .translate-btn, .pin-btn, button, input, textarea, a[href], .view-full-btn, .micro-close, .stats-close-btn, .reset-stats-btn, .history-list-item, .remove-history-btn, .scale-btn, .add-lang-btn, .current-lang-display, .voice-option, .lang-item, .untap-pin, .stat-card.clickable-stat, .pinned-word-link, .reset-scale-btn, .refresh-list-btn, #microDimmer',

    init() {
        document.addEventListener('keydown', (e) => {
            this.isKeyboard = true;
            if (e.key === 'Escape') {
                const pi = this.getActivePanelInfo();
                if (pi) {
                    const id = pi.panel.id;
                    if (id === 'microWindow') window.ModalManager.hide();
                    else if (id === 'statsPanel') window.StatsManager.togglePanel();
                    else if (id === 'text-scale-control') window.TextScaler.hide();
                    else if (id === 'pinnedPanel') window.AppClosePinnedPanel();
                }
            }
            if (e.key === 'Tab') {
                if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
                this.updateElements();
                if (this.elements.length > 0) {
                    e.preventDefault();
                    this.handleTab(e.shiftKey);
                }
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const s = document.getElementById('text-scale-control');
                const iso = s && s.style.display !== 'none';
                if (!iso && !(document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA'))) {
                    this.updateElements(); if (this.elements.length > 0) { e.preventDefault(); this.handleArrow(e.key === 'ArrowLeft'); }
                }
            }
            else if (e.key === ' ' || e.key === 'Enter') { this.handleSpace(e); }
        });
        document.addEventListener('focusin', (e) => this.syncSelection(e.target));

        const clearSelection = (e) => {
            this.isKeyboard = false;
            const interactive = e.target.closest(this.targetSelector);
            if (!interactive) {
                this.elements.forEach(el => {
                    if (!el.classList.contains('tag') && !el.classList.contains('tts-btn')) {
                        el.classList.remove('nav-focus');
                        el.classList.remove('nav-inactive');
                    }
                });
                const current = this.elements[this.currentIndex];
                if (current && !current.classList.contains('tag') && !current.classList.contains('tts-btn')) {
                    this.currentIndex = -1;
                }
            }
        };

        document.addEventListener('touchstart', clearSelection, { passive: true });
        document.addEventListener('mousedown', clearSelection);
    },

    syncSelection(el) {
        this.updateElements();
        let t = el; if (t && !this.elements.includes(t)) t = t.closest(this.targetSelector);

        // Always clear all existing highlights when changing selection
        document.querySelectorAll('.nav-focus, .nav-inactive').forEach(i => {
            i.classList.remove('nav-focus');
            i.classList.remove('nav-inactive');
        });

        const idx = this.elements.indexOf(t);
        const pi = this.getActivePanelInfo();
        const ap = pi?.panel;

        if (idx !== -1) {
            this.currentIndex = idx;
            const tr = pi?.trigger;

            // If a panel is open, the trigger should show it is active (e.g. stats button)
            if (ap && tr) {
                tr.classList.add('nav-focus');
                if (document.activeElement !== tr) tr.classList.add('nav-inactive');
            }

            // Highlight the current element if it's a keyboard action OR a persistent selectable like a tag/tts/translate btn
            if (this.isKeyboard || (t && (t.classList.contains('tag') || t.classList.contains('tts-btn') || t.classList.contains('translate-btn')))) {
                // Only highlight if it belongs to the active panel or there is no panel
                if (!ap || (t && (ap.contains(t) || t.id === 'microDimmer')) || t === tr) {
                    if (t) t.classList.add('nav-focus');
                }
            } else if (document.activeElement === t && (t.classList.contains('tag') || t.classList.contains('tts-btn') || t.classList.contains('translate-btn'))) {
                // Force highlight for tags/tts-btns/translate-btns even if not in keyboard mode, as long as they are focused
                t.classList.add('nav-focus');
            }
        } else if (ap && (el === ap || ap.contains(el))) {
            this.currentIndex = -1;
        }
    },

    getActivePanelInfo() {
        const p = [{ id: 'microWindow', trigger: window.ModalManager ? window.ModalManager.lastTriggerElement : null }, { id: 'statsPanel', trigger: document.getElementById('statsToggleBtn') }, { id: 'text-scale-control', trigger: document.getElementById('textScaleToggleBtn') }, { id: 'pinnedPanel', trigger: document.getElementById('pinnedToggleBtn') }];
        for (const i of p) { const el = document.getElementById(i.id); if (el && el.style.display !== 'none' && el.style.display !== '') return { panel: el, trigger: i.trigger }; }
        return null;
    },

    updateElements() {
        const pi = this.getActivePanelInfo();
        const ap = pi?.panel;
        let raw = [];
        if (ap) {
            const tr = pi.trigger, md = document.getElementById('microDimmer');
            raw = Array.from(ap.querySelectorAll(this.targetSelector));
            if (md && md.style.display !== 'none') raw.push(md);
            if (tr) raw.push(tr);
        } else raw = Array.from(document.querySelectorAll(this.targetSelector));
        this.elements = raw.filter(el => {
            const s = window.getComputedStyle(el);
            const isv = s.display !== 'none' && s.visibility !== 'hidden' && (el.offsetParent !== null || el.id === 'microDimmer' || (ap && el === pi.trigger));
            if (!isv) return false;
            if (!el.hasAttribute('tabindex') && !['BUTTON', 'INPUT', 'TEXTAREA'].includes(el.tagName)) el.setAttribute('tabindex', '0');
            return true;
        });
        const aidx = this.elements.indexOf(document.activeElement);
        if (aidx !== -1) this.currentIndex = aidx;
    },

    handleTab(rev) {
        this.updateElements(); if (this.elements.length === 0) return;
        this.currentIndex = rev ? (this.currentIndex <= 0 ? this.elements.length - 1 : this.currentIndex - 1) : (this.currentIndex >= this.elements.length - 1 ? 0 : this.currentIndex + 1);
        const t = this.elements[this.currentIndex]; t.focus(); t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    handleArrow(rev) {
        if (this.elements.length === 0) return;
        this.currentIndex = rev ? (this.currentIndex <= 0 ? this.elements.length - 1 : this.currentIndex - 1) : (this.currentIndex >= this.elements.length - 1 ? 0 : this.currentIndex + 1);
        const t = this.elements[this.currentIndex]; t.focus(); if (t.offsetParent !== null) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const ap = this.getActivePanelInfo()?.panel; if (ap && t.classList.contains('tag') && !ap.contains(t)) t.click();
    },

    handleSpace(e) {
        const f = document.activeElement, pi = this.getActivePanelInfo();
        if (f && (f.tagName === 'INPUT' || f.tagName === 'TEXTAREA')) return;
        if (pi) {
            if (this.currentIndex === -1 || f === pi.panel || f === pi.trigger || !pi.panel.contains(f)) {
                e.preventDefault();
                const id = pi.panel.id;
                if (id === 'microWindow') window.ModalManager.hide();
                else if (id === 'statsPanel') window.StatsManager.togglePanel();
                else if (id === 'text-scale-control') window.TextScaler.hide();
                else if (id === 'pinnedPanel') window.AppClosePinnedPanel();
                return;
            }
        }
        if (f && this.elements.includes(f)) { e.preventDefault(); f.click(); }
    }
};
