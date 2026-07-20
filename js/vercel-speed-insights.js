/**
 * Vercel Speed Insights Integration
 */
window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
(function() {
    const script = document.createElement('script');
    script.defer = true;
    script.src = '/_vercel/speed-insights/script.js';
    document.head.appendChild(script);
})();
