/**
 * Browser API Polyfill
 * Provides compatibility between Firefox (browser.*) and Chrome (chrome.*) APIs
 */
(function() {
    'use strict';

    // If browser is already defined (Firefox), no polyfill needed
    if (typeof browser !== 'undefined' && browser.runtime) {
        return;
    }

    // Create browser namespace from chrome
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        const api = chrome;
        
        // Helper to promisify chrome API callbacks
        function promisify(fn, context) {
            return function(...args) {
                return new Promise((resolve, reject) => {
                    fn.call(context, ...args, function(result) {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(result);
                        }
                    });
                });
            };
        }

        // Create promisified browser object
        window.browser = {
            runtime: {
                sendMessage: promisify(api.runtime.sendMessage, api.runtime),
                onMessage: api.runtime.onMessage,
                openOptionsPage: api.runtime.openOptionsPage ? 
                    promisify(api.runtime.openOptionsPage, api.runtime) : 
                    function() { 
                        return api.tabs.create({ url: api.runtime.getURL('options.html') }); 
                    },
                getURL: api.runtime.getURL.bind(api.runtime),
                getManifest: api.runtime.getManifest.bind(api.runtime),
                id: api.runtime.id,
                lastError: api.runtime.lastError
            },
            storage: {
                sync: {
                    get: function(keys, callback) {
                        if (callback) {
                            api.storage.sync.get(keys, callback);
                        } else {
                            return promisify(api.storage.sync.get, api.storage.sync)(keys);
                        }
                    },
                    set: function(items, callback) {
                        if (callback) {
                            api.storage.sync.set(items, callback);
                        } else {
                            return promisify(api.storage.sync.set, api.storage.sync)(items);
                        }
                    },
                    remove: function(keys, callback) {
                        if (callback) {
                            api.storage.sync.remove(keys, callback);
                        } else {
                            return promisify(api.storage.sync.remove, api.storage.sync)(keys);
                        }
                    }
                },
                local: {
                    get: function(keys, callback) {
                        if (callback) {
                            api.storage.local.get(keys, callback);
                        } else {
                            return promisify(api.storage.local.get, api.storage.local)(keys);
                        }
                    },
                    set: function(items, callback) {
                        if (callback) {
                            api.storage.local.set(items, callback);
                        } else {
                            return promisify(api.storage.local.set, api.storage.local)(items);
                        }
                    },
                    remove: function(keys, callback) {
                        if (callback) {
                            api.storage.local.remove(keys, callback);
                        } else {
                            return promisify(api.storage.local.remove, api.storage.local)(keys);
                        }
                    }
                },
                onChanged: api.storage.onChanged
            },
            tabs: {
                query: function(queryInfo, callback) {
                    if (callback) {
                        api.tabs.query(queryInfo, callback);
                    } else {
                        return promisify(api.tabs.query, api.tabs)(queryInfo);
                    }
                },
                create: function(createProperties, callback) {
                    if (callback) {
                        api.tabs.create(createProperties, callback);
                    } else {
                        return promisify(api.tabs.create, api.tabs)(createProperties);
                    }
                },
                sendMessage: promisify(api.tabs.sendMessage, api.tabs),
                onUpdated: api.tabs.onUpdated,
                onRemoved: api.tabs.onRemoved
            },
            webRequest: api.webRequest ? {
                onBeforeRequest: api.webRequest.onBeforeRequest,
                onBeforeSendHeaders: api.webRequest.onBeforeSendHeaders,
                onHeadersReceived: api.webRequest.onHeadersReceived
            } : null,
            alarms: api.alarms ? {
                create: api.alarms.create.bind(api.alarms),
                clear: api.alarms.clear.bind(api.alarms),
                get: promisify(api.alarms.get, api.alarms),
                getAll: promisify(api.alarms.getAll, api.alarms),
                onAlarm: api.alarms.onAlarm
            } : null
        };
    }
})();
