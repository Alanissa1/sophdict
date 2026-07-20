window.ThesaurusAPI = {
    async fetch(word) {
        try {
            // Using proxy to hide API key
            const url = `${CONFIG.THESAURUS_API_URL}?word=${encodeURIComponent(word.toLowerCase().trim())}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`[ThesaurusAPI] Error:`, error);
            throw error;
        }
    }
};
