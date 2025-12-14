// Swiggy Content Script - Side-by-Side Zomato Comparison
(function () {
    'use strict';

    let sidebar = null;
    let selectedDish = null;
    let restaurantName = '';
    let zomatoUrl = '';

    // --- SIDEBAR UI ---

    function createSidebar() {
        if (sidebar) return;

        sidebar = document.createElement('div');
        sidebar.id = 'swiggy-zomato-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h3>Zomato Split View</h3>
                <div class="header-controls">
                    <button id="toggleWidth" title="Expand/Collapse">⬌</button>
                    <button id="minimizeSidebar">_</button>
                </div>
            </div>
            
            <div class="status-bar" id="zomatoStatusBar">
                <span class="status-text">Searching Zomato...</span>
            </div>

            <div class="iframe-container">
                 <iframe id="zomato-viewer" src="about:blank" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>
                 <div class="overlay-msg" id="overlayMsg">
                    <p>Locating restaurant...</p>
                 </div>
            </div>
        `;

        // Inject Styles
        const style = document.createElement('style');
        style.textContent = `
            #swiggy-zomato-sidebar {
                position: fixed;
                top: 80px;
                right: 0;
                width: 400px; /* Wider default */
                height: calc(100vh - 80px);
                background: white;
                box-shadow: -2px 0 10px rgba(0,0,0,0.2);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                transition: width 0.3s, transform 0.3s;
                border-left: 1px solid #ccc;
            }
            #swiggy-zomato-sidebar.minimized {
                transform: translateX(360px);
            }
            #swiggy-zomato-sidebar.wide {
                width: 50vw; /* Split view mode */
            }
            
            .sidebar-header {
                padding: 10px 15px;
                background: #cb202d; /* Zomato Red */
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .sidebar-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
            .header-controls button {
                background: rgba(255,255,255,0.2); border: none; color: white; 
                cursor: pointer; padding: 4px 8px; border-radius: 4px; margin-left: 5px;
            }
            
            .status-bar {
                padding: 8px 15px;
                background: #f8f8f8;
                border-bottom: 1px solid #eee;
                font-size: 12px;
                color: #555;
                display: flex;
                justify-content: space-between;
            }
            
            .iframe-container {
                flex: 1;
                position: relative;
                background: #f0f0f0;
            }
            #zomato-viewer {
                width: 100%;
                height: 100%;
                border: none;
                background: white;
            }
            .overlay-msg {
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                background: rgba(255,255,255,0.9);
                color: #333;
                z-index: 10;
            }
            .hidden { display: none !important; }
        `;
        document.head.appendChild(style);
        document.body.appendChild(sidebar);

        // Sidebar behavior
        document.getElementById('minimizeSidebar').addEventListener('click', () => {
            sidebar.classList.toggle('minimized');
            const btn = document.getElementById('minimizeSidebar');
            btn.textContent = sidebar.classList.contains('minimized') ? '◀' : '_';
        });

        document.getElementById('toggleWidth').addEventListener('click', () => {
            sidebar.classList.toggle('wide');
        });
    }

    // --- LOGIC ---

    function detectRestaurant() {
        // Try multiple strategies to find restaurant name
        let name = '';
        let location = '';

        // Strategy 1: URL Parsing (Most reliable for Swiggy)
        // URL format: /restaurants/name-area-city-id
        const path = window.location.pathname;
        if (path.includes('/restaurants/')) {
            const parts = path.split('/').pop().split('-');
            // Last part is ID, usually last but one is city, before that is area
            // We can just take the whole string minus the last ID part and replace hyphens with spaces
            if (parts.length > 1 && !isNaN(parts[parts.length - 1])) {
                parts.pop(); // Remove ID
                // Remove common words like 'restaurant' if needed, but usually the slug is good
                const fullNameAndLoc = parts.join(' ');

                // We need to separate name from location... difficult without knowledge.
                // But generally, the Page Title has the clean name.
            }
        }

        // Strategy 2: Title Parsing (Clean name)
        // Title: "Order from KFC Bucket Meals Checking in Mg Road | Swiggy"
        // Title: "Order from Restaurant Name in Location | Swiggy"
        const title = document.title;
        if (title.includes('Order from')) {
            const afterOrderFrom = title.split('Order from')[1];
            if (afterOrderFrom.includes(' in ')) {
                const splitIn = afterOrderFrom.split(' in ');
                name = splitIn[0].trim();
                const afterIn = splitIn[1];
                if (afterIn.includes('|')) {
                    location = afterIn.split('|')[0].trim();
                } else {
                    location = afterIn.trim();
                }
            } else if (afterOrderFrom.includes('|')) {
                name = afterOrderFrom.split('|')[0].trim();
            }
        } else if (title.includes('|')) {
            name = title.split('|')[0].trim();
        }

        // Sanity check: Don't detect "Swiggy" as the restaurant name
        if (name && !name.toLowerCase().includes('swiggy') && (name !== restaurantName)) {
            restaurantName = name;
            console.log('Swiggy Ext: Detected Restaurant:', restaurantName, location);
            createSidebar();

            // Update Header
            const header = document.querySelector('.sidebar-header h3');
            if (header) header.textContent = `Zomato: ${name.substring(0, 15)}...`;

            findRestaurantOnZomato(restaurantName, location);
        }
    }

    // Phase 1: Search for the restaurant itself
    function findRestaurantOnZomato(name, location = '') {
        const statusBar = document.querySelector('.status-text');
        const overlay = document.getElementById('overlayMsg');
        if (statusBar) statusBar.textContent = `Searching Zomato for "${name}"...`;
        if (overlay) overlay.classList.remove('hidden');
        if (overlay) overlay.innerHTML = `<p>Locating restaurant...</p>`;


        // Query: "Name Location restaurant"
        const query = `${name} ${location} restaurant`.trim();
        const searchUrl = `https://www.zomato.com/search?q=${encodeURIComponent(query)}`;

        chrome.runtime.sendMessage({ action: 'fetchZomato', url: searchUrl }, (response) => {
            const viewer = document.getElementById('zomato-viewer');

            if (response && response.success) {
                // Parse to find the restaurant URL
                const parser = new DOMParser();
                const doc = parser.parseFromString(response.html, 'text/html');

                // Strategy: Look for the first anchor tag that looks like a restaurant link
                // Zomato classes are obfuscated, so we rely on structure
                const links = Array.from(doc.querySelectorAll('a[href*="/"]'));
                const resLink = links.find(l => {
                    const href = l.getAttribute('href');
                    // Start with relative or absolute check, normalize to full URL for checks if need be
                    // But usually hrefs are relative or full. 
                    // We just check for /city/restaurant-slug pattern roughly.
                    return href && !href.includes('/order')
                        && !href.includes('/reviews')
                        && !href.includes('/photos')
                        && !href.includes('/menu')
                        && !href.includes('zomato.com/mobile')
                        && !href.includes('zomato.com/contact')
                        && (href.match(/\//g) || []).length >= 3;
                });

                if (resLink) {
                    let bestMatchUrl = resLink.href;
                    // Fix relative URLs if any (though usually Zomato uses absolute)
                    if (bestMatchUrl.startsWith('/')) {
                        bestMatchUrl = 'https://www.zomato.com' + bestMatchUrl;
                    }
                    zomatoUrl = bestMatchUrl;

                    if (statusBar) statusBar.innerHTML = `✓ Restaurant found. <a href="${zomatoUrl}" target="_blank">Open in New Tab</a>`;

                    // Load into Iframe
                    if (viewer) {
                        viewer.src = zomatoUrl;
                        if (overlay) overlay.classList.add('hidden');
                    }

                } else {
                    // Fallback: Show search results
                    if (statusBar) statusBar.textContent = 'Exact match not found. Showing search results.';
                    if (viewer) {
                        viewer.src = searchUrl;
                        if (overlay) overlay.classList.add('hidden');
                    }
                }
            } else {
                if (statusBar) statusBar.textContent = 'Error contacting Zomato.';
                // Even on error, try loading search URL in iframe? 
                // If background fetch failed, iframe might also fail if blocked, but worth a try or just leave error.
                // We'll leave the error overlay for network failures.
                if (overlay) overlay.innerHTML = `<p>Connection failed. <a href="${searchUrl}" target="_blank">Search Manually</a></p>`;
            }
        });
    }

    // --- INIT & EVENTS ---

    // Event Listener for Data from Zomato Iframe
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'zomatoDataReceived') {
            console.log('Swiggy Ext: Received Data from Zomato', message.data);
            updateSidebarUI(message.data);
        }
    });

    function updateSidebarUI(data) {
        const statusBar = document.querySelector('.status-text');
        const overlay = document.getElementById('overlayMsg');
        const header = document.querySelector('.sidebar-header h3');

        if (data.bestMatchName) {
            if (header) header.textContent = `Zomato: ${data.bestMatchName.substring(0, 15)}...`;

            let statusHTML = `✓ Found: ${data.bestMatchName}`;
            if (data.rating) statusHTML += ` | <span style="color:green; font-weight:bold">★ ${data.rating}</span>`;
            if (data.cost) statusHTML += ` | ${data.cost}`;

            if (statusBar) statusBar.innerHTML = statusHTML;
        }

        if (data.bestMatchUrl && data.bestMatchUrl !== zomatoUrl) {
            zomatoUrl = data.bestMatchUrl;
            const viewer = document.getElementById('zomato-viewer');

            // If we are currently showing search results, maybe we should load the specific page?
            // Or just keep the user on search results but provide a direct link?
            // Let's provide a direct link in the status bar to be safe, as iframe redirects might be blocked
            if (statusBar) {
                statusBar.innerHTML += ` <a href="${zomatoUrl}" target="_blank" style="margin-left:5px;">Open Page ↗</a>`;
            }
        }

        if (overlay) overlay.classList.add('hidden');
    }

    // Init
    setInterval(detectRestaurant, 2000); // Check periodically for nav changes

})();
