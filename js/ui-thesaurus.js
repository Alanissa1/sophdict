window.UIThesaurus = {
    generateHtml(data) {
        const { word, thesaurus, dictionary } = data;
        let html = "";
        const grouped = {};
        const searchTerm = word.toLowerCase();

        const suggestions = Array.isArray(thesaurus) ? thesaurus.filter(t => typeof t === 'string') : [];
        const entries = Array.isArray(thesaurus) ? thesaurus.filter(t => typeof t === 'object' && t !== null) : [];

        // 1. Group existing thesaurus entries
        entries.forEach(entry => {
            const entryId = (entry.meta?.id || "").split(':')[0].toLowerCase();
            const stems = entry.meta?.stems?.map(s => s?.toLowerCase()) || [];

            // Allow if entry ID or stems contain the search term
            if (entryId && !entryId.includes(searchTerm) && !stems.some(s => s?.includes(searchTerm))) return;

            let type = entry.fl || "other";

            // Supplement missing fl from dictionary data if available
            if ((!entry.fl || entry.fl === 'other') && Array.isArray(dictionary)) {
                const dictMatch = dictionary.find(de => de.fl && de.fl !== 'other');
                if (dictMatch) type = dictMatch.fl;
            }

            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(entry);
        });

        // 2. Supplement missing context types from dictionary
        if (Array.isArray(dictionary)) {
            const existingTypes = new Set(Object.keys(grouped).map(t => t.toLowerCase()));
            dictionary.forEach(dictEntry => {
                const type = dictEntry.fl;
                if (type && type !== 'other' && !existingTypes.has(type.toLowerCase())) {
                    const entryId = (dictEntry.meta?.id || "").split(':')[0].toLowerCase();
                    const stems = dictEntry.meta?.stems?.map(s => s?.toLowerCase()) || [];
                    if (entryId && (entryId.includes(searchTerm) || stems.some(s => s?.includes(searchTerm)))) {
                        if (!grouped[type]) grouped[type] = [];
                        grouped[type].push(dictEntry);
                        existingTypes.add(type.toLowerCase());
                    }
                }
            });
        }

        const types = Object.keys(grouped);
        types.forEach(type => {
            let contextHtml = "";
            let senseCounter = 1;

            grouped[type].forEach(entry => {
                if (!entry.def || !entry.def[0] || !entry.def[0].sseq) return;

                entry.def[0].sseq.forEach(sseq => {
                    sseq.forEach(node => {
                        const processNode = (n) => {
                            const nodeType = n[0];
                            const sData = n[1];

                            if (nodeType === 'pseq' || nodeType === 'bs') {
                                if (Array.isArray(sData)) sData.forEach(child => processNode(child));
                                return;
                            }
                            if (nodeType !== 'sense' && nodeType !== 'sdsense') return;
                            if (!sData || !sData.dt) return;

                            UIUtils.reclassifyMetadata(sData);

                            const textNode = sData.dt.find(i => i[0] === 'text');
                            if (!textNode) return;

                            let def = UIUtils.cleanMWText(textNode[1]);
                            const escapedDef = UIUtils.stripTags(def).replace(/"/g, '&quot;');
                            let vis = sData.dt.find(i => i[0] === 'vis');
                            let exHtml = vis ? vis[1].map(v => {
                                const cleanEx = UIUtils.cleanMWExample(v.t, word);
                                const ttsText = UIUtils.stripTags(cleanEx);
                                const escapedEx = ttsText.replace(/"/g, '&quot;');
                                return `<div class="example">"${cleanEx}" <span class="tts-inline-target" data-text="${escapedEx}"></span></div>`;
                            }).join('') : "";

                            const getTagData = (list) => list?.flat().map(s => {
                                if (!s) return null;
                                const labels = (s.wsls || []).map(l => l?.toLowerCase()).filter(Boolean);
                                const labelHtml = labels.length ? ` <small style="opacity:0.6; font-style:italic;">(${s.wsls.join(', ')})</small>` : "";
                                return { wd: s.wd, html: `${s.wd}${labelHtml}` };
                            }).filter(Boolean) || [];

                            const renderTags = (list, tagClass) => {
                                let res = "";
                                const academic = [];
                                const others = [];

                                list.forEach(item => {
                                    const clean = item.wd.toLowerCase().trim();
                                    const isAcademic = window.ACADEMIC_WORDS && window.ACADEMIC_WORDS.has(clean);

                                    if (isAcademic) academic.push(item);
                                    else others.push(item);
                                });

                                if (academic.length) {
                                    res += academic.map(s => `<span class="tag ${tagClass} ielts-match" data-word="${s.wd}" tabindex="0">${s.html}</span>`).join('');
                                    res += `<span class="academic-tag-label">&lt;Academic</span>`;
                                }
                                res += others.map(s => `<span class="tag ${tagClass}" data-word="${s.wd}" tabindex="0">${s.html}</span>`).join('');
                                return res;
                            };

                            const syns = getTagData(sData.syn_list);
                            const sims = getTagData(sData.sim_list);
                            const rels = getTagData(sData.rel_list);
                            const nears = getTagData(sData.near_list);
                            const ants = getTagData(sData.ant_list);
                            const opps = getTagData(sData.opp_list);
                            const phrases = sData.phrase_list?.flat().map(p => (p?.wd ? { wd: p.wd, html: p.wd } : null)).filter(Boolean) || [];

                            const mergedSimilar = [...syns, ...sims, ...phrases];
                            const mergedOpposite = [...ants, ...opps];

                            const hasTags = mergedSimilar.length || rels.length || mergedOpposite.length || nears.length;

                            contextHtml += `
                                <div class="sense-block">
                                    <div class="definition">
                                        <span class="sense-num">${senseCounter++}.</span>
                                        <div class="def-content-container">
                                            <div class="def-text">${def} <span class="tts-inline-target" data-text="${escapedDef}"></span></div>
                                            ${exHtml}
                                            ${hasTags ? `
                                            <div class="tags-section expandable-wrapper">
                                                <div class="tags-rows-container">
                                                    ${mergedSimilar.length ? `<div class="tags-row Similar-row"><span class="tags-label">similar:</span>${renderTags(mergedSimilar, 'syn-tag')}</div>` : ''}
                                                    ${rels.length ? `<div class="tags-row"><span class="tags-label">related:</span>${renderTags(rels, 'syn-tag')}</div>` : ''}
                                                    ${mergedOpposite.length ? `<div class="tags-row"><span class="tags-label">opposite:</span>${renderTags(mergedOpposite, 'ant-tag')}</div>` : ''}
                                                    ${nears.length ? `<div class="tags-row"><span class="tags-label">near:</span>${renderTags(nears, 'ant-tag')}</div>` : ''}
                                                    <button class="tag-expand-btn" onclick="UIThesaurus.toggleExpand(this)" aria-label="Expand tags">
                                                        <svg class="ignore-dark-override" xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="currentColor"><path d="m480-347.33 175.33-175.34-47.66-46.66L480-441.67 352.33-569.33l-47.66 46.66L480-347.33ZM480-80q-82.33 0-155.33-31.5-73-31.5-127.34-85.83Q143-251.67 111.5-324.67T80-480q0-83 31.5-156t85.83-127q54.34-54 127.34-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82.33-31.5 155.33-31.5 73-85.5 127.34Q709-143 636-111.5T480-80Zm0-66.67q139.33 0 236.33-97.33t97-236q0-139.33-97-236.33t-236.33-97q-138.67 0-236 97-97.33 97-97.33 236.33 0 138.67 97.33 236 97.33 97.33 236 97.33ZM480-480Z"/></svg>
                                                    </button>
                                                </div>
                                            </div>` : ''}
                                        </div>
                                    </div>
                                </div>`;
                        };
                        processNode(node);
                    });
                });
            });
            if (contextHtml) {
                html += `<div class="context-card"><div class="context-type">${type}</div>${contextHtml}</div>`;
            }
        });

        // 3. Suggestions Card (Simple related word strings)
        if (suggestions.length > 0) {
            html += `<div class="context-card suggestions-card">
                <div class="context-type">Related</div>
                <div class="tags-row" style="padding: 10px 0;">
                    ${suggestions.map(s => `<span class="tag syn-tag ${UIUtils.getTagClass(s)}" data-word="${s}" tabindex="0">${s}</span>`).join('')}
                </div>
            </div>`;
        }

        if (!html) {
            return `<div style="padding:20px; text-align:center; color:var(--text-sub);">No relevant dictionary or thesaurus data found.</div>`;
        }
        return html;
    },

    toggleExpand(btn) {
        const wrapper = btn.closest('.expandable-wrapper');
        const rectBefore = btn.getBoundingClientRect();
        const scrollBefore = window.pageYOffset;

        const isExpanded = wrapper.classList.toggle('expanded');
        btn.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';

        if (!isExpanded) {
            const rectAfter = btn.getBoundingClientRect();
            const diff = rectAfter.top - rectBefore.top;
            if (Math.abs(diff) > 1) {
                const modalContent = document.getElementById('microContent');
                const isInsideModal = modalContent && modalContent.contains(btn);

                if (isInsideModal) {
                    modalContent.scrollTop += diff;
                } else {
                    window.scrollTo(0, scrollBefore + diff);
                }
            }
        }
    }
};
