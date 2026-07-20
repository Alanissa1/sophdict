window.LicenseManager = {
    init() {
        const modal = document.createElement('div');
        modal.id = 'licenseModal';
        modal.className = 'license-modal';
        modal.innerHTML = `
            <div class="license-title">License Agreement</div>
            <div class="license-text">
                <strong>Copyright (c) 2026 SophDict</strong><br><br>
                All Rights Reserved.<br><br>
                This software and all associated files are the exclusive property of SophDict.<br><br>
                Unauthorized copying, distribution, modification, public display, or performance of this software, via any medium, is strictly prohibited.<br><br>
                This code is provided for private use only. No part of this project may be reused, republished, or integrated into other software without the express written permission of the copyright holder.
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.LicenseManager.init());
} else {
    window.LicenseManager.init();
}
