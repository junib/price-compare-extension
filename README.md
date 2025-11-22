# Price & Food Compare - Chrome Extension

A Chrome extension that helps you compare prices on e-commerce sites (Amazon.in & Flipkart) and find similar dishes on Swiggy.

## Features

### 🛒 E-commerce Price Comparison
- **Amazon.in**: Extract product info and compare with Flipkart
- **Flipkart**: Extract product info and compare with Amazon.in
- Shows price, rating, reviews, and brand information
- One-click comparison button on product pages

### 🍽️ Food Comparison (Swiggy)
- Click on any dish card to see similar dishes
- Shows price, rating, and similarity percentage
- Finds dishes with similar ingredients/names
- Displays top 5 similar options

## Installation

### From Source (Developer Mode)

1. **Clone or download this repository**
   ```bash
   cd price-compare-extension
   ```

2. **Create icon files** (optional but recommended)
   - Create three PNG files: `icon16.png`, `icon48.png`, `icon128.png`
   - Place them in the `icons/` folder
   - You can use any image editor or online icon generator

3. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `price-compare-extension` folder

4. **Pin the extension** (optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Price & Food Compare" and click the pin icon

## Usage

### E-commerce Sites (Amazon.in & Flipkart)

1. Visit a product page on Amazon.in or Flipkart
2. Look for the **"💰 Compare Prices"** button (appears automatically)
3. Click the button to see comparison panel
4. The extension will:
   - Show current product details
   - Search the other site for similar products
   - Provide a link to view results

### Swiggy (Food Delivery)

1. Visit Swiggy.com and browse restaurants/dishes
2. **Click on any dish card** you're interested in
3. A comparison panel will appear showing:
   - Selected dish details
   - Top 5 similar dishes with:
     - Price comparison
     - Rating
     - Similarity percentage
     - Direct link to view the dish

## How It Works

### E-commerce Comparison
- Extracts product information (title, price, rating, brand) from the current page
- Generates search keywords from the product title
- Opens search results on the comparison site
- Shows a comparison panel with product details

### Food Comparison
- Detects clicks on dish cards
- Extracts dish information (name, price, rating, description)
- Uses keyword matching to find similar dishes
- Calculates similarity score based on common keywords
- Displays results sorted by similarity and price

## Project Structure

```
price-compare-extension/
├── manifest.json              # Extension configuration
├── background.js              # Service worker for cross-site communication
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup script
├── content-scripts/
│   ├── amazon.js             # Amazon.in content script
│   ├── flipkart.js           # Flipkart content script
│   └── swiggy.js              # Swiggy content script
├── styles/
│   └── content.css           # Styles for comparison panels
├── icons/
│   ├── icon16.png            # 16x16 icon (create this)
│   ├── icon48.png            # 48x48 icon (create this)
│   └── icon128.png           # 128x128 icon (create this)
└── README.md                 # This file
```

## Technical Details

### Permissions
- `storage`: Store search queries temporarily
- `activeTab`: Access current tab content
- `tabs`: Monitor tab navigation
- Host permissions for Amazon.in, Flipkart, and Swiggy

### Content Scripts
- **Amazon.js**: Extracts product data using CSS selectors
- **Flipkart.js**: Extracts product data using CSS selectors
- **Swiggy.js**: Detects dish clicks and finds similar items

### Background Script
- Handles cross-site communication
- Stores pending searches when user navigates between sites
- Manages tab updates and messages

## Customization

### Adjusting Similarity Threshold (Swiggy)
Edit `content-scripts/swiggy.js`:
```javascript
if (similarity > 0.3) { // Change 0.3 to adjust threshold
```

### Changing Panel Position
Edit `styles/content.css`:
```css
#price-compare-panel {
    top: 20px;    /* Adjust position */
    right: 20px;  /* Adjust position */
}
```

### Adding More Sites
1. Create a new content script in `content-scripts/`
2. Add host permission in `manifest.json`
3. Add content script entry in `manifest.json`

## Troubleshooting

### Extension not working?
1. Check if you're on a supported site (Amazon.in, Flipkart, or Swiggy)
2. Make sure the extension is enabled in `chrome://extensions/`
3. Refresh the page after installing the extension
4. Check browser console for errors (F12)

### Comparison panel not showing?
1. Make sure you're on a product page (not search results)
2. For Swiggy, click directly on a dish card
3. For e-commerce, look for the "Compare Prices" button

### Icons not showing?
- Create the icon files manually (see Installation step 2)
- Or the extension will use Chrome's default icon

## Browser Compatibility

- Chrome (recommended)
- Edge (Chromium-based)
- Other Chromium-based browsers

## Legal & Ethical Considerations

⚠️ **Important Notes:**
- This extension only reads publicly available information from web pages
- It does not scrape or store personal data
- It respects website structure and doesn't bypass any security measures
- Use responsibly and in accordance with each site's Terms of Service

## Future Enhancements

- [ ] Add more e-commerce sites (Myntra, Nykaa, etc.)
- [ ] Add more food delivery apps (Zomato, etc.)
- [ ] Price history tracking
- [ ] Price drop alerts
- [ ] Save favorite comparisons
- [ ] Export comparison data

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

MIT License - Feel free to use and modify as needed.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Make sure you're using the latest version

---

**Happy Shopping & Eating! 🛒🍽️**

