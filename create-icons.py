#!/usr/bin/env python3
"""
Simple script to create placeholder icons for the Chrome extension
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
    
    def create_icon(size, filename):
        # Create image with gradient background
        img = Image.new('RGB', (size, size), color='#667eea')
        draw = ImageDraw.Draw(img)
        
        # Draw a simple shopping cart + food icon representation
        # Draw a circle (shopping cart)
        margin = size // 4
        draw.ellipse([margin, margin, size - margin, size - margin], 
                    fill='white', outline='#764ba2', width=2)
        
        # Draw a small circle inside (food)
        small_margin = size // 3
        draw.ellipse([small_margin, small_margin, size - small_margin, size - small_margin], 
                    fill='#ffc107', outline='white', width=1)
        
        # Save
        img.save(filename, 'PNG')
        print(f"Created {filename} ({size}x{size})")
    
    # Create icons directory if it doesn't exist
    os.makedirs('icons', exist_ok=True)
    
    # Create all three icon sizes
    create_icon(16, 'icons/icon16.png')
    create_icon(48, 'icons/icon48.png')
    create_icon(128, 'icons/icon128.png')
    
    print("\n✅ All icons created successfully!")
    
except ImportError:
    print("PIL/Pillow not installed. Creating simple alternative...")
    print("\nPlease install Pillow: pip install Pillow")
    print("Or create icons manually using any image editor.")
    
except Exception as e:
    print(f"Error: {e}")
    print("\nAlternative: Create icons manually or use an online icon generator")

