# /// script
# dependencies = [
#   "pydantic",
# ]
# ///
#!/usr/bin/env python3
"""
Yeast Ingestion & Seed Builder.

Extracts the catalog of brewing yeast strains from
Beer Analytics (https://www.beer-analytics.com/yeasts/).

Synthesizes brewing parameters (apparent attenuation %, flocculation
character, alcohol tolerance, and sensory notes) and outputs validated
Pydantic models to:
  - backend/app/seeds/yeasts.json
"""

import json
import re
import sys
from pathlib import Path

# Add backend directory to path so app.schemas can be imported
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.schemas.primitives import YeastPrimitive

# Canonical list of raw yeast strains from beer-analytics.com by manufacturer.
RAW_YEASTS = {
    "Wyeast": [
        "Wyeast 1007 German Ale",
        "Wyeast 1010 American Wheat",
        "Wyeast 1028 London Ale",
        "Wyeast 1056 American Ale",
        "Wyeast 1084 Irish Ale",
        "Wyeast 1098 British Ale",
        "Wyeast 1099 Whitbread Ale",
        "Wyeast 1187 Ringwood Ale",
        "Wyeast 1272 American Ale II",
        "Wyeast 1275 Thames Valley Ale",
        "Wyeast 1318 London Ale III",
        "Wyeast 1332 Northwest Ale",
        "Wyeast 1335 British Ale II",
        "Wyeast 1450 Denny's Favorite 50",
        "Wyeast 1469 West Yorkshire Ale",
        "Wyeast 1728 Scottish Ale",
        "Wyeast 1968 London ESB Ale",
        "Wyeast 2007 Pilsen Lager",
        "Wyeast 2035 American Lager",
        "Wyeast 2042 Danish Lager",
        "Wyeast 2112 California Lager",
        "Wyeast 2124 Bohemian Lager",
        "Wyeast 2206 Bavarian Lager",
        "Wyeast 2278 Czech Pils",
        "Wyeast 2308 Munich Lager",
        "Wyeast 2565 Kolsch",
        "Wyeast 3068 Weihenstephan Weizen",
        "Wyeast 3278 Belgian Lambic Blend",
        "Wyeast 3522 Belgian Ardennes",
        "Wyeast 3711 French Saison",
        "Wyeast 3724 Belgian Saison",
        "Wyeast 3787 Trappist High Gravity",
        "Wyeast 3944 Belgian Witbier",
        "Wyeast 5526 Brettanomyces Lambicus",
        "Wyeast 5335 Lactobacillus",
    ],
    "White Labs": [
        "White Labs WLP001 California Ale",
        "White Labs WLP002 English Ale",
        "White Labs WLP004 Irish Ale",
        "White Labs WLP005 British Ale",
        "White Labs WLP007 Dry English Ale",
        "White Labs WLP008 East Coast Ale",
        "White Labs WLP013 London Ale",
        "White Labs WLP023 Burton Ale",
        "White Labs WLP029 German Ale/Kolsch",
        "White Labs WLP036 Dusseldorf Alt",
        "White Labs WLP041 Pacific Ale",
        "White Labs WLP051 California V Ale",
        "White Labs WLP090 San Diego Super Yeast",
        "White Labs WLP099 Super High Gravity Ale",
        "White Labs WLP300 Hefeweizen Ale",
        "White Labs WLP320 American Hefeweizen",
        "White Labs WLP351 Bavarian Weizen",
        "White Labs WLP380 Hefeweizen IV Ale",
        "White Labs WLP400 Belgian Wit Ale",
        "White Labs WLP500 Monastery Ale",
        "White Labs WLP530 Abbey Ale",
        "White Labs WLP550 Belgian Ale",
        "White Labs WLP565 Belgian Saison I",
        "White Labs WLP566 Belgian Saison II",
        "White Labs WLP570 Belgian Golden Ale",
        "White Labs WLP800 Pilsner Lager",
        "White Labs WLP802 Czech Budejovice Lager",
        "White Labs WLP810 San Francisco Lager",
        "White Labs WLP820 Oktoberfest/Marzen Lager",
        "White Labs WLP830 German Lager",
        "White Labs WLP833 German Bock Lager",
        "White Labs WLP838 Southern German Lager",
        "White Labs WLP840 American Lager",
        "White Labs WLP940 Mexican Lager",
        "White Labs WLP644 Saccharomyces Bruxellensis Trois",
        "White Labs WLP650 Brettanomyces Bruxellensis",
        "White Labs WLP653 Brettanomyces Lambicus",
        "White Labs WLP677 Lactobacillus Delbrueckii",
    ],
    "Imperial Yeast": [
        "Imperial A01 House",
        "Imperial A07 Flagship",
        "Imperial A09 Pub",
        "Imperial A10 Darkness",
        "Imperial A18 Joystick",
        "Imperial A20 Citrus",
        "Imperial A24 Dry Hop",
        "Imperial A38 Juice",
        "Imperial A43 Loki",
        "Imperial B44 Whiteout",
        "Imperial B45 Gnome",
        "Imperial B48 Triple Double",
        "Imperial B56 Rustic",
        "Imperial B64 Napoleon",
        "Imperial L05 Cablecar",
        "Imperial L13 Global",
        "Imperial L17 Harvest",
        "Imperial L28 Urkel",
        "Imperial L34 San Fran",
        "Imperial W15 Suburban Brett",
    ],
    "Lallemand": [
        "Lallemand Nottingham Ale",
        "Lallemand Windsor Ale",
        "Lallemand London ESB Ale",
        "Lallemand Verdant IPA",
        "Lallemand Voss Kveik",
        "Lallemand Lutra Kveik",
        "Lallemand Munich Classic",
        "Lallemand Munich Wheat",
        "Lallemand Diamond Lager",
        "Lallemand NovaLager",
        "Lallemand Belle Saison",
        "Lallemand Abbaye",
        "Lallemand CBC-1 Cask & Bottle Conditioned",
        "Lallemand Philly Sour",
        "Lallemand WildBrew Sour Pitch",
    ],
    "Fermentis": [
        "Fermentis SafAle US-05",
        "Fermentis SafAle S-04",
        "Fermentis SafAle K-97",
        "Fermentis SafAle BE-134",
        "Fermentis SafAle WB-06",
        "Fermentis SafAle HA-18",
        "Fermentis SafLager W-34/70",
        "Fermentis SafLager S-23",
        "Fermentis SafLager S-189",
        "Fermentis SafLager E-30",
        "Fermentis SafBrew T-58",
        "Fermentis SafBrew BE-256",
        "Fermentis SafBrew WB-06",
        "Fermentis SafCider AB-1",
        "Fermentis SafCider AS-2",
    ],
    "Omega Yeast": [
        "Omega OYL-004 West Coast Ale I",
        "Omega OYL-005 Irish Ale",
        "Omega OYL-011 British Ale V",
        "Omega OYL-014 British Ale VIII",
        "Omega OYL-021 Conan",
        "Omega OYL-024 Belgian Ale A",
        "Omega OYL-026 Belgian Ale W",
        "Omega OYL-028 Belgian Ale R",
        "Omega OYL-033 Belgian Saison I",
        "Omega OYL-042 Belgian Saison II",
        "Omega OYL-052 DIPA Ale",
        "Omega OYL-057 HotHead Ale",
        "Omega OYL-061 Voss Kveik",
        "Omega OYL-071 Lutra Kveik",
        "Omega OYL-091 Hornindal Kveik",
        "Omega OYL-101 Pilsner I",
        "Omega OYL-107 Oktoberfest",
        "Omega OYL-111 German Bock",
        "Omega OYL-114 Bayern Lager",
        "Omega OYL-200 Tropical IPA",
        "Omega OYL-210 Saisonstein's Monster",
        "Omega OYL-218 Bring On Da Funk",
        "Omega OYL-402 Brettanomyces Bruxellensis",
        "Omega OYL-403 Brettanomyces Claussenii",
        "Omega OYL-605 Lactobacillus Blend",
    ],
    "Bootleg Biology": [
        "Bootleg Biology BBX001 The Mad Fermentationist Saison Blend",
        "Bootleg Biology BBX002 Saison Parfait",
        "Bootleg Biology BBX003 Sour Solera Blend",
        "Bootleg Biology BBX004 Funk Weapon #1",
        "Bootleg Biology BBX005 Funk Weapon #2",
        "Bootleg Biology BBX006 Funk Weapon #3",
        "Bootleg Biology BBX007 Local Yeast Project",
    ],
    "East Coast Yeast": [
        "East Coast Yeast ECY01 BugFarm",
        "East Coast Yeast ECY02 Flemish Ale",
        "East Coast Yeast ECY03 Farmhouse Brett",
        "East Coast Yeast ECY04 Brett Anomalus",
        "East Coast Yeast ECY05 Brett Blend #1",
        "East Coast Yeast ECY06 Berliner Blend",
        "East Coast Yeast ECY07 Scottish Heavy",
        "East Coast Yeast ECY08 Saison Brasserie",
        "East Coast Yeast ECY09 Belgian Abbaye",
        "East Coast Yeast ECY10 Old Newark Ale",
        "East Coast Yeast ECY11 Farmhouse Saison",
        "East Coast Yeast ECY12 Big Belgian Ale",
        "East Coast Yeast ECY13 Trappist Ale",
        "East Coast Yeast ECY14 Scottish Ale",
        "East Coast Yeast ECY15 Saison Brasserie Blend",
        "East Coast Yeast ECY16 Berliner Weisse Blend",
        "East Coast Yeast ECY17 BugCounty",
        "East Coast Yeast ECY18 Berliner Blend",
        "East Coast Yeast ECY19 Berliner Blend",
        "East Coast Yeast ECY20 BugFarm",
    ],
}


def slugify(text: str) -> str:
    """Creates a URL-safe, lowercase kebab-case slug from display name."""
    s = text.replace("–", "-").replace("—", "-").replace("/", " ")
    s = re.sub(r"[^\w\s-]", "", s).strip().lower()
    return re.sub(r"[-\s]+", "-", s)


# Detailed technical metadata lookup keyed by normalized item slug.
# Flocculation values: "Low", "Medium-Low", "Medium", "Medium-High", "High".
YEAST_SPECS = {
    # --- Wyeast ---
    "wyeast-1007-german-ale": {
        "attenuation_pct": 75.0, "flocculation": "Low", "alcohol_tolerance_abv": 11.0,
        "notes": "Altbier and German ale strain. Ferments dry and crisp, producing a well-balanced profile with slight sulfur notes.",
    },
    "wyeast-1010-american-wheat": {
        "attenuation_pct": 76.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Produces a slightly tart, crisp, American wheat beer profile with a dry finish and low flocculation.",
    },
    "wyeast-1028-london-ale": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Rich, minerally, and slightly fruity English ale strain. Classic for London-style porters and stouts.",
    },
    "wyeast-1056-american-ale": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "The quintessential American ale strain. Clean, crisp, and neutral, allowing hops and malt to shine.",
    },
    "wyeast-1084-irish-ale": {
        "attenuation_pct": 73.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Smooth, slightly fruity Irish ale strain. Ideal for dry Irish stouts and red ales.",
    },
    "wyeast-1098-british-ale": {
        "attenuation_pct": 74.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Classic British ale strain producing malty, fruity beers with a clean finish.",
    },
    "wyeast-1099-whitbread-ale": {
        "attenuation_pct": 73.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Whitbread strain. Balanced, slightly fruity, and well-suited to English pale ales and bitters.",
    },
    "wyeast-1187-ringwood-ale": {
        "attenuation_pct": 74.0, "flocculation": "High", "alcohol_tolerance_abv": 10.0,
        "notes": "Ringwood strain. Produces a distinctive fruity, estery profile with a full body.",
    },
    "wyeast-1272-american-ale-ii": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Slightly more fruity and flocculent than 1056. Excellent for American IPAs and pale ales.",
    },
    "wyeast-1275-thames-valley-ale": {
        "attenuation_pct": 74.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Traditional Thames Valley strain. Rich, malty, and slightly fruity with a clean finish.",
    },
    "wyeast-1318-london-ale-iii": {
        "attenuation_pct": 73.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Boddingtons strain. Produces a soft, full-bodied, slightly sweet English ale profile.",
    },
    "wyeast-1332-northwest-ale": {
        "attenuation_pct": 74.0, "flocculation": "High", "alcohol_tolerance_abv": 10.0,
        "notes": "Northwest ale strain. Clean, malty, and well-balanced with good flocculation.",
    },
    "wyeast-1335-british-ale-ii": {
        "attenuation_pct": 74.0, "flocculation": "High", "alcohol_tolerance_abv": 10.0,
        "notes": "British Ale II. Malty, slightly fruity, and highly flocculent.",
    },
    "wyeast-1450-denny-s-favorite-50": {
        "attenuation_pct": 77.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Denny's Favorite 50. Versatile, clean, and slightly fruity. Excellent for American ales.",
    },
    "wyeast-1469-west-yorkshire-ale": {
        "attenuation_pct": 73.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Timothy Taylor strain. Produces a distinctive fruity, malty Yorkshire ale profile.",
    },
    "wyeast-1728-scottish-ale": {
        "attenuation_pct": 73.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Scottish ale strain. Clean, malty, and slightly smoky. Ideal for Scottish ales and wee heavies.",
    },
    "wyeast-1968-london-esb-ale": {
        "attenuation_pct": 73.0, "flocculation": "High", "alcohol_tolerance_abv": 10.0,
        "notes": "Fullers strain. Rich, malty, and highly flocculent. Classic for London ESB and bitters.",
    },
    "wyeast-2007-pilsen-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Classic Pilsen lager strain. Clean, crisp, and slightly sulfurous. Ideal for Bohemian pilsners.",
    },
    "wyeast-2035-american-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "American lager strain. Clean, crisp, and neutral. Ideal for light lagers and steam beers.",
    },
    "wyeast-2042-danish-lager": {
        "attenuation_pct": 76.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Danish lager strain. Clean, crisp, and slightly malty. Ideal for European lagers.",
    },
    "wyeast-2112-california-lager": {
        "attenuation_pct": 74.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "California lager strain. Ferments cleanly at ale temperatures. Ideal for California common.",
    },
    "wyeast-2124-bohemian-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Bohemian lager strain. Clean, crisp, and slightly malty. Ideal for Czech pilsners.",
    },
    "wyeast-2206-bavarian-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Bavarian lager strain. Clean, malty, and slightly sulfurous. Ideal for German lagers.",
    },
    "wyeast-2278-czech-pils": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Czech Pils strain. Clean, crisp, and slightly diacetyl-producing. Ideal for Czech pilsners.",
    },
    "wyeast-2308-munich-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Munich lager strain. Clean, malty, and slightly sulfurous. Ideal for Munich lagers and bocks.",
    },
    "wyeast-2565-kolsch": {
        "attenuation_pct": 75.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Kolsch strain. Produces a clean, crisp, slightly fruity ale profile. Ideal for Kolsch and altbier.",
    },
    "wyeast-3068-weihenstephan-weizen": {
        "attenuation_pct": 73.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Weihenstephan Weizen strain. Produces classic banana and clove phenolics. Ideal for Bavarian hefeweizens.",
    },
    "wyeast-3278-belgian-lambic-blend": {
        "attenuation_pct": 75.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian lambic blend. Contains Saccharomyces, Brettanomyces, and lactic acid bacteria. Ideal for lambic and gueuze.",
    },
    "wyeast-3522-belgian-ardennes": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian Ardennes strain. Produces a spicy, phenolic, and slightly fruity Belgian ale profile.",
    },
    "wyeast-3711-french-saison": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "French Saison strain. Highly attenuative, producing a dry, spicy, and slightly tart saison profile.",
    },
    "wyeast-3724-belgian-saison": {
        "attenuation_pct": 78.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian Saison strain. Produces a spicy, phenolic, and highly attenuative saison profile.",
    },
    "wyeast-3787-trappist-high-gravity": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 14.0,
        "notes": "Trappist High Gravity strain. Produces a rich, fruity, and phenolic Belgian ale profile.",
    },
    "wyeast-3944-belgian-witbier": {
        "attenuation_pct": 74.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Belgian Witbier strain. Produces a spicy, phenolic, and slightly tart witbier profile.",
    },
    "wyeast-5526-brettanomyces-lambicus": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Brettanomyces lambicus. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },
    "wyeast-5335-lactobacillus": {
        "attenuation_pct": 50.0, "flocculation": "Low", "alcohol_tolerance_abv": 5.0,
        "notes": "Lactobacillus delbrueckii. Produces clean lactic acid for Berliner weisse and kettle sours.",
    },

    # --- White Labs ---
    "white-labs-wlp001-california-ale": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "California Ale strain. Clean, crisp, and neutral. The workhorse American ale yeast.",
    },
    "white-labs-wlp002-english-ale": {
        "attenuation_pct": 70.0, "flocculation": "High", "alcohol_tolerance_abv": 10.0,
        "notes": "English Ale strain. Malty, slightly fruity, and highly flocculent. Ideal for English bitters.",
    },
    "white-labs-wlp004-irish-ale": {
        "attenuation_pct": 73.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Irish Ale strain. Smooth, slightly fruity, and well-suited to stouts and red ales.",
    },
    "white-labs-wlp005-british-ale": {
        "attenuation_pct": 70.0, "flocculation": "High", "alcohol_tolerance_abv": 10.0,
        "notes": "British Ale strain. Malty, slightly fruity, and highly flocculent.",
    },
    "white-labs-wlp007-dry-english-ale": {
        "attenuation_pct": 75.0, "flocculation": "High", "alcohol_tolerance_abv": 10.0,
        "notes": "Dry English Ale strain. Highly attenuative and flocculent. Ideal for dry English ales.",
    },
    "white-labs-wlp008-east-coast-ale": {
        "attenuation_pct": 73.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "East Coast Ale strain. Clean, slightly fruity, and well-balanced.",
    },
    "white-labs-wlp013-london-ale": {
        "attenuation_pct": 72.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "London Ale strain. Rich, malty, and slightly fruity. Ideal for London-style ales.",
    },
    "white-labs-wlp023-burton-ale": {
        "attenuation_pct": 72.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Burton Ale strain. Produces a distinctive minerally, fruity English ale profile.",
    },
    "white-labs-wlp029-german-ale-kolsch": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "German Ale/Kolsch strain. Clean, crisp, and slightly fruity. Ideal for Kolsch and altbier.",
    },
    "white-labs-wlp036-dusseldorf-alt": {
        "attenuation_pct": 70.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Dusseldorf Alt strain. Clean, malty, and slightly fruity. Ideal for altbier.",
    },
    "white-labs-wlp041-pacific-ale": {
        "attenuation_pct": 72.0, "flocculation": "High", "alcohol_tolerance_abv": 10.0,
        "notes": "Pacific Ale strain. Malty, slightly fruity, and highly flocculent.",
    },
    "white-labs-wlp051-california-v-ale": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "California V Ale strain. Slightly more fruity and flocculent than WLP001.",
    },
    "white-labs-wlp090-san-diego-super-yeast": {
        "attenuation_pct": 78.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "San Diego Super Yeast. Highly attenuative, clean, and flocculent. Ideal for West Coast IPAs.",
    },
    "white-labs-wlp099-super-high-gravity-ale": {
        "attenuation_pct": 80.0, "flocculation": "Medium", "alcohol_tolerance_abv": 25.0,
        "notes": "Super High Gravity Ale strain. Extremely alcohol-tolerant. Ideal for barleywines and imperial stouts.",
    },
    "white-labs-wlp300-hefeweizen-ale": {
        "attenuation_pct": 73.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Hefeweizen Ale strain. Produces classic banana and clove phenolics.",
    },
    "white-labs-wlp320-american-hefeweizen": {
        "attenuation_pct": 73.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "American Hefeweizen strain. Produces a clean, slightly tart American wheat profile.",
    },
    "white-labs-wlp351-bavarian-weizen": {
        "attenuation_pct": 73.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Bavarian Weizen strain. Produces classic banana and clove phenolics.",
    },
    "white-labs-wlp380-hefeweizen-iv-ale": {
        "attenuation_pct": 73.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Hefeweizen IV Ale strain. Produces a balanced banana and clove phenolic profile.",
    },
    "white-labs-wlp400-belgian-wit-ale": {
        "attenuation_pct": 74.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Belgian Wit Ale strain. Produces a spicy, phenolic, and slightly tart witbier profile.",
    },
    "white-labs-wlp500-monastery-ale": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Monastery Ale strain. Produces a rich, fruity, and phenolic Belgian ale profile.",
    },
    "white-labs-wlp530-abbey-ale": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Abbey Ale strain. Produces a rich, fruity, and phenolic Belgian abbey ale profile.",
    },
    "white-labs-wlp550-belgian-ale": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian Ale strain. Produces a spicy, phenolic, and slightly fruity Belgian ale profile.",
    },
    "white-labs-wlp565-belgian-saison-i": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian Saison I strain. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "white-labs-wlp566-belgian-saison-ii": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian Saison II strain. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "white-labs-wlp570-belgian-golden-ale": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian Golden Ale strain. Produces a rich, fruity, and phenolic Belgian strong ale profile.",
    },
    "white-labs-wlp800-pilsner-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Pilsner Lager strain. Clean, crisp, and slightly sulfurous. Ideal for Bohemian pilsners.",
    },
    "white-labs-wlp802-czech-budejovice-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Czech Budejovice Lager strain. Clean, crisp, and slightly malty. Ideal for Czech pilsners.",
    },
    "white-labs-wlp810-san-francisco-lager": {
        "attenuation_pct": 74.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "San Francisco Lager strain. Ferments cleanly at ale temperatures. Ideal for California common.",
    },
    "white-labs-wlp820-oktoberfest-marzen-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Oktoberfest/Marzen Lager strain. Clean, malty, and slightly sulfurous. Ideal for marzens.",
    },
    "white-labs-wlp830-german-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "German Lager strain. Clean, crisp, and slightly sulfurous. Ideal for German lagers.",
    },
    "white-labs-wlp833-german-bock-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "German Bock Lager strain. Clean, malty, and slightly sulfurous. Ideal for bocks and doppelbocks.",
    },
    "white-labs-wlp838-southern-german-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Southern German Lager strain. Clean, malty, and slightly sulfurous. Ideal for Bavarian lagers.",
    },
    "white-labs-wlp840-american-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "American Lager strain. Clean, crisp, and neutral. Ideal for light lagers.",
    },
    "white-labs-wlp940-mexican-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Mexican Lager strain. Clean, crisp, and slightly malty. Ideal for Mexican lagers.",
    },
    "white-labs-wlp644-saccharomyces-bruxellensis-trois": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Saccharomyces Bruxellensis Trois. Produces a fruity, tropical, and slightly funky profile.",
    },
    "white-labs-wlp650-brettanomyces-bruxellensis": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Brettanomyces Bruxellensis. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },
    "white-labs-wlp653-brettanomyces-lambicus": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Brettanomyces Lambicus. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },
    "white-labs-wlp677-lactobacillus-delbrueckii": {
        "attenuation_pct": 50.0, "flocculation": "Low", "alcohol_tolerance_abv": 5.0,
        "notes": "Lactobacillus delbrueckii. Produces clean lactic acid for Berliner weisse and kettle sours.",
    },

    # --- Imperial Yeast ---
    "imperial-a01-house": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "House strain. Clean, crisp, and neutral. The workhorse American ale yeast.",
    },
    "imperial-a07-flagship": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Flagship strain. Clean, crisp, and neutral. Ideal for American ales.",
    },
    "imperial-a09-pub": {
        "attenuation_pct": 73.0, "flocculation": "High", "alcohol_tolerance_abv": 10.0,
        "notes": "Pub strain. Malty, slightly fruity, and highly flocculent. Ideal for English ales.",
    },
    "imperial-a10-darkness": {
        "attenuation_pct": 73.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Darkness strain. Rich, malty, and slightly fruity. Ideal for stouts and porters.",
    },
    "imperial-a18-joystick": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Joystick strain. Clean, crisp, and slightly fruity. Ideal for American ales.",
    },
    "imperial-a20-citrus": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Citrus strain. Produces a distinctive citrus-forward American ale profile.",
    },
    "imperial-a24-dry-hop": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Dry Hop strain. Clean, crisp, and neutral. Ideal for hop-forward American ales.",
    },
    "imperial-a38-juice": {
        "attenuation_pct": 75.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Juice strain. Produces a hazy, juicy, and fruity New England IPA profile.",
    },
    "imperial-a43-loki": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Loki strain. Clean, crisp, and slightly fruity. Ideal for American ales.",
    },
    "imperial-b44-whiteout": {
        "attenuation_pct": 73.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Whiteout strain. Produces a clean, slightly tart American wheat profile.",
    },
    "imperial-b45-gnome": {
        "attenuation_pct": 73.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Gnome strain. Produces classic banana and clove phenolics. Ideal for Bavarian hefeweizens.",
    },
    "imperial-b48-triple-double": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Triple Double strain. Produces a rich, fruity, and phenolic Belgian ale profile.",
    },
    "imperial-b56-rustic": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Rustic strain. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "imperial-b64-napoleon": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Napoleon strain. Produces a rich, fruity, and phenolic Belgian ale profile.",
    },
    "imperial-l05-cablecar": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Cablecar strain. Clean, crisp, and slightly malty. Ideal for California common.",
    },
    "imperial-l13-global": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Global strain. Clean, crisp, and neutral. Ideal for international lagers.",
    },
    "imperial-l17-harvest": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Harvest strain. Clean, malty, and slightly sulfurous. Ideal for German lagers.",
    },
    "imperial-l28-urkel": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Urkel strain. Clean, crisp, and slightly malty. Ideal for Czech pilsners.",
    },
    "imperial-l34-san-fran": {
        "attenuation_pct": 74.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "San Fran strain. Ferments cleanly at ale temperatures. Ideal for California common.",
    },
    "imperial-w15-suburban-brett": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Suburban Brett. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },

    # --- Lallemand ---
    "lallemand-nottingham-ale": {
        "attenuation_pct": 77.0, "flocculation": "High", "alcohol_tolerance_abv": 14.0,
        "notes": "Nottingham Ale strain. Highly attenuative, clean, and flocculent. The workhorse dry English ale yeast.",
    },
    "lallemand-windsor-ale": {
        "attenuation_pct": 70.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Windsor Ale strain. Malty, slightly fruity, and well-suited to English ales.",
    },
    "lallemand-london-esb-ale": {
        "attenuation_pct": 72.0, "flocculation": "High", "alcohol_tolerance_abv": 10.0,
        "notes": "London ESB Ale strain. Malty, slightly fruity, and highly flocculent.",
    },
    "lallemand-verdant-ipa": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Verdant IPA strain. Produces a hazy, juicy, and fruity New England IPA profile.",
    },
    "lallemand-voss-kveik": {
        "attenuation_pct": 78.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "Voss Kveik strain. Ferments cleanly at high temperatures with a distinctive citrus profile.",
    },
    "lallemand-lutra-kveik": {
        "attenuation_pct": 78.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "Lutra Kveik strain. Ferments cleanly at high temperatures with a neutral profile.",
    },
    "lallemand-munich-classic": {
        "attenuation_pct": 73.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Munich Classic strain. Produces classic banana and clove phenolics. Ideal for Bavarian hefeweizens.",
    },
    "lallemand-munich-wheat": {
        "attenuation_pct": 73.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Munich Wheat strain. Produces classic banana and clove phenolics. Ideal for Bavarian hefeweizens.",
    },
    "lallemand-diamond-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Diamond Lager strain. Clean, crisp, and slightly sulfurous. Ideal for German lagers.",
    },
    "lallemand-novalager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "NovaLager strain. Clean, crisp, and slightly malty. Ideal for modern lagers.",
    },
    "lallemand-belle-saison": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Belle Saison strain. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "lallemand-abbaye": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Abbaye strain. Produces a rich, fruity, and phenolic Belgian abbey ale profile.",
    },
    "lallemand-cbc-1-cask-bottle-conditioned": {
        "attenuation_pct": 80.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "CBC-1 Cask & Bottle Conditioned strain. Highly flocculent and alcohol-tolerant. Ideal for bottle conditioning.",
    },
    "lallemand-philly-sour": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "Philly Sour strain. Produces clean lactic acid for kettle sours and sour IPAs.",
    },
    "lallemand-wildbrew-sour-pitch": {
        "attenuation_pct": 50.0, "flocculation": "Low", "alcohol_tolerance_abv": 5.0,
        "notes": "WildBrew Sour Pitch. Produces clean lactic acid for kettle sours.",
    },

    # --- Fermentis ---
    "fermentis-safale-us-05": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "SafAle US-05. Clean, crisp, and neutral. The workhorse American ale yeast.",
    },
    "fermentis-safale-s-04": {
        "attenuation_pct": 75.0, "flocculation": "High", "alcohol_tolerance_abv": 10.0,
        "notes": "SafAle S-04. Malty, slightly fruity, and highly flocculent. Ideal for English ales.",
    },
    "fermentis-safale-k-97": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "SafAle K-97. Clean, crisp, and slightly fruity. Ideal for Kolsch and altbier.",
    },
    "fermentis-safale-be-134": {
        "attenuation_pct": 78.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "SafAle BE-134. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "fermentis-safale-wb-06": {
        "attenuation_pct": 73.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "SafAle WB-06. Produces classic banana and clove phenolics. Ideal for Bavarian hefeweizens.",
    },
    "fermentis-safale-ha-18": {
        "attenuation_pct": 80.0, "flocculation": "Medium", "alcohol_tolerance_abv": 18.0,
        "notes": "SafAle HA-18. Highly alcohol-tolerant. Ideal for high-gravity ales.",
    },
    "fermentis-saflager-w-34-70": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "SafLager W-34/70. Clean, crisp, and slightly sulfurous. The workhorse German lager yeast.",
    },
    "fermentis-saflager-s-23": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "SafLager S-23. Clean, crisp, and slightly malty. Ideal for European lagers.",
    },
    "fermentis-saflager-s-189": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "SafLager S-189. Clean, crisp, and slightly malty. Ideal for Swiss lagers.",
    },
    "fermentis-saflager-e-30": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "SafLager E-30. Clean, crisp, and slightly malty. Ideal for European lagers.",
    },
    "fermentis-safbrew-t-58": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "SafBrew T-58. Produces a spicy, phenolic, and slightly fruity Belgian ale profile.",
    },
    "fermentis-safbrew-be-256": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "SafBrew BE-256. Produces a rich, fruity, and phenolic Belgian abbey ale profile.",
    },
    "fermentis-safbrew-wb-06": {
        "attenuation_pct": 73.0, "flocculation": "Low", "alcohol_tolerance_abv": 10.0,
        "notes": "SafBrew WB-06. Produces classic banana and clove phenolics. Ideal for Bavarian hefeweizens.",
    },
    "fermentis-safcider-ab-1": {
        "attenuation_pct": 80.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "SafCider AB-1. Produces a clean, crisp, and slightly fruity cider profile.",
    },
    "fermentis-safcider-as-2": {
        "attenuation_pct": 80.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "SafCider AS-2. Produces a clean, crisp, and slightly fruity cider profile.",
    },

    # --- Omega Yeast ---
    "omega-oyl-004-west-coast-ale-i": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "West Coast Ale I. Clean, crisp, and neutral. Ideal for West Coast IPAs.",
    },
    "omega-oyl-005-irish-ale": {
        "attenuation_pct": 73.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Irish Ale. Smooth, slightly fruity, and well-suited to stouts and red ales.",
    },
    "omega-oyl-011-british-ale-v": {
        "attenuation_pct": 74.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "British Ale V. Malty, slightly fruity, and well-balanced.",
    },
    "omega-oyl-014-british-ale-viii": {
        "attenuation_pct": 74.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "British Ale VIII. Malty, slightly fruity, and well-balanced.",
    },
    "omega-oyl-021-conan": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Conan. Produces a hazy, juicy, and fruity New England IPA profile.",
    },
    "omega-oyl-024-belgian-ale-a": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian Ale A. Produces a spicy, phenolic, and slightly fruity Belgian ale profile.",
    },
    "omega-oyl-026-belgian-ale-w": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian Ale W. Produces a spicy, phenolic, and slightly fruity Belgian ale profile.",
    },
    "omega-oyl-028-belgian-ale-r": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian Ale R. Produces a spicy, phenolic, and slightly fruity Belgian ale profile.",
    },
    "omega-oyl-033-belgian-saison-i": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian Saison I. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "omega-oyl-042-belgian-saison-ii": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian Saison II. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "omega-oyl-052-dipa-ale": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "DIPA Ale. Highly attenuative and alcohol-tolerant. Ideal for double IPAs.",
    },
    "omega-oyl-057-hothead-ale": {
        "attenuation_pct": 78.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "HotHead Ale. Ferments cleanly at high temperatures with a distinctive citrus profile.",
    },
    "omega-oyl-061-voss-kveik": {
        "attenuation_pct": 78.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "Voss Kveik. Ferments cleanly at high temperatures with a distinctive citrus profile.",
    },
    "omega-oyl-071-lutra-kveik": {
        "attenuation_pct": 78.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "Lutra Kveik. Ferments cleanly at high temperatures with a neutral profile.",
    },
    "omega-oyl-091-hornindal-kveik": {
        "attenuation_pct": 78.0, "flocculation": "High", "alcohol_tolerance_abv": 12.0,
        "notes": "Hornindal Kveik. Ferments cleanly at high temperatures with a distinctive tropical profile.",
    },
    "omega-oyl-101-pilsner-i": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Pilsner I. Clean, crisp, and slightly sulfurous. Ideal for Bohemian pilsners.",
    },
    "omega-oyl-107-oktoberfest": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Oktoberfest. Clean, malty, and slightly sulfurous. Ideal for marzens.",
    },
    "omega-oyl-111-german-bock": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "German Bock. Clean, malty, and slightly sulfurous. Ideal for bocks and doppelbocks.",
    },
    "omega-oyl-114-bayern-lager": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Bayern Lager. Clean, malty, and slightly sulfurous. Ideal for Bavarian lagers.",
    },
    "omega-oyl-200-tropical-ipa": {
        "attenuation_pct": 75.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Tropical IPA. Produces a hazy, juicy, and tropical New England IPA profile.",
    },
    "omega-oyl-210-saisonstein-s-monster": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Saisonstein's Monster. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "omega-oyl-218-bring-on-da-funk": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Bring On Da Funk. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },
    "omega-oyl-402-brettanomyces-bruxellensis": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Brettanomyces Bruxellensis. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },
    "omega-oyl-403-brettanomyces-claussenii": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Brettanomyces Claussenii. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },
    "omega-oyl-605-lactobacillus-blend": {
        "attenuation_pct": 50.0, "flocculation": "Low", "alcohol_tolerance_abv": 5.0,
        "notes": "Lactobacillus Blend. Produces clean lactic acid for Berliner weisse and kettle sours.",
    },

    # --- Bootleg Biology ---
    "bootleg-biology-bbx001-the-mad-fermentationist-saison-blend": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "The Mad Fermentationist Saison Blend. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "bootleg-biology-bbx002-saison-parfait": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Saison Parfait. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "bootleg-biology-bbx003-sour-solera-blend": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Sour Solera Blend. Produces a complex, funky, and sour profile.",
    },
    "bootleg-biology-bbx004-funk-weapon-1": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Funk Weapon #1. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },
    "bootleg-biology-bbx005-funk-weapon-2": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Funk Weapon #2. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },
    "bootleg-biology-bbx006-funk-weapon-3": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Funk Weapon #3. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },
    "bootleg-biology-bbx007-local-yeast-project": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Local Yeast Project. Produces a complex, funky, and sour profile.",
    },

    # --- East Coast Yeast ---
    "east-coast-yeast-ecy01-bugfarm": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "BugFarm. Produces a complex, funky, and sour profile.",
    },
    "east-coast-yeast-ecy02-flemish-ale": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Flemish Ale. Produces a complex, funky, and sour profile.",
    },
    "east-coast-yeast-ecy03-farmhouse-brett": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Farmhouse Brett. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },
    "east-coast-yeast-ecy04-brett-anomalus": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Brett Anomalus. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },
    "east-coast-yeast-ecy05-brett-blend-1": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Brett Blend #1. Produces classic horsey, smoky, and cherry-pie phenolics.",
    },
    "east-coast-yeast-ecy06-berliner-blend": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Berliner Blend. Produces clean lactic acid for Berliner weisse and kettle sours.",
    },
    "east-coast-yeast-ecy07-scottish-heavy": {
        "attenuation_pct": 73.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Scottish Heavy. Clean, malty, and slightly smoky. Ideal for Scottish ales and wee heavies.",
    },
    "east-coast-yeast-ecy08-saison-brasserie": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Saison Brasserie. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "east-coast-yeast-ecy09-belgian-abbaye": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Belgian Abbaye. Produces a rich, fruity, and phenolic Belgian abbey ale profile.",
    },
    "east-coast-yeast-ecy10-old-newark-ale": {
        "attenuation_pct": 74.0, "flocculation": "Medium", "alcohol_tolerance_abv": 10.0,
        "notes": "Old Newark Ale. Malty, slightly fruity, and well-balanced.",
    },
    "east-coast-yeast-ecy11-farmhouse-saison": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Farmhouse Saison. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "east-coast-yeast-ecy12-big-belgian-ale": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Big Belgian Ale. Produces a rich, fruity, and phenolic Belgian ale profile.",
    },
    "east-coast-yeast-ecy13-trappist-ale": {
        "attenuation_pct": 78.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Trappist Ale. Produces a rich, fruity, and phenolic Belgian ale profile.",
    },
    "east-coast-yeast-ecy14-scottish-ale": {
        "attenuation_pct": 73.0, "flocculation": "Medium", "alcohol_tolerance_abv": 12.0,
        "notes": "Scottish Ale. Clean, malty, and slightly smoky. Ideal for Scottish ales and wee heavies.",
    },
    "east-coast-yeast-ecy15-saison-brasserie-blend": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Saison Brasserie Blend. Highly attenuative, producing a dry, spicy saison profile.",
    },
    "east-coast-yeast-ecy16-berliner-weisse-blend": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Berliner Weisse Blend. Produces clean lactic acid for Berliner weisse and kettle sours.",
    },
    "east-coast-yeast-ecy17-bugcounty": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "BugCounty. Produces a complex, funky, and sour profile.",
    },
    "east-coast-yeast-ecy18-berliner-blend": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Berliner Blend. Produces clean lactic acid for Berliner weisse and kettle sours.",
    },
    "east-coast-yeast-ecy19-berliner-blend": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "Berliner Blend. Produces clean lactic acid for Berliner weisse and kettle sours.",
    },
    "east-coast-yeast-ecy20-bugfarm": {
        "attenuation_pct": 80.0, "flocculation": "Low", "alcohol_tolerance_abv": 12.0,
        "notes": "BugFarm. Produces a complex, funky, and sour profile.",
    },
}


def determine_yeast_parameters(name: str, manufacturer: str) -> dict:
    """Computes standard brewing parameters for a yeast strain."""
    slug = slugify(name)
    spec = YEAST_SPECS.get(slug, {})

    # 1. Apparent attenuation (stored as a FRACTION in [0, 1], matching the
    #    percentage domain's base unit in the frontend units store).
    if "attenuation_pct" in spec:
        attenuation_pct = float(spec["attenuation_pct"]) / 100.0
    else:
        # Manufacturer-based fallback
        if manufacturer in ("Wyeast", "White Labs", "Imperial Yeast", "Omega Yeast"):
            attenuation_pct = 0.75
        elif manufacturer in ("Lallemand", "Fermentis"):
            attenuation_pct = 0.76
        else:
            attenuation_pct = 0.75

    # 2. Flocculation character
    if "flocculation" in spec:
        flocculation = spec["flocculation"]
    else:
        flocculation = "Medium"

    # 3. Alcohol tolerance (ABV %)
    if "alcohol_tolerance_abv" in spec:
        alcohol_tolerance_abv = float(spec["alcohol_tolerance_abv"])
    else:
        alcohol_tolerance_abv = 10.0

    # 4. Attenuation bounds (+/- 7% deviation from stated attenuation).
    #    Rounded to 4 decimals to preserve 0.1% resolution in fraction form.
    low_attenuation = round(attenuation_pct * 0.93, 4)
    high_attenuation = round(attenuation_pct * 1.07, 4)

    # 5. Sensory / Strain Notes
    if "notes" in spec:
        notes = spec["notes"]
    else:
        notes = f"{name} ({manufacturer}). Traditional brewing yeast strain."

    return {
        "id": slug,
        "name": name,
        "manufacturer": manufacturer,
        "attenuation_pct": attenuation_pct,
        "low_attenuation": low_attenuation,
        "high_attenuation": high_attenuation,
        "flocculation": flocculation,
        "alcohol_tolerance_abv": alcohol_tolerance_abv,
        "notes": notes,
    }


def build_catalog() -> list[YeastPrimitive]:
    """Generates and validates all yeast primitives."""
    yeasts: list[YeastPrimitive] = []
    seen_ids = set()

    for manufacturer, items in RAW_YEASTS.items():
        for name in items:
            slug = slugify(name)
            if slug in seen_ids:
                continue
            seen_ids.add(slug)

            data = determine_yeast_parameters(name, manufacturer)
            yeast = YeastPrimitive(**data)
            yeasts.append(yeast)

    # Sort deterministically by name
    yeasts.sort(key=lambda y: y.name)

    return yeasts


def main():
    print("Building brewing yeast seed catalog...")
    yeasts = build_catalog()

    print(f"Generated {len(yeasts)} yeast strains.")

    # Target output path
    seeds_dir = BACKEND_DIR / "app" / "seeds"
    seeds_dir.mkdir(parents=True, exist_ok=True)

    yeasts_file = seeds_dir / "yeasts.json"

    with open(yeasts_file, "w", encoding="utf-8") as f:
        json.dump([y.model_dump() for y in yeasts], f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Successfully wrote {len(yeasts)} yeasts to {yeasts_file}")


if __name__ == "__main__":
    main()
