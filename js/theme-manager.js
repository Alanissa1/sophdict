window.ThemeManager = {
    currentTheme: 'system',

    init() {
        this.currentTheme = localStorage.getItem('appTheme') || 'system';
        this.applyTheme(this.currentTheme);
        this.renderToggle();

        // Listen for system theme changes if in 'system' mode
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (this.currentTheme === 'system') {
                this.applyTheme('system');
            }
        });
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        let isDark = false;
        if (theme === 'dark') {
            isDark = true;
        } else if (theme === 'system') {
            // Try Android interface first if available
            if (window.AndroidTTS && typeof window.AndroidTTS.isSystemDarkMode === 'function') {
                isDark = window.AndroidTTS.isSystemDarkMode();
            } else {
                isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }
        }

        if (isDark) {
            document.body.classList.add('dark-mode');
            if (window.AndroidTTS && typeof window.AndroidTTS.updateStatusBar === 'function') {
                window.AndroidTTS.updateStatusBar("#1e1e1e", false); // Dark card bg, light icons
            }
        } else {
            document.body.classList.remove('dark-mode');
            if (window.AndroidTTS && typeof window.AndroidTTS.updateStatusBar === 'function') {
                window.AndroidTTS.updateStatusBar("#ffffff", true); // Light card bg, dark icons
            }
        }

        if (window.WallpaperManager && window.WallpaperManager.applySettings) {
            window.WallpaperManager.applySettings();
        }
    },

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('appTheme', theme);
        this.applyTheme(theme);
        this.updateUI();
    },

    renderToggle() {
        const container = document.getElementById('theme-settings-container');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-section theme-settings">
                <div style="font-weight:bold; color:var(--text-main); font-size:14px; margin-top:10px; margin-bottom:4px;">Appearance</div>
                <div class="theme-options">
                    <button class="theme-btn" data-theme="light">Light</button>
                    <button class="theme-btn" data-theme="dark">Dark</button>
                    <button class="theme-btn" data-theme="system">System</button>
                </div>
            </div>
        `;

        container.querySelectorAll('.theme-btn').forEach(btn => {
            btn.onclick = () => this.setTheme(btn.dataset.theme);
        });

        this.updateUI();
    },

    updateUI() {
        const btns = document.querySelectorAll('.theme-btn');
        btns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.currentTheme);
        });
    }
};
