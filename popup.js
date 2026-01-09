// Popup JavaScript
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
    
    // Current settings
    let settings = defaultSettings;
    let currentTab = null;
    let currentDomain = '';
    
    // Initialize popup
    function init() {
        loadSettings();
        getCurrentTab();
        setupEventListeners();
        updateUI();
    }
    
    // Load settings from storage
    function loadSettings() {
        browser.storage.sync.get(defaultSettings, function(loadedSettings) {
            settings = loadedSettings;
            updateUI();
        });
    }
    
    // Get current tab information
    function getCurrentTab() {
        browser.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length > 0) {
                currentTab = tabs[0];
                currentDomain = extractDomain(currentTab.url);
                updateSiteInfo();
            }
        });
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
    
    // Setup event listeners
    function setupEventListeners() {
        // Enable/disable toggle
        document.getElementById('enableToggle').addEventListener('click', toggleEnabled);
        
        // Action buttons
        document.getElementById('whitelistBtn').addEventListener('click', toggleWhitelist);
        document.getElementById('optionsBtn').addEventListener('click', openOptions);
        document.getElementById('resetBtn').addEventListener('click', resetStatistics);
        
        // Footer link
        document.getElementById('donateLink').addEventListener('click', function(e) {
            e.preventDefault();
            browser.tabs.create({ url: 'https://github.com/anomalyco/opencode' });
        });
    }
    
    // Toggle enabled state
    function toggleEnabled() {
        settings.enabled = !settings.enabled;
        browser.storage.sync.set({ enabled: settings.enabled }, function() {
            updateUI();
        });
    }
    
    // Toggle whitelist for current site
    function toggleWhitelist() {
        if (!currentDomain) return;
        
        const index = settings.whitelist.indexOf(currentDomain);
        if (index > -1) {
            // Remove from whitelist
            settings.whitelist.splice(index, 1);
            showNotification('Site removed from whitelist');
        } else {
            // Add to whitelist
            settings.whitelist.push(currentDomain);
            showNotification('Site added to whitelist');
        }
        
        browser.storage.sync.set({ whitelist: settings.whitelist }, function() {
            updateSiteInfo();
        });
    }
    
    // Open options page
    function openOptions() {
        browser.runtime.openOptionsPage();
    }
    
    // Reset statistics
    function resetStatistics() {
        if (confirm('Are you sure you want to reset all statistics?')) {
            const stats = {
                totalBlocked: 0,
                todayBlocked: 0,
                trackersBlocked: 0,
                pagesCleaned: 0,
                lastReset: new Date().toDateString()
            };
            
            browser.storage.sync.set({ stats }, function() {
                settings.stats = stats;
                updateUI();
                showNotification('Statistics reset successfully');
            });
        }
    }
    
    // Update UI elements
    function updateUI() {
        updateStatus();
        updateToggle();
        updateStatistics();
    }
    
    // Update status display
    function updateStatus() {
        const statusEl = document.getElementById('status');
        const statusTextEl = document.getElementById('statusText');
        
        if (settings.enabled) {
            statusEl.className = 'status enabled';
            statusTextEl.textContent = 'Ad Blocker Active';
        } else {
            statusEl.className = 'status disabled';
            statusTextEl.textContent = 'Ad Blocker Disabled';
        }
    }
    
    // Update toggle switch
    function updateToggle() {
        const toggleEl = document.getElementById('enableToggle');
        if (settings.enabled) {
            toggleEl.classList.add('active');
        } else {
            toggleEl.classList.remove('active');
        }
    }
    
    // Update statistics display
    function updateStatistics() {
        document.getElementById('todayBlocked').textContent = settings.stats.todayBlocked || 0;
        document.getElementById('totalBlocked').textContent = settings.stats.totalBlocked || 0;
        document.getElementById('trackersBlocked').textContent = settings.stats.trackersBlocked || 0;
    }
    
    // Update site information
    function updateSiteInfo() {
        const siteUrlEl = document.getElementById('siteUrl');
        const siteStatusEl = document.getElementById('siteStatus');
        const whitelistBtnEl = document.getElementById('whitelistBtn');
        
        if (currentDomain) {
            siteUrlEl.textContent = currentDomain;
            
            const isWhitelisted = settings.whitelist.includes(currentDomain);
            if (isWhitelisted) {
                siteStatusEl.textContent = 'Whitelisted';
                siteStatusEl.className = 'site-status clean';
                whitelistBtnEl.textContent = 'Remove from Whitelist';
            } else {
                siteStatusEl.textContent = 'Protected';
                siteStatusEl.className = 'site-status clean';
                whitelistBtnEl.textContent = 'Whitelist Current Site';
            }
        } else {
            siteUrlEl.textContent = 'No active site';
            siteStatusEl.textContent = 'N/A';
            siteStatusEl.className = 'site-status';
            whitelistBtnEl.textContent = 'Whitelist Current Site';
            whitelistBtnEl.disabled = true;
        }
    }
    
    // Show notification (if enabled)
    function showNotification(message) {
        if (settings.showNotifications) {
            // Create a temporary notification element
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: #333;
                color: white;
                padding: 10px 15px;
                border-radius: 4px;
                font-size: 14px;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s;
            `;
            
            document.body.appendChild(notification);
            
            // Fade in
            setTimeout(() => {
                notification.style.opacity = '1';
            }, 10);
            
            // Fade out and remove
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 2000);
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();