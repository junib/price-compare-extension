// Swiggy Content Script - Find similar dishes
(function() {
    'use strict';

    let comparisonPanel = null;
    let selectedDish = null;

    // Create comparison panel UI
    function createComparisonPanel() {
        if (comparisonPanel) return;

        comparisonPanel = document.createElement('div');
        comparisonPanel.id = 'food-compare-panel';
        comparisonPanel.innerHTML = `
            <div class="compare-header">
                <h3>🍽️ Similar Dishes</h3>
                <button class="close-btn" id="closeCompare">×</button>
            </div>
            <div class="compare-content" id="compareContent">
                <p class="loading">Finding similar dishes...</p>
            </div>
        `;
        document.body.appendChild(comparisonPanel);

        document.getElementById('closeCompare').addEventListener('click', () => {
            comparisonPanel.style.display = 'none';
        });
    }

    // Extract dish information
    function extractDishInfo(element) {
        try {
            // Swiggy dish card selectors
            const titleElement = element.querySelector('[class*="RestaurantNameAddress"], h3, [class*="name"]');
            const priceElement = element.querySelector('[class*="price"], [class*="Price"], .rupee');
            const ratingElement = element.querySelector('[class*="rating"], [class*="Rating"]');
            const imageElement = element.querySelector('img');
            const descriptionElement = element.querySelector('[class*="description"], [class*="Description"], p');

            const title = titleElement?.textContent?.trim() || '';
            const priceText = priceElement?.textContent?.trim() || '';
            const price = parsePrice(priceText);
            const rating = parseRating(ratingElement?.textContent?.trim() || '');
            const image = imageElement?.src || imageElement?.getAttribute('data-src') || '';
            const description = descriptionElement?.textContent?.trim() || '';
            const link = element.closest('a')?.href || element.querySelector('a')?.href || '';

            return {
                title,
                price,
                rating,
                image,
                description,
                link,
                element
            };
        } catch (error) {
            console.error('Error extracting dish info:', error);
            return null;
        }
    }

    function parsePrice(text) {
        const match = text.match(/[\d,]+/);
        return match ? parseFloat(match[0].replace(/,/g, '')) : null;
    }

    function parseRating(text) {
        const match = text.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[0]) : null;
    }

    // Find similar dishes based on keywords
    function findSimilarDishes(selectedDish) {
        const keywords = extractKeywords(selectedDish.title);
        const allDishes = document.querySelectorAll('[class*="RestaurantCard"], [class*="dishCard"], [class*="MenuItem"]');
        
        const similarDishes = [];
        
        allDishes.forEach(dishElement => {
            if (dishElement === selectedDish.element) return;
            
            const dishInfo = extractDishInfo(dishElement);
            if (!dishInfo || !dishInfo.title) return;

            const similarity = calculateSimilarity(keywords, dishInfo.title);
            
            if (similarity > 0.3) { // 30% similarity threshold
                similarDishes.push({
                    ...dishInfo,
                    similarity
                });
            }
        });

        // Sort by similarity and price
        similarDishes.sort((a, b) => {
            if (Math.abs(a.similarity - b.similarity) > 0.1) {
                return b.similarity - a.similarity;
            }
            return (a.price || Infinity) - (b.price || Infinity);
        });

        return similarDishes.slice(0, 5); // Top 5 similar dishes
    }

    function extractKeywords(title) {
        // Common food keywords to ignore
        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        return title.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word));
    }

    function calculateSimilarity(keywords1, title2) {
        const keywords2 = extractKeywords(title2);
        const intersection = keywords1.filter(k => keywords2.includes(k));
        const union = [...new Set([...keywords1, ...keywords2])];
        return union.length > 0 ? intersection.length / union.length : 0;
    }

    // Display similar dishes
    function displaySimilarDishes(selectedDish, similarDishes) {
        const content = document.getElementById('compareContent');
        
        if (similarDishes.length === 0) {
            content.innerHTML = '<p class="no-results">No similar dishes found. Try selecting a different dish.</p>';
            return;
        }

        content.innerHTML = `
            <div class="selected-dish">
                <h4>Selected: ${selectedDish.title}</h4>
                <div class="dish-info">
                    ${selectedDish.price ? `<span class="price">₹${selectedDish.price}</span>` : ''}
                    ${selectedDish.rating ? `<span class="rating">⭐ ${selectedDish.rating}</span>` : ''}
                </div>
            </div>
            <div class="similar-dishes">
                <h4>Similar Options:</h4>
                ${similarDishes.map(dish => `
                    <div class="dish-card">
                        ${dish.image ? `<img src="${dish.image}" alt="${dish.title}" onerror="this.style.display='none'">` : ''}
                        <div class="dish-details">
                            <h5>${dish.title}</h5>
                            ${dish.description ? `<p class="description">${dish.description.substring(0, 100)}...</p>` : ''}
                            <div class="dish-meta">
                                ${dish.price ? `<span class="price">₹${dish.price}</span>` : ''}
                                ${dish.rating ? `<span class="rating">⭐ ${dish.rating}</span>` : ''}
                                <span class="similarity">${Math.round(dish.similarity * 100)}% match</span>
                            </div>
                            ${dish.link ? `<a href="${dish.link}" target="_blank" class="view-btn">View Dish →</a>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Handle dish selection
    function handleDishClick(event) {
        const dishElement = event.target.closest('[class*="RestaurantCard"], [class*="dishCard"], [class*="MenuItem"], [class*="DishCard"]');
        if (!dishElement) return;

        selectedDish = extractDishInfo(dishElement);
        if (!selectedDish || !selectedDish.title) return;

        createComparisonPanel();
        comparisonPanel.style.display = 'block';

        // Find and display similar dishes
        const similarDishes = findSimilarDishes(selectedDish);
        displaySimilarDishes(selectedDish, similarDishes);
    }

    // Initialize
    function init() {
        // Listen for clicks on dish cards
        document.addEventListener('click', handleDishClick, true);

        // Also listen for hover on dish cards to show preview
        document.addEventListener('mouseover', (e) => {
            const dishElement = e.target.closest('[class*="RestaurantCard"], [class*="dishCard"], [class*="MenuItem"]');
            if (dishElement) {
                dishElement.style.cursor = 'pointer';
            }
        }, true);
    }

    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

