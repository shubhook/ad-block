/**
 * Shared Settings Module
 * Single source of truth for default settings and helper functions
 */
const ZenSettings = (function() {
    'use strict';

    // Default settings - single source of truth
    const defaultSettings = {
        enabled: true,
        showNotifications: true,
        blockTrackers: true,
        blockSocial: false,
        logLevel: 'warn',
        customFilters: '',
        filterLists: [
            'https://easylist.to/easylist/easylist.txt',
            'https://easylist.to/easylist/easyprivacy.txt'
        ],
        whitelist: [],
        stats: {
            totalBlocked: 0,
            todayBlocked: 0,
            trackersBlocked: 0,
            pagesCleaned: 0,
            lastReset: new Date().toDateString()
        }
    };

    // Built-in ad domains for network blocking
    const builtinDomains = new Set([
        'doubleclick.net',
        'googlesyndication.com',
        'googleadservices.com',
        'google-analytics.com',
        'googletagmanager.com',
        'googletagservices.com',
        'adservice.google.com',
        'pagead2.googlesyndication.com',
        'amazon-adsystem.com',
        'ads.facebook.com',
        'pixel.facebook.com',
        'ads-twitter.com',
        'ads-api.twitter.com',
        'analytics.twitter.com',
        'adserver.yahoo.com',
        'advertising.yahoo.com',
        'adnxs.com',
        'advertising.com',
        'appnexus.com',
        'criteo.com',
        'criteo.net',
        'taboola.com',
        'outbrain.com',
        'sharethrough.com',
        'rubiconproject.com',
        'pubmatic.com',
        'openx.net',
        'casalemedia.com',
        'contextweb.com',
        'media.net',
        'moatads.com',
        'scorecardresearch.com'
    ]);

    // Tracker patterns for classification
    const trackerPatterns = [
        /google-analytics\.com/i,
        /googletagmanager\.com/i,
        /facebook\.com\/(tr|pixel)/i,
        /pixel\.facebook\.com/i,
        /analytics\.twitter\.com/i,
        /scorecardresearch\.com/i,
        /moatads\.com/i,
        /hotjar\.com/i,
        /fullstory\.com/i,
        /amplitude\.com/i,
        /mixpanel\.com/i,
        /segment\.com/i
    ];

    /**
     * Get default settings (returns a deep copy)
     */
    function getDefaults() {
        return JSON.parse(JSON.stringify(defaultSettings));
    }

    /**
     * Get builtin blocked domains
     */
    function getBuiltinDomains() {
        return builtinDomains;
    }

    /**
     * Check if a URL matches tracker patterns
     */
    function isTracker(url) {
        return trackerPatterns.some(pattern => pattern.test(url));
    }

    /**
     * Extract domain from URL
     */
    function extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (e) {
            return '';
        }
    }

    /**
     * Check if domain should be blocked
     */
    function shouldBlockDomain(domain, blockedDomains) {
        if (!domain) return false;
        
        // Check exact match first (fast path)
        if (blockedDomains.has(domain)) {
            return true;
        }
        
        // Check if domain ends with any blocked domain
        for (const blocked of blockedDomains) {
            if (domain === blocked || domain.endsWith('.' + blocked)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if domain is whitelisted
     */
    function isWhitelisted(domain, whitelist) {
        if (!domain || !whitelist || whitelist.length === 0) {
            return false;
        }
        
        return whitelist.some(whitelisted => {
            return domain === whitelisted || domain.endsWith('.' + whitelisted);
        });
    }

    /**
     * Create default stats object
     */
    function createDefaultStats() {
        return {
            totalBlocked: 0,
            todayBlocked: 0,
            trackersBlocked: 0,
            pagesCleaned: 0,
            lastReset: new Date().toDateString()
        };
    }

    /**
     * Logging utility
     */
    function log(message, level, currentLogLevel) {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        const msgLevel = levels[level] || 0;
        const maxLevel = levels[currentLogLevel] || 1;
        
        if (msgLevel <= maxLevel) {
            const prefix = '[Zen Ad Blocker]';
            switch (level) {
                case 'error':
                    console.error(prefix, message);
                    break;
                case 'warn':
                    console.warn(prefix, message);
                    break;
                case 'info':
                    console.info(prefix, message);
                    break;
                case 'debug':
                    console.debug(prefix, message);
                    break;
                default:
                    console.log(prefix, message);
            }
        }
    }

    // Expose public API
    return {
        getDefaults,
        getBuiltinDomains,
        isTracker,
        extractDomain,
        shouldBlockDomain,
        isWhitelisted,
        createDefaultStats,
        log
    };
})();

// Make available globally
if (typeof window !== 'undefined') {
    window.ZenSettings = ZenSettings;
}
