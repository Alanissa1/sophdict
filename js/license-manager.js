window.LicenseManager = {
    content: '',
    async init() {
        const modal = document.createElement('div');
        modal.id = 'licenseModal';
        modal.className = 'license-modal';

        let licenseContent = 'Loading license...';
        try {
            const resp = await fetch('LICENSE');
            if (resp.ok) {
                const text = await resp.text();
                this.content = text.split('\n\n').map(para => {
                    if (para.includes('Copyright')) return para;
                    if (para.includes('Word List Attributions:') || para.includes('Data and Service Attributions:')) return `<hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--border-color); opacity: 0.3;">${para}`;
                    return para;
                }).join('<br><br>').replace(/\n/g, '<br>');
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
                this.content = text.split('\n\n').map(para => {
                    if (para.includes('SophDict')) return para;
                    if (para.includes('Services:') || para.includes('Attributions:')) return `<hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--border-color); opacity: 0.3;">${para}`;
                    return para;
                }).join('<br><br>').replace(/\n/g, '<br>');
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
