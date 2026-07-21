/**
 * Wallpaper Manager for SophDict
 */
window.WallpaperManager = {
    settings: {
        blur: 0,
        fit: 'cover',
        position: 'center',
        opacity: 0.5,
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
            this.settings.enabled = true;
        } else {
            this.container.style.display = 'none';
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
        this.imgDiv.style.filter = `blur(${this.settings.blur}px)`;
        this.imgDiv.style.backgroundSize = this.settings.fit;
        this.imgDiv.style.backgroundPosition = this.settings.position;

        // Update overlay opacity based on settings
        // Note: Theme manager handles the base color, we just adjust the alpha
        const isDark = document.body.classList.contains('dark-mode');
        this.overlay.style.backgroundColor = isDark
            ? `rgba(0, 0, 0, ${this.settings.opacity + 0.1})`
            : `rgba(255, 255, 255, ${this.settings.opacity})`;
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
    },

    renderControls(container) {
        const html = `
            <div class="wallpaper-settings-group">
                <div class="wallpaper-settings-title">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0-33-23.5-56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z"/></svg>
                    Custom Wallpaper
                </div>

                <div class="wallpaper-control-row">
                    <label class="wallpaper-upload-btn" for="wallpaperInput">
                        Choose Image
                    </label>
                    <input type="file" id="wallpaperInput" accept="image/*" style="display:none">
                    ${this.settings.enabled ? `<button class="wallpaper-reset-btn" onclick="WallpaperManager.reset()">Remove Wallpaper</button>` : ''}
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
