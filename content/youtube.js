(function() {
    'use strict';

    // Prevent multiple initializations
    if (window.__zenAdBlockerYouTube) return;
    window.__zenAdBlockerYouTube = true;

    // CSS to hide YouTube ads - very specific selectors to avoid breaking functionality
    const adHidingCSS = `
        /* Video ad overlays */
        .ytp-ad-module,
        .ytp-ad-overlay-container,
        .ytp-ad-text-overlay,
        .ytp-ad-image-overlay,
        
        /* Ad player elements */
        .ytp-ad-player-overlay,
        .ytp-ad-player-overlay-layout,
        .ytp-ad-action-interstitial,
        
        /* Skip button container (hide, we auto-click it) */
        .ytp-ad-skip-button-modern,
        
        /* Ad badges and labels */
        .ytp-ad-badge,
        .ytp-ad-visit-advertiser-button,
        
        /* Homepage/feed ads */
        ytd-display-ad-renderer,
        ytd-promoted-sparkles-web-renderer,
        ytd-promoted-sparkles-text-search-renderer,
        ytd-ad-slot-renderer,
        ytd-in-feed-ad-layout-renderer,
        ytd-banner-promo-renderer,
        
        /* Masthead ads */
        ytd-primetime-promo-renderer,
        
        /* Sidebar promoted videos */
        ytd-compact-promoted-video-renderer,
        
        /* Search result ads */
        ytd-promoted-video-renderer {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
        }
        
        /* Hide ad preview container but keep video visible */
        .ytp-ad-preview-container {
            opacity: 0 !important;
            pointer-events: none !important;
        }
    `;

    let observer = null;
    let videoObserver = null;
    let styleElement = null;
    let skipInterval = null;

    // Inject CSS to hide ads
    function injectAdHidingCSS() {
        if (document.getElementById('zen-youtube-ad-blocker-styles')) {
            return; // Already injected
        }
        
        styleElement = document.createElement('style');
        styleElement.textContent = adHidingCSS;
        styleElement.id = 'zen-youtube-ad-blocker-styles';
        (document.head || document.documentElement).appendChild(styleElement);
    }

    // Skip video ads
    function skipVideoAds() {
        // Try to click skip button
        const skipButtons = document.querySelectorAll(
            '.ytp-ad-skip-button, ' +
            '.ytp-ad-skip-button-modern, ' +
            '.ytp-skip-ad-button, ' +
            'button.ytp-ad-skip-button-container'
        );
        
        for (const button of skipButtons) {
            if (button && button.offsetParent !== null) {
                button.click();
                return true;
            }
        }

        // Check if an ad is playing and try to skip it
        const video = document.querySelector('video.html5-main-video');
        if (!video) return false;

        // Detect if ad is playing
        const adModule = document.querySelector('.ytp-ad-module');
        const adOverlay = document.querySelector('.ytp-ad-player-overlay');
        const adPlaying = document.querySelector('.ad-showing');
        
        if (adModule || adOverlay || adPlaying) {
            // Mute during ad
            video.muted = true;
            
            // Try to skip to end
            if (video.duration && video.duration > 0 && isFinite(video.duration)) {
                video.currentTime = video.duration - 0.1;
            }
            
            // Increase playback rate
            video.playbackRate = 16;
            
            return true;
        } else {
            // Restore normal state when ad ends
            video.playbackRate = 1;
        }

        return false;
    }

    // Remove feed ads (homepage, search results, sidebar)
    function removeFeedAds() {
        const adSelectors = [
            'ytd-display-ad-renderer',
            'ytd-promoted-sparkles-web-renderer',
            'ytd-promoted-sparkles-text-search-renderer',
            'ytd-ad-slot-renderer',
            'ytd-in-feed-ad-layout-renderer',
            'ytd-banner-promo-renderer',
            'ytd-compact-promoted-video-renderer',
            'ytd-promoted-video-renderer',
            'ytd-primetime-promo-renderer'
        ];

        adSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el && el.parentNode) {
                    el.style.display = 'none';
                }
            });
        });
    }

    // Setup observer for video ads
    function setupVideoAdObserver() {
        if (videoObserver) {
            videoObserver.disconnect();
        }

        const player = document.querySelector('#movie_player');
        if (!player) {
            // Retry later if player not found
            setTimeout(setupVideoAdObserver, 1000);
            return;
        }

        videoObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // Check if ad started
                    if (player.classList.contains('ad-showing')) {
                        skipVideoAds();
                    }
                }
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList && (
                                node.classList.contains('ytp-ad-module') ||
                                node.classList.contains('ytp-ad-overlay-container') ||
                                node.classList.contains('ytp-ad-player-overlay')
                            )) {
                                skipVideoAds();
                            }
                        }
                    }
                }
            }
        });

        videoObserver.observe(player, {
            attributes: true,
            attributeFilter: ['class'],
            childList: true,
            subtree: true
        });
    }

    // Setup observer for feed ads
    function setupFeedObserver() {
        if (observer) {
            observer.disconnect();
        }

        observer = new MutationObserver((mutations) => {
            let shouldRemove = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const tagName = node.tagName?.toLowerCase() || '';
                            if (tagName.includes('ad-') || 
                                tagName.includes('promoted') ||
                                tagName === 'ytd-display-ad-renderer' ||
                                tagName === 'ytd-ad-slot-renderer') {
                                shouldRemove = true;
                                break;
                            }
                        }
                    }
                }
                if (shouldRemove) break;
            }

            if (shouldRemove) {
                setTimeout(removeFeedAds, 100);
            }
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // Start skip interval for persistent ad detection
    function startSkipInterval() {
        if (skipInterval) {
            clearInterval(skipInterval);
        }
        
        // Check for ads every 500ms - less aggressive than before
        skipInterval = setInterval(() => {
            const player = document.querySelector('#movie_player');
            if (player && player.classList.contains('ad-showing')) {
                skipVideoAds();
            }
        }, 500);
    }

    // Initialize the ad blocker
    function init() {
        // Inject CSS
        injectAdHidingCSS();
        
        // Initial cleanup
        setTimeout(removeFeedAds, 500);
        setTimeout(skipVideoAds, 1000);
        
        // Setup observers
        setupFeedObserver();
        setupVideoAdObserver();
        
        // Start skip interval
        startSkipInterval();
    }

    // Cleanup function
    function cleanup() {
        if (observer) observer.disconnect();
        if (videoObserver) videoObserver.disconnect();
        if (skipInterval) clearInterval(skipInterval);
    }

    // Handle SPA navigation
    let lastUrl = location.href;
    function checkUrlChange() {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            // Re-initialize on navigation
            setTimeout(() => {
                removeFeedAds();
                setupVideoAdObserver();
            }, 1000);
        }
    }

    // Watch for URL changes
    const urlObserver = new MutationObserver(checkUrlChange);
    urlObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });

    // Initialize based on document state
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);

})();
