window.LicenseManager = {
    async init() {
        // Create License Modal
        const licenseModal = document.createElement('div');
        licenseModal.id = 'licenseModal';
        licenseModal.className = 'license-modal';
        document.body.appendChild(licenseModal);

        // Create Privacy Modal
        const privacyModal = document.createElement('div');
        privacyModal.id = 'privacyModal';
        privacyModal.className = 'license-modal';
        document.body.appendChild(privacyModal);

        await this.loadContent('LICENSE', 'licenseModal', 'License Agreement');
        await this.loadContent('PRIVACY.md', 'privacyModal', 'Privacy Policy');

        // Listen for Esc key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (licenseModal.classList.contains('active')) this.hide();
                if (privacyModal.classList.contains('active')) this.hidePrivacy();
            }
        });
    },

    async loadContent(filePath, modalId, title) {
        const modal = document.getElementById(modalId);
        let content = `Loading ${title}...`;
        try {
            const resp = await fetch(filePath);
            if (resp.ok) {
                const text = await resp.text();
                content = text.split('\n\n').map(para => {
                    if (para.startsWith('# ')) return `<h2>${para.substring(2)}</h2>`;
                    if (para.startsWith('### ')) return `<h3>${para.substring(4)}</h3>`;
                    if (para.includes('Copyright') || para.includes('SophDict')) return para;
                    if (para.includes('Attributions:') || para.includes('Services:')) return `<hr style="margin: 20px 0; border: 0; border-top: 1px solid var(--border-color); opacity: 0.3;">${para}`;
                    return para;
                }).join('<br><br>').replace(/\n/g, '<br>');
            }
        } catch (e) {
            console.error(`${title} load error:`, e);
            content = `Failed to load ${title.toLowerCase()} content.`;
        }

        modal.innerHTML = `
            <div class="license-title">${title}</div>
            <div class="license-text">
                ${content}
            </div>
            <div class="license-footer">
                <button class="license-close-btn" onclick="${modalId === 'licenseModal' ? 'LicenseManager.hide()' : 'LicenseManager.hidePrivacy()'}">Close</button>
            </div>
        `;
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
    },

    showPrivacy() {
        const modal = document.getElementById('privacyModal');
        const dimmer = document.getElementById('microDimmer');
        if (modal && dimmer) {
            modal.classList.add('active');
            dimmer.style.display = 'block';
            dimmer.style.opacity = '1';
            dimmer.style.zIndex = '2900';
            document.body.classList.add('modal-open');
            UIUtils.setupQuickClose(dimmer, () => this.hidePrivacy());
        }
    },

    hidePrivacy() {
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
    document.addEventListener('DOMContentLoaded', () => window.LicenseManager.init());
} else {
    window.LicenseManager.init();
}
