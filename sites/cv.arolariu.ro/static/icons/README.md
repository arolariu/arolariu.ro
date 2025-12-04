# PWA Icons

This folder should contain the following icon files for the PWA manifest:

## Required Icons (PNG format)

### Standard Icons (`purpose: any`)
- `icon-48.png` - 48×48px
- `icon-72.png` - 72×72px
- `icon-96.png` - 96×96px
- `icon-128.png` - 128×128px
- `icon-144.png` - 144×144px (also used for MS Tile)
- `icon-152.png` - 152×152px
- `icon-192.png` - 192×192px (also used for Apple Touch Icon)
- `icon-256.png` - 256×256px
- `icon-384.png` - 384×384px
- `icon-512.png` - 512×512px

### Maskable Icons (with safe zone padding)
- `icon-maskable-192.png` - 192×192px with safe zone
- `icon-maskable-512.png` - 512×512px with safe zone

> **Note**: Maskable icons should have important content within the center 80% 
> (safe zone) as the edges may be cropped on some devices.

### Shortcut Icons
- `shortcut-human.png` - 96×96px (for Human CV shortcut)
- `shortcut-pdf.png` - 96×96px (for PDF shortcut)
- `shortcut-json.png` - 96×96px (for JSON shortcut)

## Generating Icons

You can generate these from a single high-resolution source image (1024×1024px recommended) using:

### Option 1: Online Tools
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [PWA Asset Generator](https://pwa-asset-generator.nicetab.dev/)

### Option 2: CLI Tool
```bash
npx pwa-asset-generator ./source-logo.png ./static/icons --manifest ./static/manifest.json
```

### Option 3: ImageMagick
```bash
# Generate standard icons
for size in 48 72 96 128 144 152 192 256 384 512; do
  magick source-logo.png -resize ${size}x${size} icon-${size}.png
done
```

## Social/OG Images

Also create these in the parent `static/` folder:
- `og-image.png` - 1200×630px (Open Graph / social sharing)
- `author.jpeg` - Already exists (profile photo)

## Screenshots (in `/screenshots` folder)

For richer PWA install experience:
- `desktop-home.png` - 1920×1080px (wide form factor)
- `mobile-home.png` - 750×1334px (narrow form factor)
