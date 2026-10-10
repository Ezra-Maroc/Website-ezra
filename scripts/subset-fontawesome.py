"""Genere une version reduite de Font Awesome (CSS + polices) limitee aux icones du site.

Font Awesome complet = ~270 Ko de polices + ~100 Ko de CSS charges sur chaque page, alors que
le site n'utilise qu'une soixantaine d'icones. Ce script :
  1. repere les icones utilisees (classes fa-* dans src/ et public/js, codes \\fXXX dans les CSS) ;
  2. decoupe les polices solid / regular / brands a ces seuls glyphes (WOFF2) ;
  3. ecrit src/styles/fontawesome-subset.css (regles de base + icones utilisees uniquement).

A RELANCER apres l'ajout d'une nouvelle icone :  python scripts/subset-fontawesome.py
Prerequis : Python 3 avec fonttools et brotli (pip install fonttools brotli), npm install fait.
"""
import pathlib
import re
import sys

from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
FA = ROOT / "node_modules" / "@fortawesome" / "fontawesome-free"
OUT_CSS = ROOT / "src" / "styles" / "fontawesome-subset.css"
OUT_FONTS = ROOT / "src" / "assets" / "fontawesome"

# 1. Icones utilisees -------------------------------------------------------------------------
used = set()
for folder, exts in ((ROOT / "src", ("*.astro", "*.ts", "*.js")), (ROOT / "public" / "js", ("*.js", "*.json"))):
    for ext in exts:
        for p in folder.rglob(ext):
            if p.resolve() == OUT_CSS.resolve():
                continue
            used.update(re.findall(r"\bfa-[a-z0-9]+(?:-[a-z0-9]+)*", p.read_text(encoding="utf-8", errors="replace")))
direct = set()  # codes utilises directement par les feuilles de style du site (content: "\f10d")
for p in (ROOT / "public" / "styles").rglob("*.css"):
    direct.update(int(c, 16) for c in re.findall(r"content:\s*['\"]\\(f[0-9a-f]{3})['\"]", p.read_text(encoding="utf-8")))

# 2. Lecture de all.css en blocs de premier niveau ---------------------------------------------
css = (FA / "css" / "all.css").read_text(encoding="utf-8")
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
blocks, depth, start = [], 0, 0
for i, ch in enumerate(css):
    if ch == "{":
        depth += 1
    elif ch == "}":
        depth -= 1
        if depth == 0:
            blocks.append(css[start:i + 1].strip())
            start = i + 1

# all.css ecrit les icones solid/regular avec "::before" mais les icones de marque avec ":before"
ICON_RULE = re.compile(r"^((?:\.fa-[a-z0-9-]+::?before\s*,\s*)*\.fa-[a-z0-9-]+::?before)\s*\{\s*content:\s*\"\\([0-9a-f]+)\";\s*\}$")
kept, codepoints, dropped = [], set(direct), 0
for b in blocks:
    m = ICON_RULE.match(b)
    if m:
        names = {re.sub(r"::?before$", "", s.strip()) for s in m.group(1).split(",")}
        if names & {"." + u for u in used}:
            kept.append(b)
            codepoints.add(int(m.group(2), 16))
        else:
            dropped += 1
        continue
    if b.startswith("@font-face"):
        fam = re.search(r"src:\s*url\(\"\.\./webfonts/(fa-[a-z0-9-]+)\.woff2\"\)", b)
        if not fam or fam.group(1) == "fa-v4compatibility":
            continue  # police de compatibilite v4 inutile
        b = re.sub(r"src:[^;]+;", f"src: url(\"../assets/fontawesome/{fam.group(1)}.subset.woff2\") format(\"woff2\");", b)
    kept.append(b)

# 3. Decoupage des polices ---------------------------------------------------------------------
OUT_FONTS.mkdir(parents=True, exist_ok=True)
sizes = {}
for name in ("fa-solid-900", "fa-regular-400", "fa-brands-400"):
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.notdef_outline = True
    font = subset.load_font(str(FA / "webfonts" / f"{name}.ttf"), opts)
    available = set(font.getBestCmap() or {})
    wanted = codepoints & available
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=wanted)
    sub.subset(font)
    out = OUT_FONTS / f"{name}.subset.woff2"
    subset.save_font(font, str(out), opts)
    sizes[name] = (len(wanted), out.stat().st_size)

header = ("/* Font Awesome Free 6.5.1 (https://fontawesome.com, licence : https://fontawesome.com/license/free)\n"
          " * VERSION REDUITE generee par scripts/subset-fontawesome.py : seules les icones du site sont incluses.\n"
          " * Apres l'ajout d'une nouvelle icone, relancer : python scripts/subset-fontawesome.py */\n")
OUT_CSS.write_text(header + "\n".join(kept) + "\n", encoding="utf-8", newline="\n")

sys.stdout.reconfigure(encoding="utf-8")
print(f"classes fa-* reperees : {len(used)} | regles d'icones gardees : {sum(1 for b in kept if ICON_RULE.match(b))} | ecartees : {dropped}")
for name, (n, size) in sizes.items():
    print(f"  {name}.subset.woff2 : {n} glyphes, {size / 1024:.1f} Ko")
print(f"  {OUT_CSS.relative_to(ROOT)} : {OUT_CSS.stat().st_size / 1024:.1f} Ko")
