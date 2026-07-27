window.LicenseManager = {
    async init() {
        const modal = document.createElement('div');
        modal.id = 'licenseModal';
        modal.className = 'license-modal';

        let licenseContent = 'Loading license...';
        try {
            const resp = await fetch('LICENSE');
            if (resp.ok) {
                const text = await resp.text();
                licenseContent = text.split('\n\n').map(para => {
                    if (para.includes('Copyright')) return para;
                    if (para.includes('Word List Attributions:')) return `<hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--border-color); opacity: 0.3;">${para}`;
                    return para;
                }).join('<br><br>').replace(/\n/g, '<br>');
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
            <div class="license-footer">
                <button class="license-close-btn" onclick="LicenseManager.hide()">Close</button>
            </div>
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
    async init() {
        const modal = document.createElement('div');
        modal.id = 'privacyModal';
        modal.className = 'license-modal';

        let privacyContent = 'Loading privacy policy...';
        try {
            const resp = await fetch('PRIVACY.md');
            if (resp.ok) {
                const text = await resp.text();
                privacyContent = text.split('\n\n').map(para => {
                    if (para.includes('SophDict')) return para;
                    if (para.includes('Services:') || para.includes('Attributions:')) return `<hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--border-color); opacity: 0.3;">${para}`;
                    return para;
                }).join('<br><br>').replace(/\n/g, '<br>');
            }
        } catch (e) {
            console.error('Privacy load error:', e);
            privacyContent = 'Failed to load privacy policy.';
        }

        modal.innerHTML = `
            <div class="license-title">Privacy Policy</div>
            <div id="privacyTextContent" class="license-text">
                ${privacyContent}
            </div>
            <div class="license-footer">
                <button class="license-close-btn" onclick="PrivacyManager.hide()">Close</button>
            </div>
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
        const modal = document.getElementById('privacyModal');
        const dimmer = document.getElementById('microDimmer');
        if (modal && dimmer) {
            modal.classList.add('active');
            dimmer.style.display = 'block';
            dimmer.style.opacity = '1';
            dimmer.style.zIndex = '2900';
            document.body.classList.add('modal-open');
            UIUtils.setupQuickClose(dimmer, () => this.hide());
        }
    },

    hide() {
        const modal = document.getElementById('privacyModal');
        const dimmer = document.getElementById('microDimmer');
        if (modal && dimmer) {
            modal.classList.remove('active');
            dimmer.style.display = 'none';
            dimmer.style.zIndex = '';
            document.body.classList.remove('modal-open');
        }
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
