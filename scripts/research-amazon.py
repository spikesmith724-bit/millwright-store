"""Collects real Amazon listings for the catalog by searching amazon.com and reading the result cards.
Every row keeps the ASIN, title, image and the price shown on the search page on the day it was fetched.
Usage: python3 scripts/research-amazon.py > scripts/research.json"""
import json, re, subprocess, sys, time, random, html as H
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
def get(url):
    out = subprocess.run(['curl','-sL','--compressed','--max-time','30','-A',UA,'-H','Accept-Language: en-US,en;q=0.9','-w','\n__S%{http_code}',url],capture_output=True).stdout.decode('utf8','ignore')
    i = out.rfind('\n__S'); return int(out[i+4:] or 0), out[:i]
Q = json.load(open(sys.argv[2] if len(sys.argv) > 2 else 'scripts/research-queries.json'))
PER = int(sys.argv[1]) if len(sys.argv) > 1 else 4
res = []
for cat, qs in Q.items():
    for q in qs:
        st, h = get('https://www.amazon.com/s?k=' + q.replace(' ', '+'))
        if st != 200 or 'validateCaptcha' in h[:20000]:
            print('blocked', q, st, file=sys.stderr); time.sleep(8); continue
        n = 0
        for p in re.split(r'(?=<div role="listitem" data-asin=")', h)[1:]:
            a = re.search(r'data-asin="([A-Z0-9]{10})"', p)
            if not a or 'Sponsored' in p[:6000]: continue
            t = re.search(r'<h2[^>]*aria-label="([^"]+)"', p) or re.search(r'<h2[^>]*>.*?<span[^>]*>([^<]+)</span>', p, re.S)
            brand = re.search(r'<h2[^>]*class="[^"]*a-size-mini[^"]*"[^>]*>\s*<span[^>]*>([^<]+)</span>', p)
            img = re.search(r'class="s-image"[^>]*src="([^"]+)"', p)
            pr = re.search(r'class="a-price"[^>]*>\s*<span class="a-offscreen">\$([\d,]+\.\d\d)<', p)
            if not t or not img: continue
            res.append({'cat': cat, 'query': q, 'asin': a.group(1), 'brand': brand and H.unescape(brand.group(1).strip()), 'title': H.unescape(t.group(1).strip()), 'image': img.group(1), 'price': float(pr.group(1).replace(',', '')) if pr else None})
            n += 1
            if n >= PER: break
        print(cat, q, n, file=sys.stderr)
        time.sleep(float(sys.argv[3]) if len(sys.argv) > 3 else 2.5 + random.random() * 2)
json.dump(res, sys.stdout, indent=1)
