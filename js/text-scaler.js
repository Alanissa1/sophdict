window.TextScaler = {
    scale: 1.0,
    minScale: 0.5,
    maxScale: 3.0,
    step: 0.1,
    voices: [],
    addedLocales: [],
    currentVoiceName: '',
    speechRate: 1.0,

    loadAllFromCache() {
        try {
            const voices = localStorage.getItem('cached_voices');
            if (voices) this.voices = JSON.parse(voices);

            const added = localStorage.getItem('addedLocales') || localStorage.getItem('cached_added_locales');
            if (added) this.addedLocales = JSON.parse(added);

            const voiceName = localStorage.getItem('selectedVoice');
            if (voiceName) this.currentVoiceName = voiceName;

            const rate = localStorage.getItem('speechRate');
            if (rate) this.speechRate = parseFloat(rate);
        } catch (e) { console.error("Cache load error", e); }
    },

    init() {
        let savedScale = localStorage.getItem('fontScale');
        if (savedScale) {
            this.scale = parseFloat(savedScale);
        } else {
            this.scale = 1.0;
            localStorage.setItem('fontScale', this.scale.toFixed(2));
        }

        // 1. Load data from cache first for instant UI
        this.loadAllFromCache();

        // 2. Apply visual styles
        this.apply();

        // 3. Setup UI structure
        this.renderUI();

        // 4. Aggressive bridge connection check (Retry for 5 seconds)
        let retryCount = 0;
        const maxRetries = 10;
        const checkBridge = () => {
            if (this.voices.length > 0 && retryCount > 0) {
                // We already have voices (either from cache or previous retry),
                // but let's do one fresh load if we just connected to bridge
                this.loadTTSData();
                return;
            }

            if (window.AndroidTTS || (window.speechSynthesis && window.speechSynthesis.getVoices().length > 0)) {
                this.loadTTSData();
                if (this.voices.length > 0) return; // Success
            }

            if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(checkBridge, 500);
            }
        };
        checkBridge();

        if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => this.loadTTSData();
        }

        // Initial launch pulse
        const hasPulsed = localStorage.getItem('hasPulsed');
        if (!hasPulsed) {
            setTimeout(() => {
                this.update(0.95);
                setTimeout(() => {
                    this.update(1.00);
                    localStorage.setItem('hasPulsed', 'true');
                }, 100);
            }, 500);
        }

        // 5. Floating translation hint for first time users
        setTimeout(() => this.showFloatingHint(), 2000);
    },

    showFloatingHint() {
        const dismissed = localStorage.getItem('translation_floating_dismissed');
        const isEnabled = window.TranslationManager && window.TranslationManager.isEnabled;
        if (dismissed || isEnabled) return;

        const sysLangFull = navigator.language || 'en';
        const sysLangCode = sysLangFull.split('-')[0];

        let targetLangName = 'your language';
        try {
            if (window.Intl && Intl.DisplayNames) {
                targetLangName = new Intl.DisplayNames([sysLangCode], { type: 'language' }).of(sysLangCode);
            }
        } catch (e) {}

        const hints = {
            en: `Tip: You can enable translation to <b>{lang}</b> in settings.`,
            tr: `İpucu: Ayarlardan <b>{lang}</b> diline çeviriyi etkinleştirebilirsiniz.`,
            es: `Sugerencia: Puedes activar la traducción a <b>{lang}</b> en ajustes.`,
            fr: `Conseil : Activez la traduction en <b>{lang}</b> dans les paramètres.`,
            de: `Tipp: In den Einstellungen können Sie die Übersetzung ins <b>{lang}</b> aktivieren.`,
            hi: `सुझाव: आप सेटिंग्स में <b>{lang}</b> में अनुवाद सक्षम कर सकते हैं।`,
            it: `Suggerimento: Nelle impostazioni puoi attivare la traduzione in <b>{lang}</b>.`,
            pt: `Dica: Você pode ativar a tradução para <b>{lang}</b> nas configurações.`,
            ru: `Совет: в настройках можно включить перевод на <b>{lang}</b>.`,
            ja: `ヒント：設定で<b>{lang}</b>への翻訳を有効にできます。`,
            ko: `팁: 설정에서 <b>{lang}</b>(으)로의 번역을 활성화할 수 있습니다.`,
            zh: `提示：您可以在设置中启用<b>{lang}</b>翻译。`,
            ar: `تلميح: يمكنك تمكين الترجمة إلى <b>{lang}</b> من الإعدادات.`,
            bn: `পরামর্শ: আপনি সেটিংসে <b>{lang}</b>-এ অনুবাদ সক্ষম করতে পারেন।`,
            id: `Tip: Anda dapat mengaktifkan terjemahan ke <b>{lang}</b> di pengaturan.`,
            vi: `Mẹo: Bạn có thể bật dịch sang <b>{lang}</b> trong phần cài đặt.`,
            nl: `Tip: Schakel vertaling naar het <b>{lang}</b> in bij instellingen.`,
            pl: `Wskazówka: W ustawieniach możesz włączyć tłumaczenie na język <b>{lang}</b>.`,
            th: `เคล็ดลับ: เปิดการแปลเป็น<b>{lang}</b>ได้ในตั้งค่า`,
            tl: `Tip: I-enable ang pagsasalin sa <b>{lang}</b> sa settings.`,
            uk: `Порада: у налаштуваннях можна увімкнути переклад на <b>{lang}</b>.`,
            fa: `نکته: در تنظیمات می‌توانید ترجمه به <b>{lang}</b> را فعال کنید.`,
            ro: `Sfat: Activați traducerea în <b>{lang}</b> din setări.`,
            el: `Συμβουλή: Στις ρυθμίσεις μπορείτε να ενεργοποιήσετε τη μετάφραση στα <b>{lang}</b>.`,
            hu: `Tipp: A beállításokban engedélyezheti a fordítást <b>{lang}</b> nyelvre.`
        };

        const hintTemplate = hints[sysLangCode] || hints.en;
        const hintText = hintTemplate.replace('{lang}', targetLangName);

        const floating = document.createElement('div');
        floating.className = 'floating-hint';
        floating.innerHTML = `
            <span>${hintText}</span>
            <span style="font-weight:bold; margin-left:10px; opacity:0.8;">&times;</span>
        `;

        floating.onclick = () => {
            localStorage.setItem('translation_floating_dismissed', 'true');
            floating.style.opacity = '0';
            setTimeout(() => floating.remove(), 300);
            this.show(); // Lead them to settings
        };

        document.body.appendChild(floating);

        // Auto remove after 8 seconds
        setTimeout(() => {
            if (floating.parentNode) {
                localStorage.setItem('translation_floating_dismissed', 'true');
                floating.style.opacity = '0';
                setTimeout(() => floating.remove(), 300);
            }
        }, 8000);
    },

    loadTTSData() {
        if (window.AndroidTTS) {
            try {
                const voicesJson = window.AndroidTTS.getVoicesJson();
                if (!voicesJson || voicesJson === "[]") return;

                const parsedVoices = JSON.parse(voicesJson);
                if (parsedVoices && parsedVoices.length > 0) {
                    this.voices = parsedVoices;
                    const localesJson = window.AndroidTTS.getAddedLocales();
                    this.addedLocales = JSON.parse(localesJson || "[]");
                    this.currentVoiceName = window.AndroidTTS.getSelectedVoiceName() || '';
                    this.speechRate = window.AndroidTTS.getSpeechRate() || 1.0;

                    // Update Cache
                    localStorage.setItem('cached_voices', JSON.stringify(this.voices));
                    localStorage.setItem('cached_added_locales', JSON.stringify(this.addedLocales));
                    localStorage.setItem('selectedVoice', this.currentVoiceName);
                    localStorage.setItem('speechRate', this.speechRate);

                    this.updateUI(); // Centralized UI update
                    this.cacheFullLanguageList();
                }
            } catch (e) {
                console.error("TTS Error:", e);
            }
        } else if (window.speechSynthesis) {
            // Fallback for Windows/Browser
            let browserVoices = window.speechSynthesis.getVoices();

            // On Android browsers, voices might be empty initially. Use common defaults as fallback.
            if (browserVoices.length === 0 && this.voices.length === 0) {
                this.voices = [
                    { name: 'en-US', locale: 'en-US', display: 'English (US)' },
                    { name: 'en-GB', locale: 'en-GB', display: 'English (UK)' },
                    { name: 'es-ES', locale: 'es-ES', display: 'Spanish' },
                    { name: 'fr-FR', locale: 'fr-FR', display: 'French' },
                    { name: 'hi-IN', locale: 'hi-IN', display: 'Hindi' }
                ];
            } else if (browserVoices.length > 0) {
                this.voices = browserVoices.map(v => ({
                    name: v.name,
                    locale: v.lang.replace('_', '-'), // Normalize codes (en_US -> en-US)
                    display: v.name
                }));
            }

            if (this.voices.length > 0) {
                // Mock added locales for browser if none
                if (this.addedLocales.length === 0) {
                    const savedAdded = localStorage.getItem('addedLocales');
                    if (savedAdded) {
                        this.addedLocales = JSON.parse(savedAdded);
                    } else {
                        // Default to en-US if available
                        const enUs = this.voices.find(v => v.locale === 'en-US' || v.locale === 'en_US');
                        this.addedLocales = [enUs ? enUs.locale : this.voices[0].locale];
                    }

                    const savedVoice = localStorage.getItem('selectedVoice');
                    if (savedVoice) {
                        this.currentVoiceName = savedVoice;
                    } else {
                        const enUsVoice = this.voices.find(v => v.locale === 'en-US' || v.locale === 'en_US');
                        this.currentVoiceName = enUsVoice ? enUsVoice.name : this.voices[0].name;
                    }
                    this.speechRate = parseFloat(localStorage.getItem('speechRate')) || 1.0;
                }
                this.renderLanguageSection();
                this.cacheFullLanguageList();

                // Update Cache
                localStorage.setItem('cached_voices', JSON.stringify(this.voices));
                localStorage.setItem('addedLocales', JSON.stringify(this.addedLocales));
                localStorage.setItem('selectedVoice', this.currentVoiceName);
                localStorage.setItem('speechRate', this.speechRate);
            }
        }
    },

    cacheFullLanguageList() {
        if (this.voices.length === 0) return;
        const locales = {};
        this.voices.forEach(v => { if (!locales[v.locale]) locales[v.locale] = v.display; });
        const sorted = Object.entries(locales).sort((a, b) => a[1].localeCompare(b[1]));

        const html = sorted.map(([tag, name]) => `
            <div class="lang-item" onclick="window.TextScaler.addAndSelectLanguage('${tag}')">${name}</div>
        `).join('');

        localStorage.setItem('cached_language_list', html);
        this.loadCachedLanguageList();
    },

    loadCachedLanguageList() {
        const cached = localStorage.getItem('cached_language_list');
        const content = document.querySelector('#fullLangList .lang-list-content');
        if (cached && content) {
            content.innerHTML = cached;
        }
    },

    show() {
        document.getElementById('scaleDimmer').style.display = 'block';
        document.getElementById('text-scale-control').style.display = 'flex';
        document.body.classList.add('modal-open');
        window.history.pushState({ settings: true }, "");
        this.updateUI();

        // 5. Setup Translation Section
        this.renderTranslationSection();

        // If open and still no voices, try to load once
        if (this.voices.length === 0) {
            this.loadTTSData();
        }
    },

    hide() {
        document.getElementById('scaleDimmer').style.display = 'none';
        document.getElementById('text-scale-control').style.display = 'none';
        document.getElementById('fullLangList').classList.remove('show');
        document.getElementById('removeLangList').classList.remove('show');
        document.body.classList.remove('modal-open');
        if (window.history.state?.settings) {
            window.history.back();
        }
    },

    update(newScale) {
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
        this.apply();
        localStorage.setItem('fontScale', this.scale.toFixed(2));
        this.updateUI();
        this.renderTranslationSection();
    },

    apply() {
        document.documentElement.style.setProperty('--font-scale', this.scale.toFixed(2));
    },

    updateUI() {
        const label = document.querySelector('.scale-label');
        const range = document.getElementById('scaleRange');
        if (label) label.innerText = Math.round(this.scale * 100) + "%";
        if (range) range.value = Math.round(this.scale * 100);

        const speedLabel = document.querySelector('.speed-label');
        const speedRange = document.getElementById('speedRange');
        if (speedLabel) speedLabel.innerText = this.speechRate.toFixed(1) + "x";
        if (speedRange) speedRange.value = Math.round(this.speechRate * 10);

        this.renderLanguageSection();
    },

    updateSpeed(newRate) {
        this.speechRate = Math.max(0.5, Math.min(2.0, newRate));
        if (window.AndroidTTS) {
            window.AndroidTTS.setSpeechRate(this.speechRate);
        } else {
            localStorage.setItem('speechRate', this.speechRate);
            if (window.TTSManager) window.TTSManager.stop();
        }
        this.updateUI();
    },

    renderLanguageSection() {
        const container = document.getElementById('language-section-container');
        if (!container) return;

        if (this.voices.length === 0) {
            container.innerHTML = `<div class="settings-section-divider"></div><div style="text-align:center; padding:10px; color:gray; font-size:12px;">Loading voices...</div>`;
            return;
        }

        const languagesToShow = [];
        const seenLocales = new Set();

        this.addedLocales.forEach(loc => {
            const firstVoiceMatch = this.voices.find(v => v.locale === loc);
            if (firstVoiceMatch && !seenLocales.has(loc)) {
                languagesToShow.push({
                    locale: loc,
                    display: firstVoiceMatch.display
                });
                seenLocales.add(loc);
            }
        });

        if (languagesToShow.length === 0) {
            const currentVoice = this.voices.find(v => v.name === this.currentVoiceName) || this.voices[0];
            if (currentVoice) languagesToShow.push({ locale: currentVoice.locale, display: currentVoice.display });
        }

        const currentSelectedLocale = this.voices.find(v => v.name === this.currentVoiceName)?.locale;

        // Sort: Selected language at top
        languagesToShow.sort((a, b) => (a.locale === currentSelectedLocale ? -1 : b.locale === currentSelectedLocale ? 1 : 0));

        container.innerHTML = `
            <div class="settings-section-divider"></div>
            <div style="font-weight:bold; color:var(--text-main); font-size:14px; margin-bottom:1px;">Languages</div>
            <div id="added-languages-list">
                ${languagesToShow.map(lang => {
                    const isCurrentLang = currentSelectedLocale === lang.locale;
                    const langVoices = this.voices.filter(v => v.locale === lang.locale);
                    const currentVoiceInLang = this.voices.find(v => v.name === this.currentVoiceName);
                    const voiceIndex = isCurrentLang ? (langVoices.findIndex(v => v.name === currentVoiceInLang.name) + 1) : 1;

                    return `
                        <div class="language-item-row">
                            <div class="current-lang-display" onclick="window.TextScaler.toggleVoiceList('${lang.locale}')" style="${isCurrentLang ? 'border: 2px solid var(--primary-color); background: #e8f0fe;' : ''}">
                                <span>${lang.display} (Voice ${voiceIndex}) ${isCurrentLang ? '<b>[Selected]</b>' : ''}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>
                            </div>
                            <div class="voice-list-container" id="voiceList-${lang.locale.replace(/-/g, '_')}">
                                ${langVoices.map((v, i) => `
                                    <div class="voice-option ${v.name === this.currentVoiceName ? 'active' : ''}" onclick="window.TextScaler.selectVoice('${v.name}')">
                                        Voice ${i + 1} ${v.name === this.currentVoiceName ? '(Current)' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div style="display:flex; gap:10px;">
                <button class="add-lang-btn" style="flex:1;" onclick="window.TextScaler.showAllLanguages()">+ Add Language</button>
                <button class="add-lang-btn" style="flex:1; border-color:#ff4b6b; color:#ff4b6b;" onclick="window.TextScaler.showRemoveLanguages()">- Remove Language</button>
            </div>
        `;
    },

    toggleVoiceList(locale) {
        const id = `voiceList-${locale.replace(/-/g, '_')}`;
        const el = document.getElementById(id);
        const allLists = document.querySelectorAll('.voice-list-container');
        allLists.forEach(list => { if(list.id !== id) list.classList.remove('show'); });
        if (el) el.classList.toggle('show');
    },

    selectVoice(name) {
        this.currentVoiceName = name;
        if (window.AndroidTTS) {
            window.AndroidTTS.setVoice(name);
        } else {
            localStorage.setItem('selectedVoice', name);
            // If TTS is currently speaking, stop it so it can restart with new voice
            if (window.TTSManager) window.TTSManager.stop();
        }
        this.renderLanguageSection();
    },

    showRemoveLanguages() {
        const removeList = document.getElementById('removeLangList');
        const content = removeList.querySelector('.remove-list-content');

        const languagesInList = [];
        const seenLocales = new Set();
        this.addedLocales.forEach(loc => {
            const match = this.voices.find(v => v.locale === loc);
            if (match && !seenLocales.has(loc)) {
                languagesInList.push({ locale: loc, display: match.display });
                seenLocales.add(loc);
            }
        });

        content.innerHTML = languagesInList.map(lang => `
            <div class="lang-item" style="color:#ff4b6b; display:flex; justify-content:space-between;" onclick="window.TextScaler.performRemoveLanguage('${lang.locale}')">
                <span>${lang.display}</span>
                <span><b>Remove</b></span>
            </div>
        `).join('');

        removeList.classList.add('show');
    },

    performRemoveLanguage(locale) {
        if (this.addedLocales.length <= 1) {
            alert("Cannot remove the last language.");
            return;
        }

        const isCurrentlySelected = this.voices.find(v => v.name === this.currentVoiceName)?.locale === locale;
        this.addedLocales = this.addedLocales.filter(loc => loc !== locale);

        // Persistence
        if (window.AndroidTTS) {
            if (typeof window.AndroidTTS.removeLocale === 'function') {
                window.AndroidTTS.removeLocale(locale);
            }
        } else {
            localStorage.setItem('addedLocales', JSON.stringify(this.addedLocales));
        }

        if (isCurrentlySelected) {
            const nextLocale = this.addedLocales[0];
            const nextVoice = this.voices.find(v => v.locale === nextLocale);
            if (nextVoice) this.selectVoice(nextVoice.name);
        }

        document.getElementById('removeLangList').classList.remove('show');
        this.renderLanguageSection();
    },

    renderTranslationSection() {
        const container = document.getElementById('translation-settings-container');
        if (!container || !window.TranslationManager) return;

        const isEnabled = window.TranslationManager.isEnabled;
        const currentLang = window.TranslationManager.targetLanguage;

        const hintSeen = localStorage.getItem('translation_hint_seen');
        const sysLangFull = navigator.language || 'en';
        const sysLangCode = sysLangFull.split('-')[0];

        let targetLangName = 'your language';
        try {
            if (window.Intl && Intl.DisplayNames) {
                targetLangName = new Intl.DisplayNames([sysLangCode], { type: 'language' }).of(sysLangCode);
            }
        } catch (e) {}

        const hints = {
            en: `Tip: You can enable translation to <b>{lang}</b> here.`,
            tr: `İpucu: Buradan <b>{lang}</b> diline çeviriyi etkinleştirebilirsiniz.`,
            es: `Sugerencia: Puedes activar la traducción a <b>{lang}</b> aquí.`,
            fr: `Conseil : Vous pouvez activer la traduction en <b>{lang}</b> ici.`,
            de: `Tipp: Hier können Sie die Übersetzung ins <b>{lang}</b> aktivieren.`,
            hi: `सुझाव: आप यहां <b>{lang}</b> में अनुवाद सक्षम कर सकते हैं।`,
            it: `Suggerimento: Qui puoi attivare la traduzione in <b>{lang}</b>.`,
            pt: `Dica: Você pode ativar a tradução para <b>{lang}</b> aqui.`,
            ru: `Совет: здесь вы можете включить перевод на <b>{lang}</b>.`,
            ja: `ヒント：ここで<b>{lang}</b>への翻訳を有効にできます。`,
            ko: `팁: 여기에서 <b>{lang}</b>(으)로의 번역을 활성화할 수 있습니다.`,
            zh: `提示：您可以在此处启用<b>{lang}</b>翻译。`,
            ar: `تلميح: يمكنك تمكين الترجمة إلى <b>{lang}</b> هنا.`,
            bn: `পরামর্শ: আপনি এখানে <b>{lang}</b>-এ অনুবাদ সক্ষম করতে পারেন।`,
            id: `Tip: Anda dapat mengaktifkan terjemahan ke <b>{lang}</b> di sini.`,
            vi: `Mẹo: Bạn có thể bật dịch sang <b>{lang}</b> tại đây.`,
            nl: `Tip: U kunt hier vertaling naar het <b>{lang}</b> inschakelen.`,
            pl: `Wskazówka: Tutaj możesz włączyć tłumaczenie na język <b>{lang}</b>.`,
            th: `เคล็ดลับ: คุณสามารถเปิดใช้งานการแปลเป็น<b>{lang}</b>ได้ที่นี่`,
            tl: `Tip: Maaari mong paganahin ang pagsasalin sa <b>{lang}</b> dito.`,
            uk: `Порада: тут ви можете увімкнути переклад на <b>{lang}</b>.`,
            fa: `نکته: در اینجا می‌توانید ترجمه به <b>{lang}</b> را فعال کنید.`,
            ro: `Sfat: Puteți activa traducerea în <b>{lang}</b> aici.`,
            el: `Συμβουλή: Μπορείτε να ενεργοποιήσετε τη μετάφραση στα <b>{lang}</b> εδώ.`,
            hu: `Tipp: Itt engedélyezheti a fordítást <b>{lang}</b> nyelvre.`
        };

        const hintTemplate = hints[sysLangCode] || hints.en;
        const hintHtml = (!hintSeen && !isEnabled) ? `
            <div id="translation-hint">
                ${hintTemplate.replace('{lang}', targetLangName)}
            </div>
        ` : '';

        container.innerHTML = `
            <div class="settings-section-translation">
                ${hintHtml}
                <div class="translation-toggle-row">
                    <span style="font-weight:bold; color:var(--text-main); font-size:14px;">Enable Translation</span>
                    <label class="switch">
                        <input type="checkbox" id="translationToggle" ${isEnabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>

                <div id="translationLangSelect" style="display: ${isEnabled ? 'block' : 'none'};">
                    <div style="font-weight:bold; color:var(--text-main); font-size:14px; margin-bottom:1px;">Translate to</div>
                    <select id="targetLangSelect" style="width:100%; padding:8px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-main); outline:none;">
                        ${window.TranslationManager.languages.map(l => `
                            <option value="${l.code}" ${currentLang === l.code ? 'selected' : ''} style="background:var(--bg-color); color:var(--text-main);">${l.name}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `;

        const toggle = document.getElementById('translationToggle');
        if (toggle) {
            toggle.onchange = (e) => {
                if (e.target.checked) {
                    localStorage.setItem('translation_hint_seen', 'true');
                    const hint = document.getElementById('translation-hint');
                    if (hint) hint.style.display = 'none';
                }
                window.TranslationManager.toggleEnabled(e.target.checked);
                document.getElementById('translationLangSelect').style.display = e.target.checked ? 'block' : 'none';
            };
        }

        const select = document.getElementById('targetLangSelect');
        if (select) {
            select.onchange = (e) => {
                window.TranslationManager.setLanguage(e.target.value);
            };
        }
    },

    showAllLanguages() {
        const langList = document.getElementById('fullLangList');
        const content = langList.querySelector('.lang-list-content');

        // Check cache first
        let cached = localStorage.getItem('cached_language_list');
        if (cached) {
            content.innerHTML = cached;
            langList.classList.add('show');
            return;
        }

        if (this.voices.length === 0) {
            content.innerHTML = '<div style="text-align:center; padding:20px; color:gray;">Loading voices...</div>';
            langList.classList.add('show');
            return;
        }

        this.cacheFullLanguageList();
        langList.classList.add('show');
    },

    refreshLanguageList() {
        const content = document.querySelector('#fullLangList .lang-list-content');
        if (content) content.innerHTML = '<div style="text-align:center; padding:20px; color:gray;">Refreshing...</div>';

        localStorage.removeItem('cached_language_list');
        this.loadTTSData();
        // The next showAllLanguages call will regenerate it
        setTimeout(() => this.showAllLanguages(), 500);
    },

    addAndSelectLanguage(tag) {
        if (!this.addedLocales.includes(tag)) {
            this.addedLocales.push(tag);
            if (window.AndroidTTS) {
                window.AndroidTTS.addLocale(tag);
            } else {
                localStorage.setItem('addedLocales', JSON.stringify(this.addedLocales));
            }
        }
        const first = this.voices.find(v => v.locale === tag);
        if (first) this.selectVoice(first.name);
        document.getElementById('fullLangList').classList.remove('show');
        this.renderLanguageSection();
    },

    renderUI() {
        let dimmer = document.getElementById('scaleDimmer');
        if (!dimmer) {
            dimmer = document.createElement('div');
            dimmer.id = 'scaleDimmer';
            document.body.appendChild(dimmer);
        }
        dimmer.onclick = () => this.hide();

        let control = document.getElementById('text-scale-control');
        if (!control) {
            control = document.createElement('div');
            control.id = 'text-scale-control';
            document.body.appendChild(control);
        }

        control.innerHTML = `
            <div style="font-weight:bold; color:var(--text-main); font-size:14px; margin-bottom:2px;">Text Size</div>
            <div class="scale-input-container">
                <button class="scale-btn" id="scale-down">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M188-438v-86h584v86H188Z"/></svg>
                </button>
                <input type="range" id="scaleRange" min="50" max="300" step="5" value="${Math.round(this.scale * 100)}">
                <button class="scale-btn" id="scale-up">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M437-108v-329H108v-86h329v-329h86v329h329v86H523v329h-86Z"/></svg>
                </button>
            </div>
            <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-bottom:2px;">
                <div style="font-weight:bold; color:var(--primary-color);" class="scale-label">${Math.round(this.scale * 100)}%</div>
                <button class="reset-scale-btn" id="reset-scale" style="background:none; border:1px solid var(--border-color); color:var(--text-sub); border-radius:4px; padding:2px 8px; font-size:12px; cursor:pointer;">RESET</button>
            </div>

            <div style="font-weight:bold; color:var(--text-main); font-size:14px; margin-bottom:2px;">Speech Speed</div>
            <div class="scale-input-container">
                <button class="scale-btn" id="speed-down">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M188-438v-86h584v86H188Z"/></svg>
                </button>
                <input type="range" id="speedRange" min="5" max="20" step="1" value="${Math.round(this.speechRate * 10)}">
                <button class="scale-btn" id="speed-up">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M437-108v-329H108v-86h329v-329h86v329h329v86H523v329h-86Z"/></svg>
                </button>
            </div>
            <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-bottom:2px;">
                <div style="font-weight:bold; color:var(--primary-color);" class="speed-label">${this.speechRate.toFixed(1)}x</div>
                <button class="reset-scale-btn" id="reset-speed" style="background:none; border:1px solid var(--border-color); color:var(--text-sub); border-radius:4px; padding:2px 8px; font-size:12px; cursor:pointer;">RESET</button>
            </div>

            <div id="language-section-container"></div>

            <div id="translation-settings-container"></div>

            <!-- Full Language Selection List -->
            <div class="full-lang-list" id="fullLangList">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                    <div style="font-weight:bold; font-size:16px;">Add Language</div>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <button class="refresh-list-btn" onclick="window.TextScaler.refreshLanguageList()" style="background:none; border:1px solid var(--border-color); color:var(--text-main); border-radius:4px; padding:2px 8px; font-size:12px; cursor:pointer;">Refresh</button>
                        <span class="micro-close" style="font-size:24px; cursor:pointer;" onclick="document.getElementById('fullLangList').classList.remove('show')">&times;</span>
                    </div>
                </div>
                <div class="lang-list-content"></div>
            </div>

            <!-- Remove Language Selection List -->
            <div class="full-lang-list" id="removeLangList">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                    <div style="font-weight:bold; font-size:16px; color:#ff4b6b;">Remove Language</div>
                    <span class="micro-close" style="font-size:24px; cursor:pointer;" onclick="document.getElementById('removeLangList').classList.remove('show')">&times;</span>
                </div>
                <div class="remove-list-content"></div>
            </div>
        `;

        document.getElementById('scale-down').onclick = (e) => { e.stopPropagation(); this.update(this.scale - 0.05); };
        document.getElementById('scale-up').onclick = (e) => { e.stopPropagation(); this.update(this.scale + 0.05); };
        document.getElementById('reset-scale').onclick = (e) => { e.stopPropagation(); this.update(1.0); };
        document.getElementById('scaleRange').oninput = (e) => { this.update(parseInt(e.target.value) / 100); };

        document.getElementById('reset-speed').onclick = (e) => { e.stopPropagation(); this.updateSpeed(1.0); };
        document.getElementById('speed-down').onclick = (e) => { e.stopPropagation(); this.updateSpeed(this.speechRate - 0.1); };
        document.getElementById('speed-up').onclick = (e) => { e.stopPropagation(); this.updateSpeed(this.speechRate + 0.1); };
        document.getElementById('speedRange').oninput = (e) => { this.updateSpeed(parseInt(e.target.value) / 10); };

        const btn = document.getElementById('textScaleToggleBtn');
        if (btn) btn.onclick = () => this.show();

        this.updateUI();
    }
};

document.addEventListener('DOMContentLoaded', () => window.TextScaler.init());
