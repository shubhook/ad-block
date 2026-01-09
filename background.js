// Zen Ad Blocker - Background Script
(function() {
    'use strict';
    
    // Default settings
    const defaultSettings = {
        enabled: true,
        showNotifications: true,
        blockTrackers: true,
        blockSocial: true,
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
    
    // In-memory cache for filters and settings
    let settings = defaultSettings;
    let blockedDomains = new Set();
    let filterRules = [];
    
    // Built-in ad domains
    const builtinDomains = [
        "doubleclick.net",
        "googlesyndication.com",
        "adsystem.com",
        "adservice.google.com",
        "googleadservices.com",
        "googletagmanager.com",
        "googletagservices.com",
        "google-analytics.com",
        "facebook.com/tr",
        "connect.facebook.net",
        "amazon-adsystem.com",
        "ads-twitter.com",
        "ads-api.twitter.com",
        "adserver.yahoo.com",
        "advertising.yahoo.com",
        "atdmt.com",
        "adsymptotic.com",
        "adnxs.com",
        "advertising.com",
        "appnexus.com",
        "criteo.com",
        "taboola.com",
        "outbrain.com",
        "sharethrough.com",
        "rubiconproject.com",
        "indexww.com",
        "adtechus.com",
        "adsystem.us",
        "doubleclick.com",
        "googleads.g.doubleclick.net"
    ];
    
    // Initialize the background script
    function init() {
        loadSettings();
        setupWebRequestListener();
        setupMessageListener();
        setupAlarmListener();
        updateStatistics();
    }
    
    // Load settings from storage
    function loadSettings() {
        browser.storage.sync.get(defaultSettings, function(loadedSettings) {
            settings = loadedSettings;
            loadFilters();
            log('Settings loaded', 'info');
        });
    }
    
    // Load and parse filter lists
    function loadFilters() {
        blockedDomains.clear();
        filterRules = [];
        
        // Add built-in domains
        builtinDomains.forEach(domain => blockedDomains.add(domain));
        
        // Add custom filters
        if (settings.customFilters) {
            parseCustomFilters(settings.customFilters);
        }
        
        // Load filter lists
        loadFilterLists();
    }
    
    // Parse custom filters
    function parseCustomFilters(customFilters) {
        const lines = customFilters.split('\n');
        lines.forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('!') && !line.startsWith('#')) {
                if (line.startsWith('||')) {
                    // Domain blocking rule
                    const domain = line.substring(2).replace('^', '');
                    blockedDomains.add(domain);
                } else if (line.startsWith('##')) {
                    // Element hiding rule
                    const selector = line.substring(2);
                    filterRules.push({ type: 'element', selector: selector });
                }
            }
        });
    }
    
    // Load filter lists from URLs
    function loadFilterLists() {
        settings.filterLists.forEach(url => {
            fetch(url)
                .then(response => response.text())
                .then(text => parseFilterList(text))
                .catch(error => log(`Failed to load filter list ${url}: ${error}`, 'error'));
        });
    }
    
    // Parse filter list text
    function parseFilterList(text) {
        const lines = text.split('\n');
        lines.forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('!') && !line.startsWith('#')) {
                if (line.startsWith('||')) {
                    const domain = line.substring(2).replace('^', '');
                    blockedDomains.add(domain);
                }
            }
        });
    }
    
    // Setup web request listener
    function setupWebRequestListener() {
        browser.webRequest.onBeforeRequest.addListener(
            (details) => {
                if (!settings.enabled) {
                    return {};
                }
                
                const url = details.url;
                const domain = extractDomain(url);
                
                // Check whitelist
                if (isWhitelisted(domain)) {
                    return {};
                }
                
                // Check if should block
                if (shouldBlock(url, domain)) {
                    updateStats('totalBlocked');
                    updateStats('todayBlocked');
                    
                    if (settings.blockTrackers && isTracker(url)) {
                        updateStats('trackersBlocked');
                    }
                    
                    log(`Blocked: ${url}`, 'info');
                    return { cancel: true };
                }
                
                return {};
            },
            { urls: ["<all_urls>"] },
            ["blocking"]
        );
    }
    
    // Setup message listener
    function setupMessageListener() {
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'updateFilters':
                    loadFilters();
                    sendResponse({ success: true });
                    break;
                case 'getStats':
                    sendResponse({ stats: settings.stats });
                    break;
                case 'resetStats':
                    resetStatistics();
                    sendResponse({ success: true });
                    break;
                default:
                    sendResponse({ error: 'Unknown action' });
            }
        });
    }
    
    // Setup alarm listener for periodic tasks
    function setupAlarmListener() {
        browser.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'dailyReset') {
                resetDailyStats();
            } else if (alarm.name === 'updateFilters') {
                loadFilters();
            }
        });
        
        // Create alarms
        browser.alarms.create('dailyReset', { periodInMinutes: 24 * 60 });
        browser.alarms.create('updateFilters', { periodInMinutes: 60 });
    }
    
    // Check if URL should be blocked
    function shouldBlock(url, domain) {
        // Check domain blocking
        for (const blockedDomain of blockedDomains) {
            if (domain.includes(blockedDomain) || url.includes(blockedDomain)) {
                return true;
            }
        }
        
        // Check custom filter rules
        return filterRules.some(rule => {
            if (rule.type === 'url' && rule.pattern) {
                return new RegExp(rule.pattern).test(url);
            }
            return false;
        });
    }
    
    // Check if domain is whitelisted
    function isWhitelisted(domain) {
        return settings.whitelist.some(whitelisted => {
            return domain === whitelisted || domain.endsWith('.' + whitelisted);
        });
    }
    
    // Check if URL is a tracker
    function isTracker(url) {
        const trackerPatterns = [
            /google-analytics/,
            /facebook\.com\/tr/,
            /doubleclick/,
            /googletagmanager/,
            /googlesyndication/,
            /adsystem/
        ];
        
        return trackerPatterns.some(pattern => pattern.test(url));
    }
    
    // Extract domain from URL
    function extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (e) {
            return '';
        }
    }
    
    // Update statistics
    function updateStats(stat) {
        if (settings.stats) {
            settings.stats[stat] = (settings.stats[stat] || 0) + 1;
            browser.storage.sync.set({ stats: settings.stats });
        }
    }
    
    // Reset daily statistics
    function resetDailyStats() {
        const today = new Date().toDateString();
        if (settings.stats.lastReset !== today) {
            settings.stats.todayBlocked = 0;
            settings.stats.lastReset = today;
            browser.storage.sync.set({ stats: settings.stats });
        }
    }
    
    // Reset all statistics
    function resetStatistics() {
        settings.stats = {
            totalBlocked: 0,
            todayBlocked: 0,
            trackersBlocked: 0,
            pagesCleaned: 0,
            lastReset: new Date().toDateString()
        };
        browser.storage.sync.set({ stats: settings.stats });
    }
    
    // Update statistics periodically
    function updateStatistics() {
        resetDailyStats();
    }
    
    // Logging function
    function log(message, level) {
        if (settings.logLevel !== 'none') {
            const levels = { error: 0, warn: 1, info: 2, debug: 3 };
            const currentLevel = levels[level] || 0;
            const maxLevel = levels[settings.logLevel] || 1;
            
            if (currentLevel <= maxLevel) {
                console.log(`[Zen Ad Blocker] ${message}`);
            }
        }
    }
    
    // Initialize the extension
    init();
    
})();
