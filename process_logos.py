import os
from PIL import Image

def analyze_and_process():
    base_dir = r'c:\laragon\www\pyreact\frontend\public'
    assets_dir = r'c:\laragon\www\pyreact\frontend\src\assets'
    
    # 1. LIGHT LOGO
    img_light = Image.open(os.path.join(base_dir, 'medisoft_logo_light.jpg')).convert('RGBA')
    pixels_l = list(img_light.getdata())
    new_l = []
    for r, g, b, a in pixels_l:
        # Near white
        if r > 240 and g > 240 and b > 240:
            new_l.append((r, g, b, 0))
        elif r > 220 and g > 220 and b > 220:
            avg = (r + g + b) / 3.0
            alpha = int((240 - avg) / 20.0 * 255)
            new_l.append((r, g, b, max(0, min(255, alpha))))
        else:
            new_l.append((r, g, b, 255))
    img_light.putdata(new_l)
    bbox_l = img_light.getbbox()
    if bbox_l:
        pad = 6
        w, h = img_light.size
        img_light = img_light.crop((max(0, bbox_l[0]-pad), max(0, bbox_l[1]-pad), min(w, bbox_l[2]+pad), min(h, bbox_l[3]+pad)))
    
    light_out = os.path.join(base_dir, 'medisoft_logo_light.png')
    img_light.save(light_out, 'PNG')
    print('Light cropped size:', img_light.size)

    # 2. DARK LOGO
    img_dark = Image.open(os.path.join(base_dir, 'medisoft_logo_dark.jpg')).convert('RGBA')
    # Sample background color from top-left 20x20 area
    bg_samples = [img_dark.getpixel((x, y)) for x in range(10) for y in range(10)]
    avg_bg_r = sum(c[0] for c in bg_samples) / len(bg_samples)
    avg_bg_g = sum(c[1] for c in bg_samples) / len(bg_samples)
    avg_bg_b = sum(c[2] for c in bg_samples) / len(bg_samples)
    print(f'Dark BG sample: R={avg_bg_r:.1f}, G={avg_bg_g:.1f}, B={avg_bg_b:.1f}')
    
    pixels_d = list(img_dark.getdata())
    new_d = []
    for r, g, b, a in pixels_d:
        # Euclidean distance to dark background
        dist = ((r - avg_bg_r)**2 + (g - avg_bg_g)**2 + (b - avg_bg_b)**2)**0.5
        if dist < 18:
            new_d.append((r, g, b, 0))
        elif dist < 35:
            alpha = int((dist - 18) / 17.0 * 255)
            new_d.append((r, g, b, max(0, min(255, alpha))))
        else:
            new_d.append((r, g, b, 255))
            
    img_dark.putdata(new_d)
    bbox_d = img_dark.getbbox()
    if bbox_d:
        pad = 6
        w, h = img_dark.size
        img_dark = img_dark.crop((max(0, bbox_d[0]-pad), max(0, bbox_d[1]-pad), min(w, bbox_d[2]+pad), min(h, bbox_d[3]+pad)))
    
    dark_out = os.path.join(base_dir, 'medisoft_logo_dark.png')
    img_dark.save(dark_out, 'PNG')
    print('Dark cropped size:', img_dark.size)

    # 3. FAVICON
    img_fav = Image.open(os.path.join(base_dir, 'medisoft_favicon.jpg')).convert('RGBA')
    fav_samples = [img_fav.getpixel((x, y)) for x in range(10) for y in range(10)]
    f_bg_r = sum(c[0] for c in fav_samples) / len(fav_samples)
    f_bg_g = sum(c[1] for c in fav_samples) / len(fav_samples)
    f_bg_b = sum(c[2] for c in fav_samples) / len(fav_samples)
    
    pixels_f = list(img_fav.getdata())
    new_f = []
    for r, g, b, a in pixels_f:
        dist = ((r - f_bg_r)**2 + (g - f_bg_g)**2 + (b - f_bg_b)**2)**0.5
        if dist < 18:
            new_f.append((r, g, b, 0))
        elif dist < 35:
            alpha = int((dist - 18) / 17.0 * 255)
            new_f.append((r, g, b, max(0, min(255, alpha))))
        else:
            new_f.append((r, g, b, 255))
            
    img_fav.putdata(new_f)
    bbox_f = img_fav.getbbox()
    if bbox_f:
        pad = 12
        w, h = img_fav.size
        # Center square
        bw = (bbox_f[2] - bbox_f[0])
        bh = (bbox_f[3] - bbox_f[1])
        dim = max(bw, bh) + pad * 2
        cx = (bbox_f[0] + bbox_f[2]) // 2
        cy = (bbox_f[1] + bbox_f[3]) // 2
        half = dim // 2
        img_fav = img_fav.crop((max(0, cx-half), max(0, cy-half), min(w, cx+half), min(h, cy+half)))
        
    fav_out = os.path.join(base_dir, 'medisoft_favicon.png')
    img_fav.save(fav_out, 'PNG')
    print('Favicon cropped size:', img_fav.size)

    # Copy to assets
    for f in ['medisoft_logo_light.png', 'medisoft_logo_dark.png', 'medisoft_favicon.png']:
        src = os.path.join(base_dir, f)
        dst = os.path.join(assets_dir, f)
        with open(src, 'rb') as sf, open(dst, 'wb') as df:
            df.write(sf.read())

if __name__ == '__main__':
    analyze_and_process()
