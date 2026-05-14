#!/usr/bin/env python3
import os
import shutil
import subprocess
import tempfile


ROOT = os.path.dirname(os.path.abspath(__file__))
# Target for Electron Builder
ELECTRON_BUILD = os.path.join(ROOT, "electron-wrapper", "build")
ICON_PNG = os.path.join(ELECTRON_BUILD, "icon.png")
ICON_ICNS = os.path.join(ELECTRON_BUILD, "icon.icns")
ICON_ICO = os.path.join(ELECTRON_BUILD, "icon.ico")


def first_existing(paths):
    for path in paths:
        if path and os.path.exists(path):
            return path
    return None


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def build_icns(source_png, output_icns):
    iconutil = shutil.which("iconutil")
    sips = shutil.which("sips")
    if not iconutil or not sips:
        return False

    with tempfile.TemporaryDirectory() as tmp:
        iconset = os.path.join(tmp, "LuxAutomaton.iconset")
        os.makedirs(iconset, exist_ok=True)

        sizes = [16, 32, 128, 256, 512]
        for size in sizes:
            run([sips, "-z", str(size), str(size), source_png, "--out", os.path.join(iconset, f"icon_{size}x{size}.png")])
            run([sips, "-z", str(size * 2), str(size * 2), source_png, "--out", os.path.join(iconset, f"icon_{size}x{size}@2x.png")])

        run([iconutil, "-c", "icns", iconset, "-o", output_icns])
    return os.path.exists(output_icns)


def main():
    os.makedirs(ELECTRON_BUILD, exist_ok=True)

    source_png = first_existing([
        os.path.join(ROOT, "Logos", "logo.png"),
        os.path.join(ROOT, "Logos", "Lux Higgsfield Studio.png"),
        os.path.join(ROOT, "Logos", "Lux Automaton.png"),
        os.path.join(ROOT, "static", "brand", "logo.png"),
    ])

    if not source_png:
        print("No source logo found (expected Logos/Lux Automaton.png or Logos/logo.png)")
        return

    print(f"Using source logo: {source_png}")

    sips = shutil.which("sips")
    if sips:
        # Generate high-res icon.png for Linux/General
        run([sips, "-z", "1024", "1024", source_png, "--out", ICON_PNG])
        
        # Build ICNS for Mac
        if build_icns(source_png, ICON_ICNS):
            print(f"macOS Icon created: {ICON_ICNS}")
    else:
        shutil.copy2(source_png, ICON_PNG)
        print(f"PNG Icon copied: {ICON_PNG} (sips missing)")

    # For .ico, we'd ideally use convert (ImageMagick), but we'll fallback to sips/png if unavailable
    # electron-builder can often handle png -> ico if ico is missing, but it's better to have it.
    
    print("Icon assets preparation complete.")


if __name__ == "__main__":
    main()
