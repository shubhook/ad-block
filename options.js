// Options page JavaScript
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
    
    // Initialize the options page
    function init() {
        loadSettings();
        setupEventListeners();
        setupTabs();
        loadStatistics();
    }
    
    // Load settings from storage
    function loadSettings() {
        browser.storage.sync.get(defaultSettings, function(settings) {
            // General settings
            document.getElementById('enabled').checked = settings.enabled;
            document.getElementById('showNotifications').checked = settings.showNotifications;
            document.getElementById('blockTrackers').checked = settings.blockTrackers;
            document.getElementById('blockSocial').checked = settings.blockSocial;
            document.getElementById('logLevel').value = settings.logLevel;
            
            // Filters
            document.getElementById('customFilters').value = settings.customFilters;
            populateFilterLists(settings.filterLists);
            
            // Whitelist
            populateWhitelist(settings.whitelist);
        });
    }
    
    // Save settings to storage
    function saveSettings() {
        const settings = {
            enabled: document.getElementById('enabled').checked,
            showNotifications: document.getElementById('showNotifications').checked,
            blockTrackers: document.getElementById('blockTrackers').checked,
            blockSocial: document.getElementById('blockSocial').checked,
            logLevel: document.getElementById('logLevel').value,
            customFilters: document.getElementById('customFilters').value
        };
        
        browser.storage.sync.set(settings, function() {
            showStatus('Settings saved successfully!', 'success');
        });
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Save general settings
        document.getElementById('saveGeneral').addEventListener('click', saveSettings);
        
        // Filter management
        document.getElementById('addFilter').addEventListener('click', addFilterList);
        document.getElementById('updateFilters').addEventListener('click', updateAllFilters);
        
        // Whitelist management
        document.getElementById('addWhitelist').addEventListener('click', addToWhitelist);
        
        // Statistics
        document.getElementById('resetStats').addEventListener('click', resetStatistics);
        document.getElementById('exportStats').addEventListener('click', exportStatistics);
    }
    
    // Setup tabs
    function setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                document.getElementById(tabName).classList.add('active');
            });
        });
    }
    
    // Add filter list
    function addFilterList() {
        const url = document.getElementById('filterUrl').value.trim();
        if (!url) {
            showStatus('Please enter a valid URL', 'error');
            return;
        }
        
        browser.storage.sync.get('filterLists', function(data) {
            const filterLists = data.filterLists || [];
            if (!filterLists.includes(url)) {
                filterLists.push(url);
                browser.storage.sync.set({ filterLists }, function() {
                    document.getElementById('filterUrl').value = '';
                    populateFilterLists(filterLists);
                    showStatus('Filter list added successfully!', 'success');
                });
            } else {
                showStatus('Filter list already exists', 'error');
            }
        });
    }
    
    // Remove filter list
    function removeFilterList(url) {
        browser.storage.sync.get('filterLists', function(data) {
            const filterLists = data.filterLists || [];
            const index = filterLists.indexOf(url);
            if (index > -1) {
                filterLists.splice(index, 1);
                browser.storage.sync.set({ filterLists }, function() {
                    populateFilterLists(filterLists);
                    showStatus('Filter list removed', 'success');
                });
            }
        });
    }
    
    // Update all filters
    function updateAllFilters() {
        showStatus('Updating filters...', 'success');
        
        // Send message to background script to update filters
        browser.runtime.sendMessage({ action: 'updateFilters' }, function(response) {
            if (response && response.success) {
                showStatus('Filters updated successfully!', 'success');
            } else {
                showStatus('Failed to update filters', 'error');
            }
        });
    }
    
    // Populate filter lists
    function populateFilterLists(filterLists) {
        const container = document.getElementById('filterList');
        container.innerHTML = '';
        
        filterLists.forEach(url => {
            const item = document.createElement('div');
            item.className = 'filter-item';
            item.innerHTML = `
                <span>${url}</span>
                <button onclick="removeFilterList('${url}')">Remove</button>
            `;
            container.appendChild(item);
        });
    }
    
    // Add domain to whitelist
    function addToWhitelist() {
        const domain = document.getElementById('whitelistDomain').value.trim();
        if (!domain) {
            showStatus('Please enter a valid domain', 'error');
            return;
        }
        
        browser.storage.sync.get('whitelist', function(data) {
            const whitelist = data.whitelist || [];
            if (!whitelist.includes(domain)) {
                whitelist.push(domain);
                browser.storage.sync.set({ whitelist }, function() {
                    document.getElementById('whitelistDomain').value = '';
                    populateWhitelist(whitelist);
                    showStatus('Domain added to whitelist!', 'success');
                });
            } else {
                showStatus('Domain already whitelisted', 'error');
            }
        });
    }
    
    // Remove domain from whitelist
    function removeFromWhitelist(domain) {
        browser.storage.sync.get('whitelist', function(data) {
            const whitelist = data.whitelist || [];
            const index = whitelist.indexOf(domain);
            if (index > -1) {
                whitelist.splice(index, 1);
                browser.storage.sync.set({ whitelist }, function() {
                    populateWhitelist(whitelist);
                    showStatus('Domain removed from whitelist', 'success');
                });
            }
        });
    }
    
    // Populate whitelist
    function populateWhitelist(whitelist) {
        const container = document.getElementById('whitelistList');
        container.innerHTML = '';
        
        whitelist.forEach(domain => {
            const item = document.createElement('div');
            item.className = 'filter-item';
            item.innerHTML = `
                <span>${domain}</span>
                <button onclick="removeFromWhitelist('${domain}')">Remove</button>
            `;
            container.appendChild(item);
        });
    }
    
    // Load statistics
    function loadStatistics() {
        browser.storage.sync.get('stats', function(data) {
            const stats = data.stats || defaultSettings.stats;
            
            document.getElementById('totalBlocked').textContent = stats.totalBlocked;
            document.getElementById('todayBlocked').textContent = stats.todayBlocked;
            document.getElementById('trackersBlocked').textContent = stats.trackersBlocked;
            document.getElementById('pagesCleaned').textContent = stats.pagesCleaned;
        });
    }
    
    // Reset statistics
    function resetStatistics() {
        const stats = {
            totalBlocked: 0,
            todayBlocked: 0,
            trackersBlocked: 0,
            pagesCleaned: 0,
            lastReset: new Date().toDateString()
        };
        
        browser.storage.sync.set({ stats }, function() {
            loadStatistics();
            showStatus('Statistics reset successfully!', 'success');
        });
    }
    
    // Export statistics
    function exportStatistics() {
        browser.storage.sync.get(['stats', 'settings'], function(data) {
            const exportData = {
                timestamp: new Date().toISOString(),
                stats: data.stats || defaultSettings.stats,
                settings: data.settings || {}
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `zen-ad-blocker-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            showStatus('Data exported successfully!', 'success');
        });
    }
    
    // Show status message
    function showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
    
    // Make functions globally available
    window.removeFilterList = removeFilterList;
    window.removeFromWhitelist = removeFromWhitelist;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();