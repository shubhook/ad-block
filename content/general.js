(function() {
    'use strict';

    // Prevent multiple initializations
    if (window.__zenAdBlockerGeneral) return;
    window.__zenAdBlockerGeneral = true;

    // Skip YouTube - it has its own dedicated content script
    if (window.location.hostname.includes('youtube.com')) {
        return;
    }

    // CSS to hide common ad elements across websites
    // IMPORTANT: Be very conservative to avoid hiding legitimate content like search bars
    const adHidingCSS = `
        /* Google AdSense - specific classes only */
        .adsbygoogle,
        ins.adsbygoogle,
        
        /* Specific ad containers with exact class names */
        div.ad-banner-container,
        div.advertisement-container,
        div.sponsored-ad-container,
        
        /* Iframe ads - specific domains only */
        iframe[src*="doubleclick.net"],
        iframe[src*="googlesyndication.com"],
        iframe[src*="amazon-adsystem.com"],
        iframe[src*="adservice.google.com"],
        
        /* Known ad network containers */
        .taboola-container,
        .outbrain-container,
        .criteo-container,
        
        /* Promoted content markers */
        .promotedlink,
        
        /* Video pre-roll ads */
        .preroll-ad-container,
        .video-ad-container {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
        }
    `;

    // Site-specific ad hiding rules - these are more targeted
    const siteSpecificRules = {
        'facebook.com': `
            [data-pagelet="RightRail"] > div[data-testid],
            .ego_section,
            .ego_unit,
            .pagelet_ego_pane {
                display: none !important;
            }
        `,
        'twitter.com': `
            [data-testid="placementTracking"],
            article[data-testid="tweet"]:has(svg[data-testid="icon-promoted"]) {
                display: none !important;
            }
        `,
        'x.com': `
            [data-testid="placementTracking"],
            article[data-testid="tweet"]:has(svg[data-testid="icon-promoted"]) {
                display: none !important;
            }
        `,
        'linkedin.com': `
            .feed-shared-update-v2:has(.feed-shared-actor__description:contains("Promoted")),
            .ad-banner-container {
                display: none !important;
            }
        `,
        'reddit.com': `
            .promotedlink,
            [data-promoted="true"],
            shreddit-ad-post {
                display: none !important;
            }
        `,
        'amazon.com': `
            .s-sponsored-label-text,
            div[data-component-type="sp-sponsored-result"],
            .AdHolder {
                display: none !important;
            }
        `
    };

    let observer = null;
    let styleElement = null;

    // Inject CSS to hide ads
    function injectAdHidingCSS() {
        // Remove existing styles if any
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
        }

        // Create style element
        styleElement = document.createElement('style');
        styleElement.id = 'zen-general-ad-blocker-styles';
        
        // Combine general and site-specific CSS
        let cssContent = adHidingCSS;
        
        // Add site-specific rules
        const hostname = window.location.hostname;
        for (const [domain, rules] of Object.entries(siteSpecificRules)) {
            if (hostname.includes(domain)) {
                cssContent += rules;
                break;
            }
        }
        
        styleElement.textContent = cssContent;
        (document.head || document.documentElement).appendChild(styleElement);
    }

    // Very conservative ad element removal - only target known ad elements
    function removeAdElements() {
        // Only remove elements that are definitively ads
        const safeAdSelectors = [
            'ins.adsbygoogle',
            'iframe[src*="doubleclick.net"]',
            'iframe[src*="googlesyndication.com"]',
            'iframe[src*="amazon-adsystem.com"]',
            '.taboola-container',
            '.outbrain-container'
        ];

        safeAdSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    // Double-check it's not inside a legitimate container
                    if (element && element.parentNode && !isLegitimateElement(element)) {
                        element.style.display = 'none';
                        element.style.visibility = 'hidden';
                        element.style.height = '0';
                        element.style.width = '0';
                    }
                });
            } catch (e) {
                // Ignore errors for invalid selectors
            }
        });
    }

    // Check if element is part of legitimate page content
    function isLegitimateElement(element) {
        // Check if element is inside search forms, navigation, headers, etc.
        const legitimateContainers = [
            'form[role="search"]',
            'form[action*="search"]',
            'input[type="search"]',
            'header',
            'nav',
            '[role="search"]',
            '[role="navigation"]',
            '[role="banner"]',
            '.search-form',
            '.searchbox',
            '#search',
            '#searchform'
        ];

        for (const selector of legitimateContainers) {
            try {
                if (element.closest(selector)) {
                    return true;
                }
            } catch (e) {
                // Ignore selector errors
            }
        }

        return false;
    }

    // Setup MutationObserver to catch dynamic ads
    function setupMutationObserver() {
        if (observer) {
            observer.disconnect();
        }

        observer = new MutationObserver((mutations) => {
            let shouldCheck = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Only check for very specific ad indicators
                            if (node.classList && (
                                node.classList.contains('adsbygoogle') ||
                                node.classList.contains('taboola-container') ||
                                node.classList.contains('outbrain-container')
                            )) {
                                shouldCheck = true;
                                break;
                            }
                            // Check for ad iframes
                            if (node.tagName === 'IFRAME') {
                                const src = node.getAttribute('src') || '';
                                if (src.includes('doubleclick.net') || 
                                    src.includes('googlesyndication.com') ||
                                    src.includes('amazon-adsystem.com')) {
                                    shouldCheck = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (shouldCheck) break;
            }

            if (shouldCheck) {
                // Debounce the removal
                clearTimeout(window.__zenAdBlockerTimeout);
                window.__zenAdBlockerTimeout = setTimeout(removeAdElements, 200);
            }
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // Main initialization function
    function init() {
        // Inject CSS immediately
        injectAdHidingCSS();
        
        // Remove existing ads after a short delay
        setTimeout(removeAdElements, 500);
        
        // Setup mutation observer
        if (document.body) {
            setupMutationObserver();
        } else {
            document.addEventListener('DOMContentLoaded', setupMutationObserver);
        }
    }

    // Initialize based on document state
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
