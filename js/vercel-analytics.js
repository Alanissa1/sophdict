/**
 * Vercel Analytics Integration
 */
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
(function() {
    const script = document.createElement('script');
    script.defer = true;
    script.src = '/_vercel/insights/script.js';
    document.head.appendChild(script);
})();
