#!/usr/bin/env python3
"""
Crop a square Gemini-generated image to landscape (16:9) or portrait (9:16).

Gemini API always returns 2048x2048 regardless of size/aspect_ratio params.
This script center-crops to the desired ratio.

Usage:
    python3 crop-to-ratio.py input.png landscape   # 16:9
    python3 crop-to-ratio.py input.png portrait    # 9:16
    python3 crop-to-ratio.py input.png landscape -o output.png
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow not installed. Run: pip install Pillow --break-system-packages", file=sys.stderr)
    sys.exit(1)

RATIOS = {
    "landscape": (16, 9),
    "portrait": (9, 16),
    "ultrawide": (21, 9),
    "banner": (3, 1),
}


def crop_to_ratio(img: Image.Image, rw: int, rh: int) -> Image.Image:
    """Center-crop image to target aspect ratio rw:rh."""
    w, h = img.size
    target_ratio = rw / rh
    current_ratio = w / h

    if abs(current_ratio - target_ratio) < 0.02:
        return img  # Already close enough

    if current_ratio > target_ratio:
        # Too wide — crop width
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    else:
        # Too tall — crop height
        new_h = int(w / target_ratio)
        top = (h - new_h) // 2
        return img.crop((0, top, w, top + new_h))


def main():
    parser = argparse.ArgumentParser(description="Crop square image to target aspect ratio")
    parser.add_argument("input", help="Input image path")
    parser.add_argument("ratio", choices=list(RATIOS.keys()), help="Target aspect ratio")
    parser.add_argument("-o", "--output", help="Output path (default: overwrite input)")
    args = parser.parse_args()

    inp = Path(args.input)
    if not inp.exists():
        print(f"File not found: {inp}", file=sys.stderr)
        sys.exit(1)

    img = Image.open(inp)
    print(f"Input: {img.size[0]}x{img.size[1]}")

    rw, rh = RATIOS[args.ratio]
    cropped = crop_to_ratio(img, rw, rh)
    print(f"Output: {cropped.size[0]}x{cropped.size[1]} ({rw}:{rh})")

    out = Path(args.output) if args.output else inp
    cropped.save(out)
    print(f"Saved: {out}")


if __name__ == "__main__":
    main()
