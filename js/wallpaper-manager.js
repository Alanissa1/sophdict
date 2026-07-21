/**
 * Wallpaper Manager for SophDict
 */
window.WallpaperManager = {
    settings: {
        blur: 0,
        fit: 'cover',
        position: 'center',
        opacity: 0.5,
        contentBlur: 12,
        contentOpacity: 0.8,
        modalBlur: 12,
        modalOpacity: 1.0,
        enabled: false
    },

    async init() {
        console.log('[Wallpaper] Initializing...');
        this.container = document.createElement('div');
        this.container.className = 'wallpaper-container';
        this.container.style.display = 'none';

        this.imgDiv = document.createElement('div');
        this.imgDiv.className = 'wallpaper-image';

        this.overlay = document.createElement('div');
        this.overlay.className = 'wallpaper-overlay';

        this.container.appendChild(this.imgDiv);
        this.container.appendChild(this.overlay);
        document.body.prepend(this.container);

        await this.loadSettings();
        await this.loadWallpaper();
    },

    async loadSettings() {
        const saved = await DBManager.get('appAssets', 'wallpaperSettings');
        if (saved) {
            this.settings = { ...this.settings, ...saved.data };
        }
    },

    async saveSettings() {
        await DBManager.put('appAssets', { id: 'wallpaperSettings', data: this.settings });
        this.applySettings();
    },

    async loadWallpaper() {
        const asset = await DBManager.get('appAssets', 'customWallpaper');
        if (asset && asset.blob) {
            const url = URL.createObjectURL(asset.blob);
            this.applyImage(url);
            this.container.style.display = 'block';
            document.getElementById('app-container').style.background = 'transparent';
            document.body.classList.add('wallpaper-active');
            this.settings.enabled = true;
        } else {
            this.container.style.display = 'none';
            document.getElementById('app-container').style.background = 'var(--bg-color)';
            document.body.classList.remove('wallpaper-active');
            this.settings.enabled = false;
        }
        this.applySettings();
    },

    applyImage(url) {
        if (this.currentUrl) URL.revokeObjectURL(this.currentUrl);
        this.currentUrl = url;
        this.imgDiv.style.backgroundImage = `url(${url})`;
    },

    applySettings() {
        if (!this.imgDiv || !this.overlay) return;

        this.imgDiv.style.filter = `blur(${this.settings.blur}px)`;
        this.imgDiv.style.backgroundSize = this.settings.fit;
        this.imgDiv.style.backgroundPosition = this.settings.position;

        // Update overlay opacity based on settings
        const isDark = document.body.classList.contains('dark-mode');
        this.overlay.style.backgroundColor = isDark
            ? `rgba(0, 0, 0, ${this.settings.opacity + 0.1})`
            : `rgba(255, 255, 255, ${this.settings.opacity})`;

        // Update Content Surface settings
        document.body.style.setProperty('--wp-content-blur', `${this.settings.contentBlur}px`);
        document.body.style.setProperty('--wp-content-bg-opacity', this.settings.contentOpacity);
        document.body.style.setProperty('--wp-modal-blur', `${this.settings.modalBlur}px`);
        document.body.style.setProperty('--wp-modal-bg-opacity', this.settings.modalOpacity);
    },

    async handleUpload(file) {
        if (!file) return;

        // Basic check for image
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        // Save to DB
        await DBManager.put('appAssets', { id: 'customWallpaper', blob: file });
        this.settings.enabled = true;
        await this.saveSettings();
        await this.loadWallpaper();
    },

    async reset() {
        await DBManager.delete('appAssets', 'customWallpaper');
        this.settings.enabled = false;
        await this.saveSettings();
        this.container.style.display = 'none';
        document.getElementById('app-container').style.background = 'var(--bg-color)';
        document.body.classList.remove('wallpaper-active');
    },

    async toggle() {
        this.settings.enabled = !this.settings.enabled;
        if (this.settings.enabled) {
            await this.loadWallpaper();
        } else {
            this.container.style.display = 'none';
            document.getElementById('app-container').style.background = 'var(--bg-color)';
            document.body.classList.remove('wallpaper-active');
        }
        await this.saveSettings();
        // Force refresh UI
        if (window.TextScaler) window.TextScaler.show();
    },

    async reset() {
        await DBManager.delete('appAssets', 'customWallpaper');
        this.currentUrl = null;
        this.imgDiv.style.backgroundImage = '';
        this.settings.enabled = false;
        await this.saveSettings();
        this.container.style.display = 'none';
        document.getElementById('app-container').style.background = 'var(--bg-color)';
        document.body.classList.remove('wallpaper-active');
    },

    renderControls(container) {
        const hasWallpaper = !!this.currentUrl || (this.imgDiv && this.imgDiv.style.backgroundImage && this.imgDiv.style.backgroundImage !== 'none');
        const html = `
            <div class="wallpaper-settings-group">
                <div class="wallpaper-settings-title">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0-33-23.5-56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z"/></svg>
                    Custom Wallpaper
                </div>

                <div class="wallpaper-control-row" style="flex-direction: row; align-items: center; gap: 12px; margin-bottom: 15px;">
                    <label class="wallpaper-upload-btn" for="wallpaperInput" style="margin-bottom: 0;">
                        Choose Image
                    </label>
                    <input type="file" id="wallpaperInput" accept="image/*" style="display:none">

                    ${hasWallpaper ? `
                        <label class="switch" style="margin: 0; transform: scale(0.85);">
                            <input type="checkbox" id="wallpaperToggle" ${this.settings.enabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <button class="wallpaper-remove-btn" onclick="window.WallpaperManager.reset()" style="margin: 0; background: none; border: none; color: #ff4b6b; cursor: pointer; font-size: 0.8em; text-decoration: underline;">Remove</button>
                    ` : ''}
                </div>

                <div class="wallpaper-control-row">
                    <label>Blur Intensity: <span id="blurVal">${this.settings.blur}px</span></label>
                    <input type="range" id="wallpaperBlur" min="0" max="20" value="${this.settings.blur}">
                </div>

                <div class="wallpaper-control-row">
                    <label>Overlay Opacity: <span id="opacityVal">${Math.round(this.settings.opacity * 100)}%</span></label>
                    <input type="range" id="wallpaperOpacity" min="0" max="0.9" step="0.05" value="${this.settings.opacity}">
                </div>

                <div class="wallpaper-control-row">
                    <label>Surface Blur: <span id="surfaceBlurVal">${this.settings.contentBlur}px</span></label>
                    <input type="range" id="surfaceBlur" min="0" max="30" value="${this.settings.contentBlur}">
                </div>

                <div class="wallpaper-control-row">
                    <label>Surface Opacity: <span id="surfaceOpVal">${Math.round(this.settings.contentOpacity * 100)}%</span></label>
                    <input type="range" id="surfaceOpacity" min="0.1" max="1" step="0.05" value="${this.settings.contentOpacity}">
                </div>

                <div class="wallpaper-control-row">
                    <label>Modal Blur: <span id="modalBlurVal">${this.settings.modalBlur}px</span></label>
                    <input type="range" id="modalBlur" min="0" max="30" value="${this.settings.modalBlur}">
                </div>

                <div class="wallpaper-control-row">
                    <label>Modal Opacity: <span id="modalOpVal">${Math.round(this.settings.modalOpacity * 100)}%</span></label>
                    <input type="range" id="modalOpacity" min="0.1" max="1" step="0.05" value="${this.settings.modalOpacity}">
                </div>

                <div class="wallpaper-control-row">
                    <label>Image Fit</label>
                    <select id="wallpaperFit">
                        <option value="cover" ${this.settings.fit === 'cover' ? 'selected' : ''}>Cover (Fill)</option>
                        <option value="contain" ${this.settings.fit === 'contain' ? 'selected' : ''}>Contain</option>
                        <option value="auto" ${this.settings.fit === 'auto' ? 'selected' : ''}>Original</option>
                    </select>
                </div>

                <div class="wallpaper-control-row">
                    <label>Position</label>
                    <select id="wallpaperPos">
                        <option value="center" ${this.settings.position === 'center' ? 'selected' : ''}>Center</option>
                        <option value="top" ${this.settings.position === 'top' ? 'selected' : ''}>Top</option>
                        <option value="bottom" ${this.settings.position === 'bottom' ? 'selected' : ''}>Bottom</option>
                        <option value="left" ${this.settings.position === 'left' ? 'selected' : ''}>Left</option>
                        <option value="right" ${this.settings.position === 'right' ? 'selected' : ''}>Right</option>
                    </select>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);

        // Attach events
        const input = document.getElementById('wallpaperInput');
        if (input) input.onchange = (e) => this.handleUpload(e.target.files[0]);

        const toggle = document.getElementById('wallpaperToggle');
        if (toggle) toggle.onchange = (e) => this.toggle();

        const blurSl = document.getElementById('wallpaperBlur');
        if (blurSl) blurSl.oninput = (e) => {
            this.settings.blur = parseInt(e.target.value);
            document.getElementById('blurVal').innerText = this.settings.blur + 'px';
            this.saveSettings();
        };

        const opSl = document.getElementById('wallpaperOpacity');
        if (opSl) opSl.oninput = (e) => {
            this.settings.opacity = parseFloat(e.target.value);
            document.getElementById('opacityVal').innerText = Math.round(this.settings.opacity * 100) + '%';
            this.saveSettings();
        };

        const sBlurSl = document.getElementById('surfaceBlur');
        if (sBlurSl) sBlurSl.oninput = (e) => {
            this.settings.contentBlur = parseInt(e.target.value);
            document.getElementById('surfaceBlurVal').innerText = this.settings.contentBlur + 'px';
            this.saveSettings();
        };

        const sOpSl = document.getElementById('surfaceOpacity');
        if (sOpSl) sOpSl.oninput = (e) => {
            this.settings.contentOpacity = parseFloat(e.target.value);
            document.getElementById('surfaceOpVal').innerText = Math.round(this.settings.contentOpacity * 100) + '%';
            this.saveSettings();
        };

        const mBlurSl = document.getElementById('modalBlur');
        if (mBlurSl) mBlurSl.oninput = (e) => {
            this.settings.modalBlur = parseInt(e.target.value);
            document.getElementById('modalBlurVal').innerText = this.settings.modalBlur + 'px';
            this.saveSettings();
        };

        const mOpSl = document.getElementById('modalOpacity');
        if (mOpSl) mOpSl.oninput = (e) => {
            this.settings.modalOpacity = parseFloat(e.target.value);
            document.getElementById('modalOpVal').innerText = Math.round(this.settings.modalOpacity * 100) + '%';
            this.saveSettings();
        };

        const fitSl = document.getElementById('wallpaperFit');
        if (fitSl) fitSl.onchange = (e) => {
            this.settings.fit = e.target.value;
            this.saveSettings();
        };

        const posSl = document.getElementById('wallpaperPos');
        if (posSl) posSl.onchange = (e) => {
            this.settings.position = e.target.value;
            this.saveSettings();
        };
    }
};
