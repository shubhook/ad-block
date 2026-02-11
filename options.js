// Options page JavaScript
(function() {
    'use strict';
    
    // Default settings
    let settings = null;
    
    // Initialize the options page
    function init() {
        loadSettings();
        setupEventListeners();
        setupTabs();
    }
    
    // Get default settings
    function getDefaultSettings() {
        if (typeof ZenSettings !== 'undefined') {
            return ZenSettings.getDefaults();
        }
        return {
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
    }
    
    // Load settings from storage
    function loadSettings() {
        const defaults = getDefaultSettings();
        
        browser.storage.sync.get(defaults, function(loadedSettings) {
            if (browser.runtime.lastError) {
                console.error('Error loading settings:', browser.runtime.lastError);
                settings = defaults;
            } else {
                settings = loadedSettings;
            }
            
            // General settings
            setChecked('enabled', settings.enabled);
            setChecked('showNotifications', settings.showNotifications);
            setChecked('blockTrackers', settings.blockTrackers);
            setChecked('blockSocial', settings.blockSocial);
            setValue('logLevel', settings.logLevel);
            
            // Filters
            setValue('customFilters', settings.customFilters);
            populateFilterLists(settings.filterLists || []);
            
            // Whitelist
            populateWhitelist(settings.whitelist || []);
            
            // Statistics
            loadStatistics();
        });
    }
    
    // Helper to safely set checkbox state
    function setChecked(id, value) {
        const el = document.getElementById(id);
        if (el) el.checked = !!value;
    }
    
    // Helper to safely set input value
    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }
    
    // Save settings to storage
    function saveSettings() {
        const newSettings = {
            enabled: document.getElementById('enabled')?.checked ?? true,
            showNotifications: document.getElementById('showNotifications')?.checked ?? true,
            blockTrackers: document.getElementById('blockTrackers')?.checked ?? true,
            blockSocial: document.getElementById('blockSocial')?.checked ?? false,
            logLevel: document.getElementById('logLevel')?.value ?? 'warn',
            customFilters: document.getElementById('customFilters')?.value ?? ''
        };
        
        browser.storage.sync.set(newSettings, function() {
            if (browser.runtime.lastError) {
                showStatus('Error saving settings: ' + browser.runtime.lastError.message, 'error');
                return;
            }
            
            // Update local settings
            Object.assign(settings, newSettings);
            
            // Notify background to reload filters
            browser.runtime.sendMessage({ action: 'updateFilters' }, function(response) {
                showStatus('Settings saved successfully!', 'success');
            });
        });
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Save general settings
        addClickListener('saveGeneral', saveSettings);
        
        // Filter management
        addClickListener('addFilter', addFilterList);
        addClickListener('updateFilters', updateAllFilters);
        
        // Whitelist management
        addClickListener('addWhitelist', addToWhitelist);
        
        // Statistics
        addClickListener('resetStats', resetStatistics);
        addClickListener('exportStats', exportStatistics);
        
        // Enter key handlers for inputs
        addEnterKeyListener('filterUrl', addFilterList);
        addEnterKeyListener('whitelistDomain', addToWhitelist);
    }
    
    // Helper to add click listener
    function addClickListener(id, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', handler);
    }
    
    // Helper to add enter key listener
    function addEnterKeyListener(id, handler) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handler();
                }
            });
        }
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
                const content = document.getElementById(tabName);
                if (content) content.classList.add('active');
            });
        });
    }
    
    // Add filter list
    function addFilterList() {
        const input = document.getElementById('filterUrl');
        const url = input?.value.trim();
        
        if (!url) {
            showStatus('Please enter a valid URL', 'error');
            return;
        }
        
        // Validate URL format
        try {
            new URL(url);
        } catch (e) {
            showStatus('Invalid URL format', 'error');
            return;
        }
        
        browser.storage.sync.get('filterLists', function(data) {
            const filterLists = data.filterLists || [];
            
            if (filterLists.includes(url)) {
                showStatus('Filter list already exists', 'error');
                return;
            }
            
            filterLists.push(url);
            
            browser.storage.sync.set({ filterLists }, function() {
                if (browser.runtime.lastError) {
                    showStatus('Error adding filter list', 'error');
                    return;
                }
                
                if (input) input.value = '';
                populateFilterLists(filterLists);
                showStatus('Filter list added successfully!', 'success');
                
                // Trigger filter update
                browser.runtime.sendMessage({ action: 'updateFilters' });
            });
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
                    if (browser.runtime.lastError) {
                        showStatus('Error removing filter list', 'error');
                        return;
                    }
                    
                    populateFilterLists(filterLists);
                    showStatus('Filter list removed', 'success');
                    
                    // Trigger filter update
                    browser.runtime.sendMessage({ action: 'updateFilters' });
                });
            }
        });
    }
    
    // Update all filters
    function updateAllFilters() {
        showStatus('Updating filters...', 'success');
        
        browser.runtime.sendMessage({ action: 'updateFilters' }, function(response) {
            if (response && response.success) {
                showStatus('Filters updated successfully!', 'success');
            } else {
                showStatus('Failed to update filters', 'error');
            }
        });
    }
    
    // Populate filter lists (safe DOM manipulation)
    function populateFilterLists(filterLists) {
        const container = document.getElementById('filterList');
        if (!container) return;
        
        // Clear safely
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        
        if (filterLists.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-list';
            empty.textContent = 'No filter lists added';
            container.appendChild(empty);
            return;
        }
        
        filterLists.forEach(url => {
            const item = document.createElement('div');
            item.className = 'filter-item';
            
            const urlSpan = document.createElement('span');
            urlSpan.className = 'filter-url';
            urlSpan.textContent = url; // Safe: using textContent
            urlSpan.title = url;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => removeFilterList(url));
            
            item.appendChild(urlSpan);
            item.appendChild(removeBtn);
            container.appendChild(item);
        });
    }
    
    // Add domain to whitelist
    function addToWhitelist() {
        const input = document.getElementById('whitelistDomain');
        const domain = input?.value.trim().toLowerCase();
        
        if (!domain) {
            showStatus('Please enter a valid domain', 'error');
            return;
        }
        
        // Basic domain validation
        if (!/^[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}$/i.test(domain)) {
            showStatus('Invalid domain format', 'error');
            return;
        }
        
        browser.storage.sync.get('whitelist', function(data) {
            const whitelist = data.whitelist || [];
            
            if (whitelist.includes(domain)) {
                showStatus('Domain already whitelisted', 'error');
                return;
            }
            
            whitelist.push(domain);
            
            browser.storage.sync.set({ whitelist }, function() {
                if (browser.runtime.lastError) {
                    showStatus('Error adding to whitelist', 'error');
                    return;
                }
                
                if (input) input.value = '';
                populateWhitelist(whitelist);
                showStatus('Domain added to whitelist!', 'success');
                
                // Trigger filter update
                browser.runtime.sendMessage({ action: 'updateFilters' });
            });
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
                    if (browser.runtime.lastError) {
                        showStatus('Error removing from whitelist', 'error');
                        return;
                    }
                    
                    populateWhitelist(whitelist);
                    showStatus('Domain removed from whitelist', 'success');
                    
                    // Trigger filter update
                    browser.runtime.sendMessage({ action: 'updateFilters' });
                });
            }
        });
    }
    
    // Populate whitelist (safe DOM manipulation)
    function populateWhitelist(whitelist) {
        const container = document.getElementById('whitelistList');
        if (!container) return;
        
        // Clear safely
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        
        if (whitelist.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-list';
            empty.textContent = 'No domains whitelisted';
            container.appendChild(empty);
            return;
        }
        
        whitelist.forEach(domain => {
            const item = document.createElement('div');
            item.className = 'filter-item';
            
            const domainSpan = document.createElement('span');
            domainSpan.className = 'domain-name';
            domainSpan.textContent = domain; // Safe: using textContent
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => removeFromWhitelist(domain));
            
            item.appendChild(domainSpan);
            item.appendChild(removeBtn);
            container.appendChild(item);
        });
    }
    
    // Load statistics
    function loadStatistics() {
        browser.storage.sync.get('stats', function(data) {
            const defaults = getDefaultSettings();
            const stats = data.stats || defaults.stats;
            
            setTextContent('totalBlocked', formatNumber(stats.totalBlocked || 0));
            setTextContent('todayBlocked', formatNumber(stats.todayBlocked || 0));
            setTextContent('trackersBlocked', formatNumber(stats.trackersBlocked || 0));
            setTextContent('pagesCleaned', formatNumber(stats.pagesCleaned || 0));
        });
    }
    
    // Helper to safely set text content
    function setTextContent(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }
    
    // Format large numbers
    function formatNumber(num) {
        return num.toLocaleString();
    }
    
    // Reset statistics
    function resetStatistics() {
        if (!confirm('Are you sure you want to reset all statistics?')) {
            return;
        }
        
        browser.runtime.sendMessage({ action: 'resetStats' }, function(response) {
            if (response && response.success) {
                loadStatistics();
                showStatus('Statistics reset successfully!', 'success');
            } else {
                showStatus('Failed to reset statistics', 'error');
            }
        });
    }
    
    // Export statistics
    function exportStatistics() {
        browser.storage.sync.get(['stats', 'filterLists', 'whitelist', 'customFilters'], function(data) {
            const exportData = {
                exportDate: new Date().toISOString(),
                version: browser.runtime.getManifest?.()?.version || '0.2',
                stats: data.stats || {},
                filterLists: data.filterLists || [],
                whitelist: data.whitelist || [],
                customFiltersCount: (data.customFilters || '').split('\n').filter(l => l.trim()).length
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `zen-ad-blocker-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showStatus('Data exported successfully!', 'success');
        });
    }
    
    // Show status message
    function showStatus(message, type) {
        const status = document.getElementById('status');
        if (!status) return;
        
        status.textContent = message;
        status.className = 'status ' + type;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
