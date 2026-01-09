(function() {
    'use strict';

    // CSS to hide common ad elements across websites
    const adHidingCSS = `
        /* Common ad containers */
        .ad,
        .ads,
        .advert,
        .advertising,
        .advertisement,
        .ad-container,
        .ad-wrapper,
        .ad-slot,
        .ad-space,
        .ad-banner,
        .ad-box,
        .ad-block,
        .ad-content,
        .ad-display,
        .ad-frame,
        .ad-module,
        .ad-panel,
        .ad-section,
        .ad-sidebar,
        .ad-unit,
        .ad-wrapper,
        
        /* Google AdSense */
        .adsbygoogle,
        .google-ads,
        .google-ad,
        .google-adsense,
        
        /* Amazon Associates */
        .amzn-ads,
        .amazon-ads,
        
        /* Facebook/Meta ads */
        .fb-ad,
        .facebook-ad,
        .meta-ad,
        
        /* Twitter/X ads */
        .twitter-ad,
        .promoted-tweet,
        .x-promoted,
        
        /* LinkedIn ads */
        .li-ad,
        .linkedin-ad,
        .sponsored-content,
        
        /* Reddit ads */
        .promotedlink,
        .reddit-ad,
        .sponsored-link,
        
        /* Generic ad selectors */
        [class*="ad-"],
        [class*="ads-"],
        [class*="advert"],
        [class*="advertisement"],
        [id*="ad-"],
        [id*="ads-"],
        [id*="advert"],
        [id*="advertisement"],
        
        /* Iframe ads */
        iframe[src*="ads"],
        iframe[src*="doubleclick"],
        iframe[src*="googlesyndication"],
        iframe[src*="amazon-adsystem"],
        iframe[src*="facebook.com/tr"],
        
        /* Script ad containers */
        script[src*="ads"],
        script[src*="doubleclick"],
        script[src*="googlesyndication"],
        
        /* Common ad sizes */
        div[style*="width: 300px"][style*="height: 250px"],
        div[style*="width: 728px"][style*="height: 90px"],
        div[style*="width: 160px"][style*="height: 600px"],
        div[style*="width: 300px"][style*="height: 600px"],
        div[style*="width: 970px"][style*="height: 90px"],
        
        /* Social media widgets */
        .fb-like,
        .fb-share,
        .twitter-share,
        .twitter-follow,
        .linkedin-share,
        .pinterest-share,
        
        /* Newsletter popups */
        .newsletter-popup,
        .email-popup,
        .subscribe-popup,
        .popup-overlay,
        
        /* Cookie banners (optional) */
        .cookie-banner,
        .cookie-notice,
        .gdpr-banner,
        .privacy-notice,
        
        /* Push notifications */
        .push-notification,
        .notification-prompt,
        .subscribe-prompt,
        
        /* General ad hiding */
        [data-ad],
        [data-ads],
        [data-advertisement],
        [data-ad-unit],
        [data-ad-slot],
        
        /* Sponsored content */
        .sponsored,
        .sponsor,
        .promotion,
        .promoted,
        .paid-content,
        .partner-content,
        
        /* Native ads */
        .native-ad,
        .native-ads,
        .recommended-content,
        .suggested-content,
        
        /* Video ads */
        .video-ad,
        .video-ads,
        .preroll-ad,
        .midroll-ad,
        .postroll-ad,
        
        /* Mobile ads */
        .mobile-ad,
        .mobile-ads,
        .app-ad,
        
        /* General hiding rules */
        .ad-overlay,
        .ad-popup,
        .ad-modal,
        .ad-interstitial,
        .ad-fullscreen {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            top: -9999px !important;
            left: -9999px !important;
        }
    `;

    // Site-specific ad hiding rules
    const siteSpecificRules = {
        'facebook.com': `
            .ego_section,
            .ego_unit,
            .sponsored_story,
            ._5jmm,
            ._4-u8,
            .pagelet_ego_pane,
            .adsCategoryTitleLink,
            .emuAd,
            .adMediaWrapper,
            ._4u8,
            ._5qc3
        `,
        'twitter.com': `
            .promoted-account,
            .promoted-tweet,
            .x-promoted,
            .x-ad,
            .x-sponsored,
            .x-promoted-trend,
            .x-promoted-account
        `,
        'instagram.com': `
            .x7a9z,
            .x11i5r,
            .x1mh8g0,
            .x1yc6yn,
            .x1lliihq,
            .x1qjc9v,
            .x1qjc9v.x1mh8g0
        `,
        'linkedin.com': `
            .feed-shared-mini-update-v2__actor,
            .feed-shared-actor__description,
            .sponsored-content,
            .li-ad,
            .promotion-card
        `,
        'reddit.com': `
            .promotedlink,
            .ad-container,
            .premium-banner,
            .sponsored-link,
            .ad-banner,
            .ad-creative
        `,
        'youtube.com': `
            .ytp-ad-module,
            .ytp-ad-overlay,
            .ytp-ad-preview-container,
            .ytp-ce-element,
            .ytd-display-ad-renderer,
            .ytd-promoted-video-renderer,
            .ytd-in-feed-ad-layout-renderer
        `,
        'amazon.com': `
            .ad-container,
            .ad-banner,
            .sponsored-products,
            .sponsored-recommendations,
            .ad-background,
            .ad-background-image
        `,
        'google.com': `
            .ads,
            .ads-container,
            .ad-container,
            .commercial-unit,
            .shopping-unit,
            .plc-list,
            .related-search-pair
        `,
        'news.yahoo.com': `
            .ad-container,
            .ad-slideshow,
            .ad-mrec,
            .ad-widesky,
            .sponsored-content
        `,
        'cnn.com': `
            .ad-container,
            .ad-wrapper,
            .sponsored-content,
            .advertisement,
            .ad-slot
        `,
        'bbc.com': `
            .ad-container,
            .ad-wrapper,
            .sponsored-content,
            .gel-advert,
            .advert
        `
    };

    // Inject CSS to hide ads
    function injectAdHidingCSS() {
        // Remove existing styles if any
        const existingStyle = document.getElementById('general-ad-blocker-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        // Create style element
        const style = document.createElement('style');
        style.id = 'general-ad-blocker-styles';
        
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
        
        style.textContent = cssContent;
        (document.head || document.documentElement).appendChild(style);
    }

    // Remove ad elements dynamically
    function removeAdElements() {
        // Common ad selectors
        const adSelectors = [
            '.ad', '.ads', '.advert', '.advertising', '.advertisement',
            '.ad-container', '.ad-wrapper', '.ad-slot', '.ad-space',
            '.adsbygoogle', '.google-ads', '.sponsored', '.promotion',
            '.promoted', '.native-ad', '.video-ad', '.mobile-ad',
            '[class*="ad-"]', '[class*="ads-"]', '[id*="ad-"]', '[id*="ads-"]',
            'iframe[src*="ads"]', 'iframe[src*="doubleclick"]',
            'script[src*="ads"]', 'script[src*="doubleclick"]'
        ];

        // Remove elements matching selectors
        adSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element && element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                });
            } catch (e) {
                // Ignore errors for invalid selectors
            }
        });

        // Remove elements with ad-related attributes
        const adAttributes = ['data-ad', 'data-ads', 'data-advertisement', 'data-ad-unit'];
        adAttributes.forEach(attr => {
            const elements = document.querySelectorAll(`[${attr}]`);
            elements.forEach(element => {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
        });
    }

    // Block ad scripts
    function blockAdScripts() {
        // Remove existing ad scripts
        const adScripts = document.querySelectorAll('script[src*="ads"], script[src*="doubleclick"], script[src*="googlesyndication"]');
        adScripts.forEach(script => {
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
        });

        // Prevent new ad scripts from loading
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);
            
            if (tagName.toLowerCase() === 'script') {
                const originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                    if (name === 'src' && isAdScript(value)) {
                        throw new Error('Ad script blocked');
                    }
                    return originalSetAttribute.call(this, name, value);
                };
            }
            
            return element;
        };
    }

    // Check if script URL is ad-related
    function isAdScript(url) {
        const adPatterns = [
            /ads/,
            /doubleclick/,
            /googlesyndication/,
            /googleads/,
            /amazon-adsystem/,
            /facebook\.com\/tr/,
            /analytics/,
            /tracking/
        ];
        
        return adPatterns.some(pattern => pattern.test(url));
    }

    // Setup MutationObserver to catch dynamic ads
    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldRemoveAds = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the added node or its children are ads
                            if (isAdElement(node) || node.querySelector && node.querySelector('[class*="ad-"], [id*="ad-"], .ads, .advert')) {
                                shouldRemoveAds = true;
                            }
                        }
                    });
                }
            });

            if (shouldRemoveAds) {
                setTimeout(() => {
                    removeAdElements();
                    injectAdHidingCSS();
                }, 100);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'id', 'src']
        });

        return observer;
    }

    // Check if element is ad-related
    function isAdElement(element) {
        if (!element || !element.classList) return false;
        
        const adClasses = ['ad', 'ads', 'advert', 'advertisement', 'sponsored', 'promotion'];
        const className = element.className.toString().toLowerCase();
        
        return adClasses.some(adClass => className.includes(adClass));
    }

    // Main initialization function
    function init() {
        console.log('General Ad Blocker: Initializing...');
        
        // Inject CSS immediately
        injectAdHidingCSS();
        
        // Remove existing ads
        setTimeout(removeAdElements, 100);
        
        // Block ad scripts
        setTimeout(blockAdScripts, 200);
        
        // Setup mutation observer
        setTimeout(setupMutationObserver, 300);
        
        // Periodic ad removal
        setInterval(removeAdElements, 5000);
        
        console.log('General Ad Blocker: Initialized successfully');
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also initialize when the page is fully loaded
    window.addEventListener('load', () => {
        setTimeout(init, 1000);
    });

})();