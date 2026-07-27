window.VideoExplanationManager = {
    videoUrl: 'https://youtu.be/sbjy6xYVDtk?si=x52gaIKE-SxXTC_e', // TODO: Replace with actual tutorial video URL
    init() {
        if (localStorage.getItem('sophdict_video_seen')) return;

        const modal = document.createElement('div');
        modal.id = 'videoModal';
        modal.className = 'license-modal'; // Use existing styles from license.css

        modal.innerHTML = `
            <div class="license-title">Welcome to SophDict!</div>
            <div id="videoContent" class="license-text" style="padding: 0; overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center; min-height: 225px;">
                <iframe width="100%" height="225" src="${this.videoUrl}" title="SophDict Tutorial" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
            <div class="license-footer">
                <button class="license-close-btn" onclick="VideoExplanationManager.hide()">Start Exploring</button>
            </div>
        `;
        document.body.appendChild(modal);

        // Add some specific styling for video modal
        const style = document.createElement('style');
        style.textContent = `
            #videoModal {
                width: 500px !important;
                max-width: 95% !important;
                height: auto !important;
                max-height: 90vh !important;
            }
            #videoModal .license-text {
                padding: 0 !important;
            }
        `;
        document.head.appendChild(style);

        // Auto-show after a short delay
        setTimeout(() => this.show(), 1500);
    },

    show() {
        const modal = document.getElementById('videoModal');
        const dimmer = document.getElementById('microDimmer');
        if (modal && dimmer) {
            modal.classList.add('active');
            if (window.UIUtils) {
                window.UIUtils.updateSharedDimmer();
                window.UIUtils.setupQuickClose(dimmer, () => this.hide());
            } else {
                dimmer.style.display = 'block';
                dimmer.style.opacity = '1';
                dimmer.style.zIndex = '2900';
                document.body.classList.add('modal-open');
            }
        }
    },

    hide() {
        const modal = document.getElementById('videoModal');
        if (modal) {
            modal.classList.remove('active');
            // Stop video by resetting src
            const iframe = modal.querySelector('iframe');
            if (iframe) {
                const src = iframe.src;
                iframe.src = '';
                iframe.src = src;
            }
            localStorage.setItem('sophdict_video_seen', 'true');
            if (window.UIUtils) {
                window.UIUtils.updateSharedDimmer();
            } else {
                const dimmer = document.getElementById('microDimmer');
                if (dimmer) dimmer.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        }
    }
};

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.VideoExplanationManager.init());
} else {
    window.VideoExplanationManager.init();
}
