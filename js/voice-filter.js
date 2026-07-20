window.VoiceFilter = {
    cleanName(name, lang) {
        if (!name) return `Voice (${lang})`;

        let clean = name;

        // Remove common redundant patterns
        const patterns = [
            /Microsoft /g,
            /Online \(Natural\)/g,
            /Dragon HD Flash Latest/g,
            /Multilingual/g,
            /Mehrsprachig/g,
            /multilingue/g,
            /multilíngue/g,
            /多语言/g,
            /方言/g,
            /Indic/g,
            / - /g,
            /\(/g,
            /\)/g
        ];

        patterns.forEach(p => {
            clean = clean.replace(p, ' ');
        });

        // Remove the language name if it's already in the name (e.g. "English (United States)")
        // but keep the person's name
        clean = clean.replace(/\s+/g, ' ').trim();

        // If it's just a language name now, it might be boring, but better than "Microsoft Online..."
        return clean || name;
    },

    filter(voices) {
        if (!voices || !Array.isArray(voices)) return [];

        // Map to clean names first
        const cleaned = voices.map(v => ({
            name: v.name,
            locale: v.lang.replace('_', '-'),
            display: this.cleanName(v.name, v.lang)
        }));

        // Remove near-duplicates (e.g. same display name and same locale)
        const unique = [];
        const seen = new Set();

        cleaned.forEach(v => {
            const key = `${v.display.toLowerCase()}|${v.locale.toLowerCase()}`;
            if (!seen.has(key)) {
                unique.push(v);
                seen.add(key);
            }
        });

        return unique;
    }
};
