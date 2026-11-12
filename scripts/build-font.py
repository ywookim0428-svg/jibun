# 한자 표시용 글꼴 서브셋 생성 (Noto Serif KR, SIL OFL 1.1)
#   pip install fonttools brotli && python3 scripts/build-font.py
import glob, os, re
from fontTools import subset
from fontTools.ttLib import TTFont

chars = set()
for f in glob.glob('src/data/*/chars.txt'):
    for line in open(f, encoding='utf8'):
        if line.strip() and not line.startswith('#'):
            chars.add(ord(line[0]))
for old in glob.glob('src/fonts/hanja-*.woff2'):
    os.remove(old)
css, n = [], 0
for path in sorted(glob.glob('node_modules/@fontsource/noto-serif-kr/files/noto-serif-kr-*-600-normal.woff2')):
    have = chars & set(TTFont(path).getBestCmap().keys())
    if not have:
        continue
    chars -= have
    out = f'src/fonts/hanja-{n}.woff2'
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = []
    font = subset.load_font(path, opts)
    s = subset.Subsetter(opts)
    s.populate(unicodes=have)
    s.subset(font)
    subset.save_font(font, out, opts)
    rng = ','.join(f'U+{c:X}' for c in sorted(have))
    css.append(f"@font-face{{font-family:'Hanja';font-weight:600;font-display:swap;src:url('./hanja-{n}.woff2') format('woff2');unicode-range:{rng}}}")
    n += 1
open('src/fonts/hanja.css', 'w').write('/* 자동 생성: scripts/build-font.py — Noto Serif KR (SIL OFL 1.1) */\n' + '\n'.join(css) + '\n')
print(n, 'files; missing:', ''.join(map(chr, chars)))
