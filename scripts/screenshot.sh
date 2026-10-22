#!/usr/bin/env bash
# Phone-width (390px) headless Chrome screenshots. Usage: scripts/screenshot.sh <base-url>
set -e
BASE=${1:-https://spikesmith724-bit.github.io/millwright-store}
shot() { google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=390,2400 --force-device-scale-factor=2 --virtual-time-budget=15000 --screenshot="preview/$2" "$BASE$1" >/dev/null 2>&1; echo "preview/$2"; }
shot / home.png
shot /category/precision/ category-precision.png
