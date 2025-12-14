// Zomato Content Script (Runs in Iframe)
(function () {
    // Only run if in iframe
    if (window === window.top) return;

    console.log('Zomato Ext: Loaded in iframe');

    function scrapeAndNotify() {
        // Scrape Logic based on Page Type
        const url = window.location.href;
        let data = { url: url };
        let found = false;

        // Condition 1: Search Results Page
        if (url.includes('/search')) {
            // Find first real restaurant card
            // Zomato classes are obfuscated (sc-...) so we rely on structure.
            // Look for generic containers that have 'href'
            const allLinks = Array.from(document.querySelectorAll('a[href*="/"]'));

            // Filter only likely restaurant links
            // Usually /city/restaurant-slug
            // And usually implies it's inside a card
            const resLink = allLinks.find(l => {
                const href = l.getAttribute('href');
                return href && !href.includes('/order') && !href.includes('/reviews')
                    && !href.includes('/photos') && !href.includes('/menu')
                    && (href.match(/\//g) || []).length >= 3;
            });

            if (resLink) {
                data.type = 'searchRequest';
                data.bestMatchUrl = resLink.href;

                // Navigate up to find the card container effectively
                // The structure is usually <a> -> <div> -> ...
                // But we can just search NEAR this link for text.

                // Get the card container (parent of parent usually)
                let card = resLink.closest('div[class*="sc-"]');
                if (!card) card = resLink.parentElement; // Fallback

                // Attempt to extract Name
                const nameNode = card ? card.querySelector('h4') : null;
                data.bestMatchName = nameNode ? nameNode.textContent : (resLink.textContent || '');

                // Attempt to extract Rating
                // Usually a div with a green/gray background and white text, containing small number
                // Regex for rating: digit dot digit
                if (card) {
                    const textContent = card.innerText;

                    // Rating: Look for "3.5", "4.2" etc bounded by newlines or spaces
                    const ratingMatch = textContent.match(/(\d\.\d)\s*\(/) || textContent.match(/^(\d\.\d)$/m) || textContent.match(/(\d\.\d)\s*★/);
                    if (ratingMatch) {
                        data.rating = ratingMatch[1];
                    }

                    // Cost: Look for "₹" symbol
                    // "₹200 for one"
                    const costMatch = textContent.match(/₹[\d,]+\s+for\s+\w+/);
                    if (costMatch) {
                        data.cost = costMatch[0];
                    }
                }
                found = true;
            }
        }

        // Condition 2: Restaurant Page (if we navigated there)
        // ... (future enhancement)

        if (found) {
            console.log('Zomato Ext: Found data', data);
            chrome.runtime.sendMessage({
                action: 'zomatoData',
                data: data
            });
        }
    }

    // Since it's a SPA/Re-hydrating app, we need to wait or observe
    // Simple MutationObserver to detect when content loads
    let debounceTimer;
    const observer = new MutationObserver((mutations) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            scrapeAndNotify();
        }, 1000); // Wait 1s after DOM settles
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check
    setTimeout(scrapeAndNotify, 2000);

})();
