(function() {
    'use strict';

    // CSS to hide YouTube ads
    const adHidingCSS = `
        /* Video ads */
        .ytp-ad-module,
        .ytp-ad-preview-container,
        .ytp-ad-overlay,
        .ytp-ad-overlay-container,
        .ytp-ad-image-overlay,
        .ytp-ad-text-overlay,
        .ytp-ad-skip-button,
        .ytp-ad-skip-button-container,
        
        /* Ad containers */
        .video-ads,
        .ad-container,
        .ad-display,
        .ad-slot,
        .ad-creative,
        
        /* Sponsored content */
        .ytp-ce-element,
        .ytp-ce-covering-overlay,
        .ytp-ce-shadow,
        .ytp-ce-channel-metadata,
        .ytp-ce-video-title,
        
        /* Homepage ads */
        .ytd-display-ad-renderer,
        .ytd-promoted-sparkles-text-renderer,
        .ytd-promoted-video-renderer,
        .ytd-in-feed-ad-layout-renderer,
        .ytd-ad-slot-renderer,
        
        /* Sidebar ads */
        .ytd-watch-next-secondary-results-renderer .ytd-display-ad-renderer,
        
        /* Comment section ads */
        .ytd-comment-thread-renderer #ad-comment-renderer,
        
        /* End screen ads */
        .ytp-ce-endscreen,
        
        /* General ad classes */
        [class*="ad-"],
        [class*="ads-"],
        [id*="ad-"],
        [id*="ads-"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
        }
    `;

    // Inject CSS to hide ads
    function injectAdHidingCSS() {
        const style = document.createElement('style');
        style.textContent = adHidingCSS;
        style.id = 'youtube-ad-blocker-styles';
        (document.head || document.documentElement).appendChild(style);
    }

    // Skip video ads
    function skipVideoAds() {
        const video = document.querySelector('video');
        if (!video) return;

        // Skip ad if it's playing
        const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-container button');
        if (skipButton) {
            skipButton.click();
            console.log('YouTube Ad Blocker: Skipped video ad');
        }

        // Fast forward through ads
        const adContainer = document.querySelector('.ytp-ad-module');
        if (adContainer && video.duration > 0) {
            // Try to skip to the end of the ad
            video.currentTime = video.duration;
            console.log('YouTube Ad Blocker: Fast-forwarded through ad');
        }

        // Remove ad overlays
        const adOverlays = document.querySelectorAll('.ytp-ad-overlay, .ytp-ad-preview-container');
        adOverlays.forEach(overlay => overlay.remove());
    }

    // Remove sponsored content
    function removeSponsoredContent() {
        const sponsoredElements = document.querySelectorAll('.ytp-ce-element, .ytp-ce-covering-overlay');
        sponsoredElements.forEach(element => element.remove());
    }

    // Remove homepage ads
    function removeHomepageAds() {
        const homepageAds = document.querySelectorAll('.ytd-display-ad-renderer, .ytd-promoted-sparkles-text-renderer, .ytd-promoted-video-renderer, .ytd-in-feed-ad-layout-renderer, .ytd-ad-slot-renderer');
        homepageAds.forEach(ad => ad.remove());
    }

    // Remove sidebar ads
    function removeSidebarAds() {
        const sidebarAds = document.querySelectorAll('.ytd-watch-next-secondary-results-renderer .ytd-display-ad-renderer');
        sidebarAds.forEach(ad => ad.remove());
    }

    // Remove comment section ads
    function removeCommentAds() {
        const commentAds = document.querySelectorAll('#ad-comment-renderer');
        commentAds.forEach(ad => ad.closest('ytd-comment-thread-renderer')?.remove());
    }

    // Main ad removal function
    function removeAds() {
        skipVideoAds();
        removeSponsoredContent();
        removeHomepageAds();
        removeSidebarAds();
        removeCommentAds();
    }

    // MutationObserver to detect dynamic ads
    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldRemoveAds = false;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if any ad-related elements were added
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList && (
                                node.classList.contains('ytp-ad-module') ||
                                node.classList.contains('ytp-ad-overlay') ||
                                node.classList.contains('ytp-ce-element') ||
                                node.classList.contains('ytd-display-ad-renderer') ||
                                node.classList.contains('ytd-promoted-video-renderer') ||
                                node.classList.toString().includes('ad-')
                            )) {
                                shouldRemoveAds = true;
                            }
                        }
                    });
                }
            });

            if (shouldRemoveAds) {
                setTimeout(removeAds, 100);
            }
        });

        // Start observing the entire document
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'id']
        });

        return observer;
    }

    // Handle video player events
    function setupVideoPlayerEvents() {
        const video = document.querySelector('video');
        if (!video) return;

        // Listen for time updates to skip ads
        video.addEventListener('timeupdate', () => {
            skipVideoAds();
        });

        // Listen for loaded metadata
        video.addEventListener('loadedmetadata', () => {
            setTimeout(skipVideoAds, 500);
        });

        // Listen for play events
        video.addEventListener('play', () => {
            setTimeout(skipVideoAds, 500);
        });
    }

    // Initialize the ad blocker
    function init() {
        console.log('YouTube Ad Blocker: Initializing...');
        
        // Inject CSS
        injectAdHidingCSS();
        
        // Initial ad removal
        setTimeout(removeAds, 1000);
        
        // Setup video player events
        setTimeout(setupVideoPlayerEvents, 1500);
        
        // Setup mutation observer
        setTimeout(setupMutationObserver, 2000);
        
        // Periodic ad removal
        setInterval(removeAds, 3000);
        
        console.log('YouTube Ad Blocker: Initialized successfully');
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

    // Handle navigation changes (YouTube is a SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(init, 2000);
        }
    }).observe(document, { subtree: true, childList: true });

})();