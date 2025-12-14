// Croma Content Script
(function () {
    'use strict';

    // Only run inside an iframe (implied, but good check)
    if (window.self === window.top) {
        // Optional: logic if user visits Croma directly?
        return;
    }

    console.log('Croma Content Script Loaded inside Iframe');

    const scrapeCroma = () => {
        try {
            // Aggressive approach: Find ANY element with a price symbol
            // This is "fetch the first result it sees" logic.

            // 1. Try specific selectors first (High confidence)
            const productSelectors = [
                'li[class*="product-item"]',
                'div.cp-product',
                'div.product-item',
                'div[data-testid="product-card"]',
                '.product-item',
                '.cp-product',
                '[data-testid="product-card"]'
            ];

            let productElement = null;
            for (const selector of productSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    productElement = elements[0];
                    break;
                }
            }

            // 2. Fallback: Find any element containing "₹" and a reasonable price
            if (!productElement) {
                const allElements = document.getElementsByTagName('*');
                for (let i = 0; i < allElements.length; i++) {
                    const el = allElements[i];
                    // Skip hidden or tiny elements
                    if (el.offsetWidth < 50 || el.offsetHeight < 50) continue;

                    const text = el.innerText || '';
                    if (text.includes('₹') && text.length < 200) {
                        // Check if it looks like a price
                        if (/₹\s?[\d,]+/.test(text)) {
                            // Find a container that might be a card
                            productElement = el.closest('div[class*="card"], li, div[class*="item"]');
                            if (!productElement) productElement = el.parentElement.parentElement;
                            if (productElement) break;
                        }
                    }
                }
            }

            if (!productElement) return null;

            // Extract Title
            const titleElement = productElement.querySelector('h3, h2, .product-title, a[title]');
            let title = titleElement?.textContent?.trim() || titleElement?.getAttribute('title') || '';

            // Fallback Title: Look for any substantial text
            if (!title) {
                const link = productElement.querySelector('a');
                title = link?.textContent?.trim() || '';
            }

            // Extract Price
            const priceElement = productElement.querySelector('.amount, .new-price, .pdp-price, [class*="price"], [class*="amount"]');
            let priceText = priceElement?.textContent?.trim() || '';

            // Fallback Price: Search text content
            if (!priceText) {
                const text = productElement.innerText;
                const match = text.match(/₹\s?([\d,]+)/);
                if (match) priceText = match[0];
            }

            // Parse Price
            const match = priceText.match(/[\d,]+\.?\d*/);
            const price = match ? parseFloat(match[0].replace(/,/g, '')) : null;

            // Extract Image
            const imageElement = productElement.querySelector('img');
            let image = imageElement?.src || imageElement?.getAttribute('data-src') || '';

            // Logic to avoid placeholder images or icons
            if (image && (image.includes('icon') || image.length < 50)) {
                image = ''; // Reset if looks bad
            }

            // Link
            let productUrl = '';
            const linkElement = productElement.querySelector('a') || productElement.closest('a');
            if (linkElement) {
                const href = linkElement.getAttribute('href');
                if (href) productUrl = href.startsWith('http') ? href : `https://www.croma.com${href}`;
            }

            if (!title || !price) return null;

            return {
                title: title.substring(0, 150),
                price,
                currency: 'INR',
                image,
                url: productUrl || window.location.href,
                found: true
            };

        } catch (e) {
            console.error('Error scraping Croma:', e);
            return null;
        }
    };

    // Wait for content (SPA)
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds (500ms * 60)

    const interval = setInterval(() => {
        const data = scrapeCroma();
        if (data) {
            clearInterval(interval);
            chrome.runtime.sendMessage({
                action: 'cromaData',
                data: data
            });
        } else {
            attempts++;
            // Check if "no results" message exists
            const noResults = document.querySelector('.no-result-found, .no-result-msg');
            if (noResults) {
                clearInterval(interval);
                chrome.runtime.sendMessage({
                    action: 'cromaData',
                    data: { found: false, searchUrl: window.location.href }
                });
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                // Send failure? Or just let amazon.js timeout?
                // Better to send something so we stop the loading spinner
                chrome.runtime.sendMessage({
                    action: 'cromaData',
                    data: { found: false, searchUrl: window.location.href }
                });
            }
        }
    }, 500);

})();
