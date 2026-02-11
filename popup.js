// Popup JavaScript
(function() {
    'use strict';
    
    // Current settings and state
    let settings = null;
    let currentTab = null;
    let currentDomain = '';
    
    // Initialize popup
    function init() {
        loadSettings();
        getCurrentTab();
        setupEventListeners();
    }
    
    // Load settings from storage
    function loadSettings() {
        const defaults = typeof ZenSettings !== 'undefined' 
            ? ZenSettings.getDefaults() 
            : getDefaultSettings();
            
        browser.storage.sync.get(defaults, function(loadedSettings) {
            if (browser.runtime.lastError) {
                console.error('Error loading settings:', browser.runtime.lastError);
                settings = defaults;
            } else {
                settings = loadedSettings;
            }
            updateUI();
        });
    }
    
    // Fallback default settings
    function getDefaultSettings() {
        return {
            enabled: true,
            showNotifications: true,
            whitelist: [],
            stats: {
                totalBlocked: 0,
                todayBlocked: 0,
                trackersBlocked: 0,
                pagesCleaned: 0
            }
        };
    }
    
    // Get current tab information
    function getCurrentTab() {
        browser.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs && tabs.length > 0) {
                currentTab = tabs[0];
                currentDomain = extractDomain(currentTab.url);
                updateSiteInfo();
            }
        });
    }
    
    // Extract domain from URL
    function extractDomain(url) {
        if (typeof ZenSettings !== 'undefined') {
            return ZenSettings.extractDomain(url);
        }
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
        const enableToggle = document.getElementById('enableToggle');
        if (enableToggle) {
            enableToggle.addEventListener('click', toggleEnabled);
        }
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 300));
            searchInput.addEventListener('focus', handleSearch);
            
            // Close search results when clicking outside
            document.addEventListener('click', function(e) {
                const resultsContainer = document.getElementById('searchResults');
                if (resultsContainer && !searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                    resultsContainer.style.display = 'none';
                }
            });
        }
        
        // Action buttons
        const whitelistBtn = document.getElementById('whitelistBtn');
        if (whitelistBtn) {
            whitelistBtn.addEventListener('click', toggleWhitelist);
        }
        
        const optionsBtn = document.getElementById('optionsBtn');
        if (optionsBtn) {
            optionsBtn.addEventListener('click', openOptions);
        }
        
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetStatistics);
        }
        
        // Footer link
        const donateLink = document.getElementById('donateLink');
        if (donateLink) {
            donateLink.addEventListener('click', function(e) {
                e.preventDefault();
                browser.tabs.create({ url: 'https://github.com/anomalyco/opencode' });
            });
        }
    }
    
    // Debounce helper
    function debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }
    
    // Toggle enabled state
    function toggleEnabled() {
        if (!settings) return;
        
        settings.enabled = !settings.enabled;
        browser.storage.sync.set({ enabled: settings.enabled }, function() {
            if (browser.runtime.lastError) {
                console.error('Error saving settings:', browser.runtime.lastError);
                return;
            }
            updateUI();
        });
    }
    
    // Toggle whitelist for current site
    function toggleWhitelist() {
        if (!currentDomain || !settings) return;
        
        if (!settings.whitelist) {
            settings.whitelist = [];
        }
        
        const index = settings.whitelist.indexOf(currentDomain);
        if (index > -1) {
            settings.whitelist.splice(index, 1);
            showNotification('Site removed from whitelist');
        } else {
            settings.whitelist.push(currentDomain);
            showNotification('Site added to whitelist');
        }
        
        browser.storage.sync.set({ whitelist: settings.whitelist }, function() {
            if (browser.runtime.lastError) {
                console.error('Error saving whitelist:', browser.runtime.lastError);
                return;
            }
            updateSiteInfo();
            // Notify background to update
            browser.runtime.sendMessage({ action: 'updateFilters' });
        });
    }
    
    // Open options page
    function openOptions() {
        browser.runtime.openOptionsPage();
    }
    
    // Reset statistics
    function resetStatistics() {
        if (!confirm('Are you sure you want to reset all statistics?')) {
            return;
        }
        
        browser.runtime.sendMessage({ action: 'resetStats' }, function(response) {
            if (response && response.success) {
                // Reload settings to get updated stats
                loadSettings();
                showNotification('Statistics reset successfully');
            }
        });
    }
    
    // Update UI elements
    function updateUI() {
        if (!settings) return;
        
        updateStatus();
        updateToggle();
        updateStatistics();
    }
    
    // Update status display
    function updateStatus() {
        const statusEl = document.getElementById('status');
        const statusTextEl = document.getElementById('statusText');
        
        if (!statusEl || !statusTextEl) return;
        
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
        if (!toggleEl) return;
        
        if (settings.enabled) {
            toggleEl.classList.add('active');
        } else {
            toggleEl.classList.remove('active');
        }
    }
    
    // Update statistics display
    function updateStatistics() {
        const stats = settings.stats || {};
        
        const todayEl = document.getElementById('todayBlocked');
        const totalEl = document.getElementById('totalBlocked');
        const trackersEl = document.getElementById('trackersBlocked');
        
        if (todayEl) todayEl.textContent = formatNumber(stats.todayBlocked || 0);
        if (totalEl) totalEl.textContent = formatNumber(stats.totalBlocked || 0);
        if (trackersEl) trackersEl.textContent = formatNumber(stats.trackersBlocked || 0);
    }
    
    // Format large numbers
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    // Update site information
    function updateSiteInfo() {
        const siteUrlEl = document.getElementById('siteUrl');
        const siteStatusEl = document.getElementById('siteStatus');
        const whitelistBtnEl = document.getElementById('whitelistBtn');
        
        if (!siteUrlEl || !siteStatusEl || !whitelistBtnEl) return;
        
        if (currentDomain) {
            siteUrlEl.textContent = currentDomain;
            
            const whitelist = settings?.whitelist || [];
            const isWhitelisted = whitelist.includes(currentDomain);
            
            if (isWhitelisted) {
                siteStatusEl.textContent = 'Whitelisted';
                siteStatusEl.className = 'site-status warning';
                whitelistBtnEl.textContent = 'Remove from Whitelist';
            } else {
                siteStatusEl.textContent = 'Protected';
                siteStatusEl.className = 'site-status clean';
                whitelistBtnEl.textContent = 'Whitelist This Site';
            }
            whitelistBtnEl.disabled = false;
        } else {
            siteUrlEl.textContent = 'No active site';
            siteStatusEl.textContent = 'N/A';
            siteStatusEl.className = 'site-status';
            whitelistBtnEl.textContent = 'Whitelist This Site';
            whitelistBtnEl.disabled = true;
        }
    }
    
    // Handle search functionality
    function handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput ? searchInput.value.trim() : '';
        const resultsContainer = document.getElementById('searchResults');
        
        if (!resultsContainer) return;
        
        if (!query) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        // Get blocked elements from background script
        browser.runtime.sendMessage({ 
            type: 'GET_BLOCKED_ELEMENTS', 
            query: query 
        }, function(response) {
            if (response && response.results) {
                displaySearchResults(response.results, query);
            } else {
                displaySearchResults([], query);
            }
        });
    }
    
    // Display search results (safe - no innerHTML with user data)
    function displaySearchResults(results, query) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;
        
        // Clear previous results safely
        while (resultsContainer.firstChild) {
            resultsContainer.removeChild(resultsContainer.firstChild);
        }
        
        if (results.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'search-no-results';
            noResults.textContent = 'No results found';
            resultsContainer.appendChild(noResults);
        } else {
            results.forEach(result => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.textContent = result; // Safe: using textContent, not innerHTML
                item.addEventListener('click', () => {
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.value = result;
                    }
                    resultsContainer.style.display = 'none';
                    showNotification('Selected: ' + result);
                });
                resultsContainer.appendChild(item);
            });
        }
        
        resultsContainer.style.display = 'block';
    }
    
    // Show notification
    function showNotification(message) {
        if (!settings?.showNotifications) return;
        
        // Remove existing notification
        const existing = document.querySelector('.popup-notification');
        if (existing) {
            existing.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = 'popup-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 13px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        document.body.appendChild(notification);
        
        // Fade in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
        });
        
        // Fade out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
