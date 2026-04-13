import sys
try:
    from PIL import Image
    
    img = Image.open('frontend/public/ak47.png').convert("RGBA")
    pixels = img.load()
    width, height = img.size
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # Soft threshold for background removal
            if r < 35 and g < 35 and b < 35:
                pixels[x, y] = (0, 0, 0, 0)
                
    img.save('frontend/public/ak47_trans.png', "PNG")
    print("Background removed successfully")
except Exception as e:
    print(f"Error: {e}")
