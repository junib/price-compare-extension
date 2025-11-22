// Background Service Worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle fetch requests for search results (to avoid CORS issues)
    if (message.action === 'fetchFlipkart') {
        fetch(message.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })
        .then(response => response.text())
        .then(html => {
            sendResponse({ success: true, html: html });
        })
        .catch(error => {
            console.error('Error fetching Flipkart:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep channel open for async response
    }
    
    if (message.action === 'fetchAmazon') {
        fetch(message.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })
        .then(response => response.text())
        .then(html => {
            sendResponse({ success: true, html: html });
        })
        .catch(error => {
            console.error('Error fetching Amazon:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep channel open for async response
    }
    
    if (message.action === 'searchFlipkart') {
        // Store the search query for when user visits Flipkart
        chrome.storage.local.set({
            pendingFlipkartSearch: {
                query: message.query,
                amazonProduct: message.amazonProduct,
                timestamp: Date.now()
            }
        });
        sendResponse({ success: true });
    } else if (message.action === 'searchAmazon') {
        // Store the search query for when user visits Amazon
        chrome.storage.local.set({
            pendingAmazonSearch: {
                query: message.query,
                flipkartProduct: message.flipkartProduct,
                timestamp: Date.now()
            }
        });
        sendResponse({ success: true });
    } else {
        sendResponse({ success: true });
    }
});

// Listen for tab updates to check if user navigated to comparison site
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;

    if (tab.url?.includes('flipkart.com')) {
        // Check if there's a pending Amazon search
        chrome.storage.local.get(['pendingFlipkartSearch'], (result) => {
            if (result.pendingFlipkartSearch) {
                // Clear the pending search
                chrome.storage.local.remove(['pendingFlipkartSearch']);
                // Optionally inject a notification
                chrome.tabs.sendMessage(tabId, {
                    action: 'showComparison',
                    searchQuery: result.pendingFlipkartSearch.query
                }).catch(() => {
                    // Ignore errors if content script not ready
                });
            }
        });
    } else if (tab.url?.includes('amazon.in')) {
        // Check if there's a pending Flipkart search
        chrome.storage.local.get(['pendingAmazonSearch'], (result) => {
            if (result.pendingAmazonSearch) {
                // Clear the pending search
                chrome.storage.local.remove(['pendingAmazonSearch']);
                // Optionally inject a notification
                chrome.tabs.sendMessage(tabId, {
                    action: 'showComparison',
                    searchQuery: result.pendingAmazonSearch.query
                }).catch(() => {
                    // Ignore errors if content script not ready
                });
            }
        });
    }
});

