window.LicenseManager = {
    content: '',
    formatContent(text) {
        if (!text) return '';
        return text
            .replace(/^# (.*$)/gm, '<h1 style="margin: 0 0 15px 0; font-size: 1.5rem;">$1</h1>')
            .replace(/^## (.*$)/gm, '<h2 style="margin: 20px 0 10px 0; font-size: 1.25rem;">$1</h2>')
            .replace(/^### (.*$)/gm, '<h3 style="margin: 15px 0 10px 0; font-size: 1.1rem; color: var(--primary-color);">$1</h3>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/^\* (.*$)/gm, '<div style="margin-left: 10px; margin-bottom: 5px; display: flex; gap: 8px;"><span>•</span><span>$1</span></div>')
            .split('\n\n').map(para => {
                if (para.trim().startsWith('<h') || para.trim().startsWith('<div')) return para;
                return `<p style="margin-bottom: 15px;">${para.replace(/\n/g, '<br>')}</p>`;
            }).join('');
    },

    async init() {
        const modal = document.createElement('div');
        modal.id = 'licenseModal';
        modal.className = 'license-modal';

        let licenseContent = 'Loading license...';
        try {
            const resp = await fetch('LICENSE');
            if (resp.ok) {
                const text = await resp.text();
                this.content = this.formatContent(text);
                licenseContent = this.content;
            }
        } catch (e) {
            console.error('License load error:', e);
            licenseContent = 'Failed to load license content.';
        }

        modal.innerHTML = `
            <div class="license-title">License Agreement</div>
            <div id="licenseTextContent" class="license-text">
                ${licenseContent}
            </div>
            <div class="license-footer" style="display: none;"></div>
        `;
        document.body.appendChild(modal);

        // Listen for Esc key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.hide();
            }
        });
    },

    show() {
        const modal = document.getElementById('licenseModal');
        const dimmer = document.getElementById('microDimmer');
        if (modal && dimmer) {
            modal.querySelector('.license-title').innerText = 'License Agreement';
            modal.querySelector('#licenseTextContent').innerHTML = this.content;
            modal.classList.add('active');
            dimmer.style.display = 'block';
            dimmer.style.opacity = '1';
            dimmer.style.zIndex = '2900';
            document.body.classList.add('modal-open');
            UIUtils.setupQuickClose(dimmer, () => this.hide());
        }
    },

    hide() {
        const modal = document.getElementById('licenseModal');
        const dimmer = document.getElementById('microDimmer');
        if (modal && dimmer) {
            modal.classList.remove('active');
            dimmer.style.display = 'none';
            dimmer.style.zIndex = '';
            document.body.classList.remove('modal-open');
        }
    }
};

window.PrivacyManager = {
    content: '',
    async init() {
        try {
            const resp = await fetch('PRIVACY.md');
            if (resp.ok) {
                const text = await resp.text();
                this.content = LicenseManager.formatContent(text);
            }
        } catch (e) {
            console.error('Privacy load error:', e);
            this.content = 'Failed to load privacy policy.';
        }
    },

    show() {
        const modal = document.getElementById('licenseModal');
        const dimmer = document.getElementById('microDimmer');
        if (modal && dimmer) {
            modal.querySelector('.license-title').innerText = 'Privacy Policy';
            modal.querySelector('#licenseTextContent').innerHTML = this.content;
            modal.classList.add('active');
            dimmer.style.display = 'block';
            dimmer.style.opacity = '1';
            dimmer.style.zIndex = '2900';
            document.body.classList.add('modal-open');
            UIUtils.setupQuickClose(dimmer, () => this.hide());
        }
    },

    hide() {
        LicenseManager.hide();
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.LicenseManager.init();
        window.PrivacyManager.init();
    });
} else {
    window.LicenseManager.init();
    window.PrivacyManager.init();
}
