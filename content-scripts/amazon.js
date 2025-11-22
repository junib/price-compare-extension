// Amazon.in Content Script - Compare with Flipkart
(function() {
    'use strict';

    let comparisonPanel = null;
    let productInfo = null;

    // Extract product information from Amazon page
    function extractProductInfo() {
        try {
            // Product title
            const titleElement = document.querySelector('#productTitle, h1.a-size-large');
            const title = titleElement?.textContent?.trim() || '';

            // Price
            const priceElement = document.querySelector('.a-price-whole, .a-price .a-offscreen, #priceblock_dealprice, #priceblock_ourprice');
            const priceText = priceElement?.textContent?.trim() || '';
            const price = parsePrice(priceText);

            // Image
            const imageElement = document.querySelector('#landingImage, #imgBlkFront, #main-image');
            const image = imageElement?.src || imageElement?.getAttribute('data-src') || '';

            // Rating
            const ratingElement = document.querySelector('.a-icon-alt, [data-hook="average-star-rating"]');
            const ratingText = ratingElement?.textContent?.trim() || '';
            const rating = parseRating(ratingText);

            // Reviews count
            const reviewsElement = document.querySelector('#acrCustomerReviewText, [data-hook="total-review-count"]');
            const reviewsText = reviewsElement?.textContent?.trim() || '';
            const reviewsCount = parseReviewsCount(reviewsText);

            // Brand
            const brandElement = document.querySelector('#brand, [data-hook="product-brand"]');
            const brand = brandElement?.textContent?.trim() || '';

            // ASIN (Amazon product ID)
            const asinMatch = document.body.innerHTML.match(/"asin":"([^"]+)"/);
            const asin = asinMatch ? asinMatch[1] : '';

            return {
                title,
                price,
                currency: 'INR',
                image,
                rating,
                reviewsCount,
                brand,
                asin,
                url: window.location.href
            };
        } catch (error) {
            console.error('Error extracting product info:', error);
            return null;
        }
    }

    function parsePrice(text) {
        const match = text.match(/[\d,]+\.?\d*/);
        return match ? parseFloat(match[0].replace(/,/g, '')) : null;
    }

    function parseRating(text) {
        const match = text.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[0]) : null;
    }

    function parseReviewsCount(text) {
        const match = text.match(/([\d,]+)/);
        return match ? parseInt(match[0].replace(/,/g, '')) : 0;
    }

    // Create comparison panel
    function createComparisonPanel() {
        if (comparisonPanel) return;

        comparisonPanel = document.createElement('div');
        comparisonPanel.id = 'price-compare-panel';
        comparisonPanel.innerHTML = `
            <div class="compare-header">
                <h3>💰 Price Comparison</h3>
                <button class="close-btn" id="closeCompare">×</button>
            </div>
            <div class="compare-content" id="compareContent">
                <div class="current-product">
                    <h4>Amazon.in</h4>
                    <div id="amazonProduct"></div>
                </div>
                <div class="comparison-divider">vs</div>
                <div class="other-products">
                    <h4>Flipkart</h4>
                    <div id="flipkartResults">
                        <p class="loading">Searching Flipkart...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(comparisonPanel);

        document.getElementById('closeCompare').addEventListener('click', () => {
            comparisonPanel.style.display = 'none';
        });
    }

    // Display Amazon product
    function displayAmazonProduct(product) {
        const amazonDiv = document.getElementById('amazonProduct');
        amazonDiv.innerHTML = `
            <div class="product-card amazon">
                ${product.image ? `<img src="${product.image}" alt="${product.title}">` : ''}
                <div class="product-details">
                    <h5>${product.title}</h5>
                    ${product.brand ? `<p class="brand">Brand: ${product.brand}</p>` : ''}
                    <div class="product-meta">
                        ${product.price ? `<span class="price">₹${product.price.toLocaleString()}</span>` : '<span class="price">Price not available</span>'}
                        ${product.rating ? `<span class="rating">⭐ ${product.rating}</span>` : ''}
                        ${product.reviewsCount ? `<span class="reviews">(${product.reviewsCount} reviews)</span>` : ''}
                    </div>
                    <a href="${product.url}" target="_blank" class="view-btn">View on Amazon →</a>
                </div>
            </div>
        `;
    }

    // Search Flipkart for similar product and fetch top result
    async function searchFlipkart(product) {
        const flipkartDiv = document.getElementById('flipkartResults');
        flipkartDiv.innerHTML = '<p class="loading">🔍 Searching Flipkart...</p>';
        
        try {
            // Extract search keywords from product title
            const searchQuery = extractSearchKeywords(product.title, product.brand);
            const flipkartUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(searchQuery)}`;
            
            // Use background script to fetch (avoids CORS issues)
            chrome.runtime.sendMessage({
                action: 'fetchFlipkart',
                url: flipkartUrl
            }, (response) => {
                if (response && response.success && response.html) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.html, 'text/html');
                    
                    // Extract top product from Flipkart search results
                    const topProduct = extractTopFlipkartProduct(doc, flipkartUrl);
                    
                    if (topProduct) {
                        displayFlipkartProduct(topProduct, flipkartDiv);
                    } else {
                        flipkartDiv.innerHTML = `
                            <div class="search-info">
                                <p class="error">No matching product found on Flipkart</p>
                                <a href="${flipkartUrl}" target="_blank" class="search-link">View all results on Flipkart →</a>
                            </div>
                        `;
                    }
                } else {
                    // Fallback to link if fetch fails
                    flipkartDiv.innerHTML = `
                        <div class="error">
                            <p>Could not fetch Flipkart results automatically.</p>
                            <a href="${flipkartUrl}" target="_blank" class="search-link">Search on Flipkart →</a>
                        </div>
                    `;
                }
            });
        } catch (error) {
            console.error('Error searching Flipkart:', error);
            const searchQuery = extractSearchKeywords(product.title, product.brand);
            const flipkartUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(searchQuery)}`;
            flipkartDiv.innerHTML = `
                <div class="error">
                    <p>Could not fetch Flipkart results automatically.</p>
                    <a href="${flipkartUrl}" target="_blank" class="search-link">Search on Flipkart →</a>
                </div>
            `;
        }
    }

    // Extract top product from Flipkart search results
    function extractTopFlipkartProduct(doc, baseUrl) {
        try {
            // Try multiple selectors for Flipkart product cards
            const productSelectors = [
                'div[data-id]',
                'a[href*="/p/"]',
                'div._1AtVbE',
                'div._2kHMtA',
                'div[class*="product"]'
            ];
            
            let productElement = null;
            for (const selector of productSelectors) {
                const elements = doc.querySelectorAll(selector);
                if (elements.length > 0) {
                    productElement = elements[0];
                    break;
                }
            }
            
            if (!productElement) {
                // Try finding by link pattern
                const links = doc.querySelectorAll('a[href*="/p/"]');
                if (links.length > 0) {
                    productElement = links[0].closest('div') || links[0];
                }
            }
            
            if (!productElement) return null;
            
            // Extract product details
            const titleElement = productElement.querySelector('a[title], div[class*="title"], ._4rR01T, div[class*="name"]');
            const title = titleElement?.getAttribute('title') || titleElement?.textContent?.trim() || '';
            
            const priceElement = productElement.querySelector('div._30jeq3, div[class*="price"], ._1_WHN1');
            const priceText = priceElement?.textContent?.trim() || '';
            const price = parsePrice(priceText);
            
            const imageElement = productElement.querySelector('img, img._396cs4');
            const image = imageElement?.src || imageElement?.getAttribute('data-src') || '';
            
            const ratingElement = productElement.querySelector('div._3LWZlK, div[class*="rating"]');
            const ratingText = ratingElement?.textContent?.trim() || '';
            const rating = parseRating(ratingText);
            
            const reviewsElement = productElement.querySelector('span._2_R_DZ, span[class*="review"]');
            const reviewsText = reviewsElement?.textContent?.trim() || '';
            const reviewsCount = parseReviewsCount(reviewsText);
            
            // Get product link
            const linkElement = productElement.querySelector('a[href*="/p/"]') || productElement.closest('a[href*="/p/"]');
            let productUrl = '';
            if (linkElement) {
                const href = linkElement.getAttribute('href');
                productUrl = href.startsWith('http') ? href : `https://www.flipkart.com${href}`;
            }
            
            if (!title) return null;
            
            return {
                title: title.substring(0, 150),
                price,
                currency: 'INR',
                image,
                rating,
                reviewsCount,
                url: productUrl || baseUrl
            };
        } catch (error) {
            console.error('Error extracting Flipkart product:', error);
            return null;
        }
    }

    // Display Flipkart product result
    function displayFlipkartProduct(product, container) {
        container.innerHTML = `
            <div class="product-card flipkart">
                ${product.image ? `<img src="${product.image}" alt="${product.title}" onerror="this.style.display='none'">` : ''}
                <div class="product-details">
                    <h5>${product.title}</h5>
                    <div class="product-meta">
                        ${product.price ? `<span class="price">₹${product.price.toLocaleString()}</span>` : '<span class="price">Price not available</span>'}
                        ${product.rating ? `<span class="rating">⭐ ${product.rating}</span>` : ''}
                        ${product.reviewsCount ? `<span class="reviews">(${product.reviewsCount} reviews)</span>` : ''}
                    </div>
                    ${product.url ? `<a href="${product.url}" target="_blank" class="view-btn">View on Flipkart →</a>` : ''}
                </div>
            </div>
        `;
    }

    function extractSearchKeywords(title, brand) {
        // Remove common words and keep important keywords
        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        let keywords = title.toLowerCase().split(/\s+/);
        
        if (brand) {
            keywords = [brand.toLowerCase(), ...keywords];
        }
        
        return keywords
            .filter(word => word.length > 2 && !stopWords.includes(word))
            .slice(0, 5)
            .join(' ');
    }

    // Initialize comparison
    function initComparison() {
        productInfo = extractProductInfo();
        
        if (!productInfo || !productInfo.title) {
            console.log('Could not extract product information');
            return;
        }

        createComparisonPanel();
        comparisonPanel.style.display = 'block';
        
        displayAmazonProduct(productInfo);
        searchFlipkart(productInfo);
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'showComparison') {
            initComparison();
        }
    });

    // Auto-detect product page and show comparison button
    function addCompareButton() {
        // Check if we're on a product page
        if (!document.querySelector('#productTitle, h1.a-size-large')) return;

        // Check if button already exists
        if (document.getElementById('priceCompareBtn')) return;

        const button = document.createElement('button');
        button.id = 'priceCompareBtn';
        button.className = 'price-compare-btn';
        button.innerHTML = '💰 Compare Prices';
        button.addEventListener('click', initComparison);

        // Try to insert near buy button or price
        const buyBox = document.querySelector('#buybox, #desktop_buybox, .a-section.a-spacing-none');
        if (buyBox) {
            buyBox.insertBefore(button, buyBox.firstChild);
        } else {
            // Fallback: add to top of page
            const header = document.querySelector('#productTitle, h1.a-size-large');
            if (header) {
                header.parentElement.insertBefore(button, header.nextSibling);
            }
        }
    }

    // Initialize
    function init() {
        // Wait a bit for page to fully load
        setTimeout(() => {
            addCompareButton();
        }, 1000);
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also run on navigation (SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(init, 1000);
        }
    }).observe(document, { subtree: true, childList: true });
})();

