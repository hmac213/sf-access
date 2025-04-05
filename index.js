import large_font_access from "./gemini_calls/large_font.js";

class EclectechElement extends HTMLElement {
    constructor() {
        super();
        this.renderedHTML = undefined;
    }

    connectedCallback() {
        window.requestAnimationFrame(() => {
            this.renderedHTML = document.documentElement.innerHTML;

            if (this.hasAttribute('enable-large-font')) {
                this.enableLargeFontAccess();
            }
        });
    }

    async enableLargeFontAccess() {
        // Check if we've already updated the page in this session
        if (sessionStorage.getItem('largeFontUpdated') === 'true') {
            return;
        }
    
        // Check if we already have a cached result
        const cachedHtml = localStorage.getItem('largeFontHtml');
        if (cachedHtml) {
            document.documentElement.innerHTML = cachedHtml;
            sessionStorage.setItem('largeFontUpdated', 'true');
            return;
        }
        
        let outputHtml = await large_font_access(this.renderedHTML);
        outputHtml = outputHtml
            .replace(/^```html\s*/, '')
            .replace(/```\s*$/, '');
        
        console.log(outputHtml);
        // Update the document and cache the output
        document.documentElement.innerHTML = outputHtml;
        localStorage.setItem('largeFontHtml', outputHtml);
        sessionStorage.setItem('largeFontUpdated', 'true');
    }
}

customElements.define('eclec-tech', EclectechElement);