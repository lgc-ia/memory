# python fetch_openmoji.py --mapping mapping.tsv --style color --fmt svg --out assets
# ou en PNG:
# python fetch_openmoji.py --mapping mapping.tsv --style color --fmt png --out assets

from __future__ import annotations
import argparse, csv, re
from pathlib import Path
from urllib.request import urlretrieve

RAW_BASE = "https://raw.githubusercontent.com/hfg-gmuend/openmoji/master"

def slugify_fr(name: str) -> str:
    name = name.strip().lower()
    name = name.replace("œ", "oe")
    name = re.sub(r"[’'`]", "", name)
    name = re.sub(r"[^a-z0-9]+", "_", name).strip("_")
    return name

def read_mapping_tsv(path: Path) -> list[tuple[str,str]]:
    rows = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) != 2:
                raise ValueError(f"Ligne invalide (attendu: nom<TAB>CODEPOINT): {line}")
            rows.append((parts[0], parts[1].upper()))
    return rows

def unique_path(p: Path) -> Path:
    if not p.exists():
        return p
    i = 2
    while True:
        q = p.with_stem(f"{p.stem}_{i:02d}")
        if not q.exists():
            return q
        i += 1

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mapping", default="mapping.tsv")
    ap.add_argument("--style", choices=["color","black"], default="color")
    ap.add_argument("--fmt", choices=["svg","png"], default="svg")
    ap.add_argument("--out", default="assets")
    args = ap.parse_args()

    mapping = read_mapping_tsv(Path(args.mapping))
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    # petit fichier d’attribution (utile Qualiopi + conformité licence)
    (out_dir / "ATTRIBUTION.txt").write_text(
        "Images: OpenMoji (CC BY-SA 4.0) https://openmoji.org/\n"
        "Source: https://github.com/hfg-gmuend/openmoji\n",
        encoding="utf-8"
    )

    for fr_name, code in mapping:
        fr_file = slugify_fr(fr_name)
        # OpenMoji: /color/svg/XXXX.svg ou /color/618x618/XXXX.png (selon export)
        if args.fmt == "svg":
            url = f"{RAW_BASE}/{args.style}/svg/{code}.svg"
            dest = unique_path(out_dir / f"{fr_file}.svg")
        else:
            # PNG export fréquent dans le repo: color/618x618/
            url = f"{RAW_BASE}/{args.style}/618x618/{code}.png"
            dest = unique_path(out_dir / f"{fr_file}.png")

        try:
            urlretrieve(url, dest)
            print("OK ", fr_name, "->", dest.name)
        except Exception as e:
            print("FAIL", fr_name, code, ":", e)

if __name__ == "__main__":
    main()
