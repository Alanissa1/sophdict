window.AcademicList = Object.assign(window.AcademicList || {}, {
    words: [
        "abandon", "abstract", "academic", "access", "accommodation", "accompanied", "accumulation", "accurate", "achieve", "acknowledged", "acquisition", "adaptation", "adequate", "adjacent", "adjustment", "administration", "adults", "advocate", "affect", "aggregate", "aid", "albeit", "allocation", "alter", "alternative", "ambiguous", "amendment", "analogous", "analysis", "annual", "anticipated", "apparent", "appendix", "appreciation", "approach", "appropriate", "approximated", "arbitrary", "area", "aspects", "assembly", "assessment", "assigned", "assistance", "assume", "assurance", "attached", "attained", "attitudes", "attributed", "author", "authority", "automatically", "available", "aware", "behalf", "benefit", "bias", "bond", "brief", "bulk", "capable", "capacity", "categories", "ceases", "challenge", "channel", "chapter", "chart", "chemical", "circumstances", "cited", "civil", "clarity", "classical", "clause", "code", "coherence", "coincide", "collapse", "colleagues", "commenced", "comments", "commission", "commitment", "commodity", "communication", "community", "compensation", "compiled", "complement", "complex", "components", "compounds", "comprehensive", "comprise", "computer", "conceived", "concentration", "concept", "conclusion", "concurrent", "conduct", "conference", "confined", "confirmed", "conflict", "conformity", "consent", "consequences", "considerable", "consistent", "constant", "constitutional", "constraints", "construction", "consultation", "consumer", "contact", "contemporary", "context", "contract", "contradiction", "contrary", "contrast", "contribution", "controversy", "convention", "conversely", "converted", "convinced", "cooperative", "coordination", "core", "corporate", "corresponding", "couple", "create", "credit", "criteria", "crucial", "cultural", "currency", "cycle", "data", "debate", "decades", "decline", "deduction", "definite", "definition", "demonstrate", "denote", "deny", "depression", "derived", "design", "despite", "detected", "deviation", "device", "devoted", "differentiation", "dimensions", "diminished", "discretion", "discrimination", "displacement", "display", "disposal", "distinction", "distortion", "distribution", "diversity", "document", "domain", "domestic", "dominant", "draft", "dramatic", "duration", "dynamic", "economic", "edition", "elements", "eliminate", "emerged", "emphasis", "empirical", "enable", "encountered", "energy", "enforcement", "enhanced", "enormous", "ensure", "entities", "environment", "equation", "equipment", "equivalent", "erosion", "error", "established", "estate", "estimate", "ethical", "ethnic", "evaluation", "eventually", "evidence", "evolution", "exceed", "excluded", "exhibit", "expansion", "expert", "explicit", "exploitation", "export", "exposure", "external", "extract", "facilitate", "factors", "features", "federal", "fees", "file", "final", "financial", "finite", "flexibility", "fluctuations", "focus", "format", "formula", "forthcoming", "foundation", "founded", "framework", "function", "fundamental", "funds", "furthermore", "gender", "generated", "generation", "global", "goals", "grade", "granted", "guarantee", "guidelines", "hence", "hierarchical", "highlighted", "hypothesis", "identical", "identified", "ideology", "ignored", "illustrated", "image", "immigration", "impact", "implementation", "implications", "implicit", "implies", "imposed", "incentive", "incidence", "inclination", "income", "incompatible", "incorporated", "index", "indicate", "individual", "induced", "inevitably", "inferred", "infrastructure", "inherent", "inhibition", "initial", "initiatives", "injury", "innovation", "input", "insert", "insights", "inspection", "instance", "institute", "instructions", "integral", "integration", "integrity", "intelligence", "intensity", "interaction", "intermediate", "internal", "interpretation", "interval", "intervention", "intrinsic", "investigation", "investment", "invoked", "involved", "isolated", "issues", "items", "job", "journal", "justification", "label", "labor", "layer", "lecture", "legal", "legislation", "levy", "liberal", "license", "likewise", "link", "location", "logic", "maintenance", "major", "manipulation", "manual", "marginal", "mature", "maximum", "mechanism", "media", "mediation", "medical", "medium", "mental", "method", "migration", "military", "minimal", "minimized", "minimum", "ministry", "minorities", "mode", "modified", "monitoring", "motivation", "mutual", "negative", "network", "neutral", "nevertheless", "nonetheless", "normal", "norms", "notion", "notwithstanding", "nuclear", "objective", "obtained", "obvious", "occupational", "occur", "odd", "offset", "ongoing", "option", "orientation", "outcomes", "output", "overall", "overlap", "overseas", "panel", "paradigm", "paragraph", "parallel", "parameters", "participation", "partnership", "passive", "perceived", "percent", "period", "persistent", "perspective", "phase", "phenomenon", "philosophy", "physical", "plus", "policy", "portion", "posed", "positive", "potential", "practitioners", "preceding", "precise", "predicted", "predominantly", "preliminary", "presumption", "previous", "primary", "prime", "principal", "principle", "prior", "priority", "procedure", "process", "professional", "prohibited", "project", "promote", "proportion", "prospect", "protocol", "psychology", "publication", "published", "purchase", "pursue", "qualitative", "quotation", "radical", "random", "range", "ratio", "rational", "reaction", "recovery", "refine", "regime", "region", "registered", "regulations", "reinforced", "rejected", "relaxed", "release", "relevant", "reliance", "reluctant", "removed", "required", "research", "resident", "resolution", "resources", "response", "restore", "restraints", "restricted", "retained", "revealed", "revenue", "reverse", "revision", "revolution", "rigid", "role", "route", "scenario", "schedule", "scheme", "scope", "section", "sector", "security", "select", "sequence", "series", "sex", "shift", "significant", "similar", "simulation", "site", "so-called", "solely", "somewhat", "sought", "source", "specific", "specified", "sphere", "stability", "statistics", "status", "straightforward", "strategies", "stress", "structure", "styles", "submitted", "subordinate", "subsequent", "subsidiary", "substitution", "successive", "sufficient", "sum", "summary", "supplementary", "survey", "survive", "suspended", "sustainable", "symbolic", "tapes", "target", "task", "team", "technical", "techniques", "technology", "temporary", "tension", "termination", "text", "theme", "theory", "thereby", "thesis", "topic", "trace", "traditional", "transfer", "transformation", "transition", "transmission", "transport", "trend", "trigger", "ultimately", "undergo", "underlying", "undertaken", "unified", "uniform", "unique", "utility", "validity", "variable", "vehicle", "version", "via", "violation", "virtually", "visible", "vision", "visual", "volume", "voluntary", "welfare", "whereas", "whereby", "widespread"
    ],
    perPage: 40,
    currentPage: null,
    currentType: null,

    init() {
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    },

    handleRoute() {
        const path = window.location.pathname;
        const isAcademic = path.startsWith('/570academic');

        if (isAcademic) {
            const type = 'academic';
            const parts = path.split('/');
            const typeIndex = parts.indexOf('570academic');
            const page = parseInt(parts[typeIndex + 1]) || 1;

            const modalIndex = parts.indexOf('modal');
            const modalWord = modalIndex !== -1 ? parts[modalIndex + 1] : null;

            if (this.currentType !== type || this.currentPage !== page || !document.querySelector('.list-page')) {
                this.render(type, page);
            }

            if (modalWord && window.ModalManager) {
                window.ModalManager.show(decodeURIComponent(modalWord), null, true);
            } else if (window.ModalManager) {
                window.ModalManager.hide(true);
            }
        }
    },

    open(type = 'academic', page = 1) {
        const path = `/570academic/${page}`;
        window.history.pushState({ [type]: true, page }, "", path);
        this.render(type, page);
    },

    render(type, page) {
        const container = document.getElementById('results-container');
        if (!container) return;

        this.currentPage = page;
        this.currentType = type;

        document.body.classList.remove('home-state');
        const sc = document.querySelector('.search-container'), h = document.getElementById('appHeader');
        if (sc && h && sc.parentElement !== h) h.appendChild(sc);

        let list = this.words;
        let title = '570 Academic Words';
        let tagClass = 'ielts-match';

        const start = (page - 1) * this.perPage;
        const end = start + this.perPage;
        const pageWords = list.slice(start, end);
        const totalPages = Math.ceil(list.length / this.perPage);

        let html = `
            <div class="list-page" style="padding: 20px 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: var(--text-main); font-weight: 500;">${title}</h2>
                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                        <div id="offline-status-container" style="display:flex; align-items:baseline; gap:5px;">
                            <div id="page-fetch-status" class="fetch-progress-meter" style="font-weight: bold; font-size: 14px;"></div>
                            <span style=" color:var(--text-sub);">words offline</span>
                        </div>
                        <div id="fetch-ui-container" class="fetch-ui-container">
                            <button class="icon-btn fetch-btn" title="Download all words from tags" onclick="PreFetcher.showInput()">
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
                ${this.renderPagination(type, page, totalPages)}
                <div class="tags-row" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 30px; margin-top: 20px;">
                    ${pageWords.map(w => `<span class="tag syn-tag ${tagClass}" data-word="${w}" tabindex="0" onclick="window.ModalManager.show('${w}'); event.stopPropagation();">${w}</span>`).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
        if (window.PreFetcher) PreFetcher.updatePageStatus();
        window.scrollTo({ top: 0, behavior: 'instant' });
    },

    renderPagination(type, current, total) {
        let html = `<div class="pagination" style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">`;

        if (current > 1) {
            html += `<button class="page-btn" id="ss" onclick="AcademicList.open('${type}', ${current - 1})">Before</button>`;
        }

        const range = 2;
        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || (i >= current - range && i <= current + range)) {
                let activeColor = '#e1364f';
                let textColor = '#fff';

                html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="AcademicList.open('${type}', ${i})" style="padding: 8px 12px; border-radius: 8px; border: 1px solid ${i === current ? activeColor : 'var(--border-color)'}; background: ${i === current ? activeColor : 'var(--card-bg)'}; color: ${i === current ? textColor : 'var(--text-main)'}; cursor: pointer;">${i}</button>`;
            } else if (i === current - range - 1 || i === current + range + 1) {
                html += `<span>...</span>`;
            }
        }

        if (current < total) {
            html += `<button class="page-btn" id="ss" onclick="AcademicList.open('${type}', ${current + 1})">Next</button>`;
        }

        html += `</div>`;
        return html;
    }
});

window.ACADEMIC_WORDS = new Set((window.AcademicList?.words || []).map(w => w.toLowerCase()));
