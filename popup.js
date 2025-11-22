// Popup script
document.addEventListener('DOMContentLoaded', () => {
    // Check current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        const url = currentTab.url;

        const statusDiv = document.getElementById('status');
        
        if (url.includes('amazon.in') || url.includes('flipkart.com')) {
            statusDiv.textContent = '✓ On e-commerce site - Click "Compare Prices" button';
            statusDiv.className = 'status active';
        } else if (url.includes('swiggy.com')) {
            statusDiv.textContent = '✓ On Swiggy - Click any dish to compare';
            statusDiv.className = 'status active';
        } else {
            statusDiv.textContent = 'ℹ️ Visit Amazon.in, Flipkart, or Swiggy to use extension';
            statusDiv.className = 'status';
        }
    });
});

