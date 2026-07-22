window.UIThesaurus = {
    generateHtml(data) {
        const { word, thesaurus, dictionary } = data;
        let html = "";

        const grouped = {};
        const searchTerm = word.toLowerCase();

        if (Array.isArray(thesaurus) && thesaurus.length > 0) {
            thesaurus.forEach(entry => {
                const entryId = entry.meta?.id.split(':')[0].toLowerCase();
                const stems = entry.meta?.stems?.map(s => s.toLowerCase()) || [];

                // Allow if entry ID or stems contain the search term
                if (!entryId.includes(searchTerm) && !stems.some(s => s.includes(searchTerm))) return;

                let type = entry.fl || "other";

                // Supplement missing fl from dictionary data if available
                if ((!entry.fl || entry.fl === 'other') && Array.isArray(dictionary)) {
                    const dictMatch = dictionary.find(de => de.fl && de.fl !== 'other');
                    if (dictMatch) type = dictMatch.fl;
                }

                if (!grouped[type]) grouped[type] = [];
                grouped[type].push(entry);
            });
        }

        // Supplement missing context types from dictionary if not already existing in thesaurus
        if (Array.isArray(dictionary) && dictionary.length > 0) {
            const existingTypes = new Set(Object.keys(grouped).map(t => t.toLowerCase()));

            dictionary.forEach(dictEntry => {
                const fl = dictEntry.fl || "other";
                if (!existingTypes.has(fl.toLowerCase())) {
                    if (!grouped[fl]) grouped[fl] = [];
                    grouped[fl].push(dictEntry);
                }
            });
        }

        const types = Object.keys(grouped);
        if (types.length === 0) {
            return `<div style="padding:20px; text-align:center; color:var(--text-sub);">No relevant thesaurus data found.</div>`;
        }

        types.forEach(type => {
            html += `<div class="context-card"><div class="context-type">${type}</div>`;
            let senseCounter = 1;

            grouped[type].forEach(entry => {
                if (!entry.def || !Array.isArray(entry.def)) return;

                entry.def.forEach(defObj => {
                    if (!defObj || !defObj.sseq || !Array.isArray(defObj.sseq)) return;

                    defObj.sseq.forEach(sseq => {
                        sseq.forEach(sen => {
                            const sData = sen[1];
                            if (!sData || !sData.dt) return;

                            UIUtils.reclassifyMetadata(sData);

                            let def = UIUtils.cleanMWText(sData.dt[0][1]);
                            const escapedDef = UIUtils.stripTags(def).replace(/"/g, '&quot;');
                            let vis = sData.dt.find(i => i[0] === 'vis');
                            let exHtml = vis ? vis[1].map(v => {
                                const cleanEx = UIUtils.cleanMWExample(v.t, word);
                                const ttsText = UIUtils.stripTags(cleanEx);
                                const escapedEx = ttsText.replace(/"/g, '&quot;');
                                return `<div class="example">"${cleanEx}" <span class="tts-inline-target" data-text="${escapedEx}"></span></div>`;
                            }).join('') : "";

                            const getTagData = (list) => list?.flat().map(s => {
                                const label = s.wsls ? ` <small style="opacity:0.6; font-style:italic;">(${s.wsls.join(', ')})</small>` : "";
                                return { wd: s.wd, html: `${s.wd}${label}` };
                            }) || [];

                            const syns = getTagData(sData.syn_list);
                            const sims = getTagData(sData.sim_list);
                            const rels = getTagData(sData.rel_list);
                            const nears = getTagData(sData.near_list);
                            const ants = getTagData(sData.ant_list);
                            const opps = getTagData(sData.opp_list);
                            const phrases = sData.phrase_list?.flat().map(p => ({ wd: p.wd, html: p.wd })) || [];

                            const mergedSimilar = [...syns, ...sims, ...phrases];
                            const mergedOpposite = [...ants, ...opps];

                            html += `
                                <div class="sense-block">
                                    <div class="definition">
                                        <span class="sense-num">${senseCounter++}.</span>
                                        <div class="def-content-container">
                                            <div class="def-text">${def} <span class="tts-inline-target" data-text="${escapedDef}"></span></div>
                                            ${exHtml}
                                            <div class="tags-section expandable-wrapper">
                                                <div class="tags-rows-container">
                                                    ${mergedSimilar.length ? `<div class="tags-row Similar-row"><span class="tags-label">Similar:</span>${mergedSimilar.map(s => `<span class="tag syn-tag" data-word="${s.wd}" tabindex="0">${s.html}</span>`).join('')}</div>` : ''}
                                                    ${rels.length ? `<div class="tags-row"><span class="tags-label">Related:</span>${rels.map(r => `<span class="tag syn-tag" data-word="${r.wd}" tabindex="0">${r.html}</span>`).join('')}</div>` : ''}
                                                    ${mergedOpposite.length ? `<div class="tags-row"><span class="tags-label">Opposite:</span>${mergedOpposite.map(a => `<span class="tag ant-tag" data-word="${a.wd}" tabindex="0">${a.html}</span>`).join('')}</div>` : ''}
                                                    ${nears.length ? `<div class="tags-row"><span class="tags-label">Near:</span>${nears.map(n => `<span class="tag ant-tag" data-word="${n.wd}" tabindex="0">${n.html}</span>`).join('')}</div>` : ''}
                                                    <button class="tag-expand-btn" onclick="UIThesaurus.toggleExpand(this)" aria-label="Expand tags">
                                                        <svg class="ignore-dark-override" xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="currentColor"><path d="m480-347.33 175.33-175.34-47.66-46.66L480-441.67 352.33-569.33l-47.66 46.66L480-347.33ZM480-80q-82.33 0-155.33-31.5-73-31.5-127.34-85.83Q143-251.67 111.5-324.67T80-480q0-83 31.5-156t85.83-127q54.34-54 127.34-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82.33-31.5 155.33-31.5 73-85.5 127.34Q709-143 636-111.5T480-80Zm0-66.67q139.33 0 236.33-97.33t97-236q0-139.33-97-236.33t-236.33-97q-138.67 0-236 97-97.33 97-97.33 236.33 0 138.67 97.33 236 97.33 97.33 236 97.33ZM480-480Z"/></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>`;
                        });
                    });
                });
                html += `</div>`;
            });
        } else {
            html = `<div style="padding:20px; text-align:center; color:var(--text-sub);">Thesaurus data not available for this word.</div>`;
        }
        return html;
    },

    toggleExpand(btn) {
        const wrapper = btn.closest('.expandable-wrapper');
        const rectBefore = btn.getBoundingClientRect();
        const scrollBefore = window.pageYOffset;

        const isExpanded = wrapper.classList.toggle('expanded');
        btn.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';

        // Only apply scroll compensation when CLOSING to prevent jumping upwards.
        // For expansion, let the browser handle the natural growth of the page.
        if (!isExpanded) {
            const rectAfter = btn.getBoundingClientRect();
            const diff = rectAfter.top - rectBefore.top;
            if (Math.abs(diff) > 1) {
                // If in a modal, check if we should scroll the modal content instead
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
