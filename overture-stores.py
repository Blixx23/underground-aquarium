#!/usr/bin/env python3
"""
Pull aquarium shops out of the Overture Maps places dataset.

Overture is the Linux Foundation's open map data project, built from Meta
and Microsoft business listings. It holds no OpenStreetMap data, so it
carries none of the ODbL share-alike obligations: CDLA-Permissive 2.0,
attribution only.

Set up once:

    cd ~/Developer/undergroundaquarium
    python3 -m venv .venv
    .venv/bin/pip install duckdb

Then:

    .venv/bin/python overture-stores.py --categories
        Find out what the shop categories are actually called in the
        current release, and how many of each are in the US.

    .venv/bin/python overture-stores.py --dump
        Write the candidate shops to overture-stores.json for review.

The first run downloads a few GB of parquet through DuckDB, so give it
time and a decent connection. Nothing is written to your database here:
import-overture.mjs does that, from the JSON this produces.
"""
import argparse
import json
import re
import sys
import urllib.request

BUCKET = "overturemaps-us-west-2"
FALLBACK_RELEASE = "2025-08-20.0"

# Rough continental US plus Alaska and Hawaii, as three boxes.
US_BOXES = [
    (-125.0, 24.0, -66.5, 49.5),   # lower 48
    (-179.9, 51.0, -129.0, 71.5),  # Alaska
    (-161.0, 18.5, -154.5, 22.5),  # Hawaii
]

INTERESTING = re.compile(r"pet|fish|aquari|aquatic|reptile", re.I)

US_STATES = (
    "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN "
    "MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA "
    "WV WI WY"
).split()


def latest_release() -> str:
    """Ask S3 what the newest release folder is, and fall back if it won't say."""
    url = f"https://{BUCKET}.s3.amazonaws.com/?list-type=2&prefix=release/&delimiter=/"
    try:
        with urllib.request.urlopen(url, timeout=45) as r:
            body = r.read().decode("utf-8", "replace")
        found = re.findall(r"<Prefix>release/([^<]+?)/</Prefix>", body)
        dated = sorted(p for p in found if re.match(r"^\d{4}-\d{2}-\d{2}", p))
        if dated:
            return dated[-1]
    except Exception as e:
        print(f"  (couldn't list releases: {e})", file=sys.stderr)
    return FALLBACK_RELEASE


def connect(release: str):
    import duckdb

    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute("SET s3_region='us-west-2';")
    con.execute("SET enable_progress_bar=true;")
    path = f"s3://{BUCKET}/release/{release}/theme=places/type=place/*"
    return con, path


def category_expr(con, path: str) -> str:
    """
    The schema is mid-migration from `categories` to `taxonomy`, and which
    one a release has depends on the release. Look before leaping.
    """
    cols = con.execute(f"describe select * from read_parquet('{path}') limit 1").fetchall()
    names = {c[0] for c in cols}
    types = {c[0]: c[1] for c in cols}
    if "taxonomy" in names:
        print(f"  schema: taxonomy  ({types['taxonomy'][:60]}…)")
        return "taxonomy.primary"
    if "categories" in names:
        print(f"  schema: categories  ({types['categories'][:60]}…)")
        return "categories.primary"
    sys.exit("Neither `taxonomy` nor `categories` in this release. Schema changed again.")


def us_filter(alias: str = "") -> str:
    p = f"{alias}." if alias else ""
    parts = [
        f"({p}bbox.xmin between {a} and {c} and {p}bbox.ymin between {b} and {d})"
        for (a, b, c, d) in US_BOXES
    ]
    return "(" + " or ".join(parts) + ")"


def cmd_categories(con, path: str, cat: str):
    print("\nCounting shop categories across the US. This reads a lot of parquet…\n")
    rows = con.execute(f"""
        select {cat} as category, count(*) as n
        from read_parquet('{path}', hive_partitioning=1)
        where {us_filter()}
          and {cat} is not null
          and regexp_matches({cat}, 'pet|fish|aquari|aquatic|reptile')
        group by 1
        order by n desc
    """).fetchall()
    if not rows:
        print("Nothing matched. The category naming may have changed.")
        return
    print(f"{'category':<40} {'count':>8}")
    print("-" * 49)
    for category, n in rows:
        print(f"{category:<40} {n:>8,}")
    print(f"\n{len(rows)} categories, {sum(r[1] for r in rows):,} places total.")
    print("Send me this list and I'll pick the ones worth importing.")


def cmd_dump(con, path: str, cat: str, categories: list[str], out: str):
    quoted = ", ".join("'" + c.replace("'", "''") + "'" for c in categories)
    base = cat.split(".")[0]  # taxonomy | categories
    alt = f"{base}.alternates"
    print(f"\nPulling places in: {', '.join(categories)}")
    print(f"…plus any place listing one of those as a secondary category.\n")

    # A shop filed under plain pet_store but tagged aquatic_pet_store
    # underneath is exactly the kind the OSM name-guessing missed.
    alt_clause = " or ".join(
        f"list_contains({alt}, '{c}')" for c in categories
    )

    rows = con.execute(f"""
        select
            id,
            names.primary                      as name,
            {cat}                              as category,
            addresses[1].freeform              as address,
            addresses[1].locality              as city,
            addresses[1].region                as region,
            addresses[1].postcode              as postcode,
            addresses[1].country               as country,
            phones[1]                          as phone,
            websites[1]                        as website,
            bbox.xmin                          as lng,
            bbox.ymin                          as lat,
            confidence
        from read_parquet('{path}', hive_partitioning=1)
        where {us_filter()}
          and ({cat} in ({quoted}) or {alt_clause})
          and names.primary is not null
        order by region, city, name
    """).fetchall()

    cols = ["id", "name", "category", "address", "city", "region", "postcode",
            "country", "phone", "website", "lng", "lat", "confidence"]
    data = [dict(zip(cols, r)) for r in rows]
    data = [d for d in data if (d.get("country") or "US") == "US"]

    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, default=str)

    by_state: dict[str, int] = {}
    for d in data:
        by_state[d.get("region") or "??"] = by_state.get(d.get("region") or "??", 0) + 1
    by_cat: dict[str, int] = {}
    for d in data:
        by_cat[d.get("category") or "??"] = by_cat.get(d.get("category") or "??", 0) + 1

    print(f"Wrote {len(data):,} places to {out}")
    print(f"States covered: {len(by_state)} of 51\n")
    print("By category:")
    for k, v in sorted(by_cat.items(), key=lambda kv: -kv[1]):
        print(f"  {k:<28} {v:>6,}")
    missing = [s for s in US_STATES if s not in by_state]
    if missing:
        print(f"\nStill no shops in: {' '.join(missing)}")
    thin = sorted(by_state.items(), key=lambda kv: kv[1])[:6]
    print("Thinnest: " + ", ".join(f"{k} {v}" for k, v in thin))
    low = sum(1 for d in data if (d.get("confidence") or 1) < 0.5)
    print(f"\nLow-confidence entries (under 0.5): {low:,} — worth a look before importing.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--categories", action="store_true",
                    help="list the pet/fish/aquarium categories in this release")
    ap.add_argument("--dump", action="store_true", help="write candidates to JSON")
    ap.add_argument("--cat", action="append", default=[],
                    help="category to pull (repeatable); used with --dump")
    ap.add_argument("--release", help="pin an Overture release, e.g. 2025-08-20.0")
    ap.add_argument("--out", default="overture-stores.json")
    args = ap.parse_args()

    if not args.categories and not args.dump:
        ap.error("pick --categories or --dump")

    release = args.release or latest_release()
    print(f"Overture release: {release}")
    con, path = connect(release)
    cat = category_expr(con, path)

    if args.categories:
        cmd_categories(con, path, cat)
    else:
        cats = args.cat or ["aquatic_pet_store"]
        cmd_dump(con, path, cat, cats, args.out)


if __name__ == "__main__":
    main()
