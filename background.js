// Zen Ad Blocker - Background Script
(function() {
    'use strict';

    // Use shared settings
    const defaultSettings = ZenSettings.getDefaults();
    const builtinDomains = ZenSettings.getBuiltinDomains();
    
    // In-memory cache for filters and settings
    let settings = { ...defaultSettings };
    let blockedDomains = new Set(builtinDomains);
    let filterRules = [];
    
    // Stats update throttling
    let pendingStatsUpdate = null;
    const STATS_UPDATE_INTERVAL = 5000; // Only write stats every 5 seconds
    
    // Initialize the background script
    function init() {
        loadSettings();
        setupWebRequestListener();
        setupMessageListener();
        setupAlarmListener();
        checkDailyReset();
    }
    
    // Load settings from storage
    function loadSettings() {
        browser.storage.sync.get(defaultSettings, function(loadedSettings) {
            if (browser.runtime.lastError) {
                log('Error loading settings: ' + browser.runtime.lastError.message, 'error');
                return;
            }
            settings = loadedSettings;
            loadFilters();
            log('Settings loaded', 'info');
        });
    }
    
    // Load and parse filter lists
    function loadFilters() {
        // Start with builtin domains
        blockedDomains = new Set(builtinDomains);
        filterRules = [];
        
        // Add custom filters
        if (settings.customFilters) {
            parseCustomFilters(settings.customFilters);
        }
        
        // Load external filter lists
        loadFilterLists();
    }
    
    // Parse custom filters
    function parseCustomFilters(customFilters) {
        const lines = customFilters.split('\n');
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith('!') || line.startsWith('[')) {
                continue;
            }
            
            // Domain blocking rule: ||domain.com^
            if (line.startsWith('||') && !line.includes('$')) {
                const domain = line.substring(2).replace(/[\^$]/g, '').split('/')[0];
                if (domain && !domain.includes('*')) {
                    blockedDomains.add(domain);
                }
            }
            // Element hiding rule: ##selector (store for content scripts)
            else if (line.startsWith('##')) {
                const selector = line.substring(2);
                if (selector) {
                    filterRules.push({ type: 'element', selector: selector });
                }
            }
        }
    }
    
    // Load filter lists from URLs
    function loadFilterLists() {
        if (!settings.filterLists || settings.filterLists.length === 0) {
            return;
        }
        
        for (const url of settings.filterLists) {
            fetch(url, { 
                cache: 'default',
                headers: { 'Accept': 'text/plain' }
            })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.text();
            })
            .then(text => parseFilterList(text))
            .catch(error => log(`Failed to load filter list ${url}: ${error.message}`, 'warn'));
        }
    }
    
    // Parse filter list text (EasyList format)
    function parseFilterList(text) {
        const lines = text.split('\n');
        let added = 0;
        
        for (const rawLine of lines) {
            const line = rawLine.trim();
            
            // Skip comments, empty lines, and headers
            if (!line || line.startsWith('!') || line.startsWith('[')) {
                continue;
            }
            
            // Only parse domain blocking rules for now
            // Format: ||domain.com^ or ||domain.com^$options
            if (line.startsWith('||') && !line.startsWith('||/')) {
                // Extract domain part
                let domain = line.substring(2);
                
                // Remove options
                const optionIndex = domain.indexOf('$');
                if (optionIndex !== -1) {
                    domain = domain.substring(0, optionIndex);
                }
                
                // Remove path and anchors
                domain = domain.replace(/[\^/].*$/, '');
                
                // Skip wildcards and complex patterns
                if (domain && !domain.includes('*') && !domain.includes('?')) {
                    blockedDomains.add(domain);
                    added++;
                }
            }
        }
        
        log(`Parsed filter list: added ${added} domains`, 'info');
    }
    
    // Setup web request listener
    function setupWebRequestListener() {
        if (!browser.webRequest) {
            log('webRequest API not available', 'warn');
            return;
        }
        
        browser.webRequest.onBeforeRequest.addListener(
            handleRequest,
            { urls: ["<all_urls>"] },
            ["blocking"]
        );
    }
    
    // Handle web request
    function handleRequest(details) {
        if (!settings.enabled) {
            return {};
        }
        
        const url = details.url;
        const domain = ZenSettings.extractDomain(url);
        
        // Check whitelist first (fast path)
        if (ZenSettings.isWhitelisted(domain, settings.whitelist)) {
            return {};
        }
        
        // Check initiator/origin whitelist
        const initiator = details.initiator || details.originUrl || '';
        const initiatorDomain = ZenSettings.extractDomain(initiator);
        if (initiatorDomain && ZenSettings.isWhitelisted(initiatorDomain, settings.whitelist)) {
            return {};
        }
        
        // Check if should block
        if (ZenSettings.shouldBlockDomain(domain, blockedDomains)) {
            // Update stats (throttled)
            incrementStat('totalBlocked');
            incrementStat('todayBlocked');
            
            if (settings.blockTrackers && ZenSettings.isTracker(url)) {
                incrementStat('trackersBlocked');
            }
            
            log(`Blocked: ${domain}`, 'debug');
            return { cancel: true };
        }
        
        return {};
    }
    
    // Setup message listener
    function setupMessageListener() {
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                handleMessage(message, sender, sendResponse);
            } catch (e) {
                log('Message handler error: ' + e.message, 'error');
                sendResponse({ error: e.message });
            }
            return true; // Keep channel open for async response
        });
    }
    
    // Handle messages from popup/options/content scripts
    function handleMessage(message, sender, sendResponse) {
        const action = message.action || message.type;
        
        switch (action) {
            case 'updateFilters':
                loadFilters();
                sendResponse({ success: true });
                break;
                
            case 'getStats':
                sendResponse({ stats: settings.stats });
                break;
                
            case 'getSettings':
                sendResponse({ settings: settings });
                break;
                
            case 'resetStats':
                resetStatistics();
                sendResponse({ success: true });
                break;
                
            case 'GET_BLOCKED_ELEMENTS':
                const query = (message.query || '').toLowerCase();
                const allBlocked = [
                    ...Array.from(blockedDomains),
                    ...filterRules.filter(r => r.selector).map(r => r.selector)
                ];
                
                const filtered = query 
                    ? allBlocked.filter(item => item.toLowerCase().includes(query))
                    : allBlocked;
                
                sendResponse({ results: filtered.slice(0, 20) });
                break;
                
            case 'incrementPagesCleaned':
                incrementStat('pagesCleaned');
                sendResponse({ success: true });
                break;
                
            default:
                sendResponse({ error: 'Unknown action: ' + action });
        }
    }
    
    // Setup alarm listener for periodic tasks
    function setupAlarmListener() {
        if (!browser.alarms) {
            log('alarms API not available', 'warn');
            return;
        }
        
        browser.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'dailyReset') {
                checkDailyReset();
            } else if (alarm.name === 'updateFilters') {
                loadFilters();
            } else if (alarm.name === 'flushStats') {
                flushStats();
            }
        });
        
        // Create alarms
        browser.alarms.create('dailyReset', { periodInMinutes: 60 }); // Check hourly
        browser.alarms.create('updateFilters', { periodInMinutes: 360 }); // Update every 6 hours
        browser.alarms.create('flushStats', { periodInMinutes: 1 }); // Flush stats every minute
    }
    
    // Increment stat (throttled)
    function incrementStat(stat) {
        if (!settings.stats) {
            settings.stats = ZenSettings.createDefaultStats();
        }
        settings.stats[stat] = (settings.stats[stat] || 0) + 1;
        
        // Throttle storage writes
        if (!pendingStatsUpdate) {
            pendingStatsUpdate = setTimeout(flushStats, STATS_UPDATE_INTERVAL);
        }
    }
    
    // Flush stats to storage
    function flushStats() {
        if (pendingStatsUpdate) {
            clearTimeout(pendingStatsUpdate);
            pendingStatsUpdate = null;
        }
        
        browser.storage.sync.set({ stats: settings.stats }, function() {
            if (browser.runtime.lastError) {
                log('Error saving stats: ' + browser.runtime.lastError.message, 'warn');
            }
        });
    }
    
    // Check and reset daily stats
    function checkDailyReset() {
        const today = new Date().toDateString();
        if (!settings.stats) {
            settings.stats = ZenSettings.createDefaultStats();
        }
        
        if (settings.stats.lastReset !== today) {
            settings.stats.todayBlocked = 0;
            settings.stats.lastReset = today;
            flushStats();
            log('Daily stats reset', 'info');
        }
    }
    
    // Reset all statistics
    function resetStatistics() {
        settings.stats = ZenSettings.createDefaultStats();
        flushStats();
        log('Statistics reset', 'info');
    }
    
    // Logging function
    function log(message, level) {
        ZenSettings.log(message, level, settings.logLevel);
    }
    
    // Initialize the extension
    init();
    
})();
