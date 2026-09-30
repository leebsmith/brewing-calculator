#!/usr/bin/env python3
"""
Fermentables Ingestion & Seed Builder.

Scrapes and extracts the complete catalog of brewing fermentables from
Beer Analytics (https://www.beer-analytics.com/fermentables/), excluding
fruits, spices, and herbs.

Synthesizes brewing parameters (potential SG, dry yield, color SRM,
moisture, DI water pH, buffering capacity, and sensory notes) and
outputs validated Pydantic models to:
  - backend/app/seeds/malts.json
  - backend/app/seeds/sugars.json
"""

import json
import re
import sys
import urllib.request
from pathlib import Path

# Add backend directory to path so app.schemas can be imported
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.schemas.primitives import (
    MaltCategory,
    MaltPrimitive,
    SugarPrimitive,
)

# Canonical list of raw fermentables from beer-analytics.com by category
# (Fruits and Spices & Herbs are excluded per specification).
RAW_FERMENTABLES = {
    "Base Malt": [
        "Basic Barley Malt",
        "Dark Wheat Malt",
        "Extra Dark Wheat Malt",
        "Extra Pale Ale Malt",
        "Golden Promise Malt",
        "Green Malt",
        "Maris Otter Malt",
        "Mild Ale Malt",
        "Munich Dark Malt",
        "Munich Light Malt",
        "Munich Malt",
        "Pale Ale Malt",
        "Pale Wheat Malt",
        "Peated Malt",
        "Pilsner Light Malt",
        "Pilsner Malt",
        "Smoke Malt",
        "Stout Malt",
        "Vienna Malt",
        "Wheat Malt",
        "Whisky Malt",
    ],
    "Caramel/Crystal Malt": [
        "CaraAmber",
        "CaraAroma",
        "CaraBelge",
        "CaraBohemian",
        "CaraGold",
        "CaraHell",
        "Caramel/Crystal Malt – 10L",
        "Caramel/Crystal Malt – 15L",
        "Caramel/Crystal Malt – 20L",
        "Caramel/Crystal Malt – 30L",
        "Caramel/Crystal Malt – 40L",
        "Caramel/Crystal Malt – 45L",
        "Caramel/Crystal Malt – 50L",
        "Caramel/Crystal Malt – 55L",
        "Caramel/Crystal Malt – 60L",
        "Caramel/Crystal Malt – 70L",
        "Caramel/Crystal Malt – 75L",
        "Caramel/Crystal Malt – 80L",
        "Caramel/Crystal Malt – 90L",
        "Caramel/Crystal Malt – 120L",
        "Caramel/Crystal Malt – 140L",
        "Caramel/Crystal Malt – 150L",
        "CaraMunich I",
        "CaraMunich II",
        "CaraMunich III",
        "CaraPils / CaraFoam",
        "CaraRed",
        "CaraRye",
        "CaraVienne",
        "CaraWheat",
        "Golden Naked Oats",
        "Salty Caramel Malt",
    ],
    "Toasted": [
        "Abbey Malt",
        "Amber Malt",
        "Aromatic Malt",
        "Biscuit Malt",
        "Cookie Malt",
        "Honey Malt",
        "Melanoidin Malt",
        "Toffee Malt",
    ],
    "Roasted": [
        "Black Malt",
        "Brown Malt",
        "CaraFa I",
        "CaraFa II",
        "CaraFa III",
        "CaraFa Special I",
        "CaraFa Special II",
        "CaraFa Special III",
        "Chocolate Malt",
        "Coffee Malt",
        "Dark Chocolate Malt",
        "Debittered Black Malt",
        "Light Coffee Malt",
        "Pale Chocolate",
        "Roasted Barley Malt",
        "Roasted Millet Malt",
        "Roasted Rye Malt",
        "Roasted Spelt Malt",
        "Roasted Wheat Malt",
    ],
    "Other Malt": [
        "Buckwheat Malt",
        "Emmer Malt",
        "Millet Malt",
        "Oat Malt",
        "Rye Malt",
        "Small Spelt Malt",
        "Spelt Malt",
        "Triticale Malt",
    ],
    "Adjunct Malt": [
        "Acidulated Malt",
        "Chit Malt",
        "Diastatic Malt",
        "Diastatic Wheat Malt",
    ],
    "Unmalted Adjunct": [
        "Flaked Barley",
        "Flaked Corn",
        "Flaked Oats",
        "Flaked Quinoa",
        "Flaked Rice",
        "Flaked Rye",
        "Flaked Spelt",
        "Flaked Wheat",
        "Maize",
        "Rice Hulls",
        "Torrified Barley Malt",
        "Torrified Oats",
        "Torrified Wheat Malt",
        "Unmalted Barley",
        "Unmalted Buckwheat",
        "Unmalted Emmer",
        "Unmalted Millet",
        "Unmalted Oat",
        "Unmalted Rye",
        "Unmalted Spelt",
        "Unmalted Triticale",
        "Unmalted Wheat",
    ],
    "Sugar": [
        "Agave Nectar",
        "Brown Sugar",
        "Candi Sugar",
        "Candi Syrup",
        "Cane Sugar",
        "Caramel",
        "Corn Sugar",
        "Corn Syrup",
        "Honey",
        "Lactose (Milk Sugar)",
        "Maltodextrin",
        "Maple Syrup",
        "Molasses",
        "Rice Syrup",
        "Sorghum Syrup",
        "Sugar",
        "Turbinado",
    ],
    "Malt Extract": [
        "Malt Extract",
    ],
}


def slugify(text: str) -> str:
    """Creates a URL-safe, lowercase kebab-case slug from display name."""
    s = text.replace("–", "-").replace("—", "-").replace("/", " ")
    s = re.sub(r"[^\w\s-]", "", s).strip().lower()
    return re.sub(r"[-\s]+", "-", s)


# Detailed technical metadata lookup keyed by normalized item slug or name
FERMENTABLE_SPECS = {
    # Base Malts
    "basic-barley-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 2.0,
        "notes": "Standard standard 2-row / 6-row brewer's malt providing high diastatic power and clean malty backbone.",
    },
    "pilsner-malt": {
        "potential_sg": 1.037, "yield": 0.81, "srm": 1.8,
        "notes": "Lightest colored European base malt. Delicate sweet, grainy, bready flavor essential for continental lagers.",
    },
    "pilsner-light-malt": {
        "potential_sg": 1.037, "yield": 0.81, "srm": 1.4,
        "notes": "Extra pale pilsner malt kilned gently to preserve maximum enzyme activity and very low color.",
    },
    "pale-ale-malt": {
        "potential_sg": 1.038, "yield": 0.81, "srm": 3.5,
        "notes": "Fully modified British or American pale malt with rich biscuity, malty complexity for ales.",
    },
    "extra-pale-ale-malt": {
        "potential_sg": 1.038, "yield": 0.81, "srm": 2.5,
        "notes": "Lightened pale ale malt tailored for modern hazy IPAs and delicate blonde ales.",
    },
    "maris-otter-malt": {
        "potential_sg": 1.038, "yield": 0.81, "srm": 3.0,
        "notes": "Celebrated traditional British heritage barley variety renowned for deep rich nutty and cracker complexity.",
    },
    "golden-promise-malt": {
        "potential_sg": 1.038, "yield": 0.81, "srm": 2.8,
        "notes": "Scottish spring barley variety with sweet, clean, full-bodied malt sweetness. Common in Scotch ales and IPAs.",
    },
    "mild-ale-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 4.5,
        "notes": "High kilned traditional English base malt offering warm toasty bread crust tones for session ales.",
    },
    "vienna-malt": {
        "potential_sg": 1.036, "yield": 0.79, "srm": 3.5,
        "notes": "Lightly toasted continental base malt providing golden amber color and rich toasty malt aroma without sweetness.",
    },
    "munich-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 9.0,
        "notes": "Rich, melanoidin-dense German malt kilned to develop distinct bready, bread-crust, and biscuit flavors.",
    },
    "munich-light-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 6.0,
        "notes": "Munich Type I. Imparts subtle malty sweetness and golden-amber highlights without overwhelming roastiness.",
    },
    "munich-dark-malt": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 15.0,
        "notes": "Munich Type II. Highly kilned for deep amber to coppery color and pronounced toasted bread crust intensity.",
    },
    "wheat-malt": {
        "potential_sg": 1.038, "yield": 0.82, "srm": 2.0,
        "notes": "Huskless malted wheat rich in protein. Boosts head retention, foam stability, and body in weissbiers and wheat ales.",
    },
    "pale-wheat-malt": {
        "potential_sg": 1.039, "yield": 0.83, "srm": 1.8,
        "notes": "Malted white wheat delivering clean crisp wheat character and high extract potential with low color.",
    },
    "dark-wheat-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 7.5,
        "notes": "Kilned malted wheat for dunkelweizens and dark ales, contributing bready bread-crust tones and creamy body.",
    },
    "extra-dark-wheat-malt": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 18.0,
        "notes": "Intensely kilned dark wheat malt imparting deep brown highlights and complex toasty aromas.",
    },
    "smoke-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 2.5,
        "notes": "Barley malt smoked over seasoned beechwood logs. Signature ingredient for Bamberg Rauchbier.",
    },
    "peated-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 2.5,
        "notes": "Malt smoked over burning peat bog moss. Delivers earthy, phenolic, medicinal smoke character for Scotch ales.",
    },
    "whisky-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 2.2,
        "notes": "Distiller's malt optimized for high fermentability, soluble extract, and enzyme potential.",
    },
    "stout-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 2.5,
        "notes": "Irish pale malt kilned specifically to pair with unmalted roasted barley in dry Irish stouts.",
    },
    "green-malt": {
        "potential_sg": 1.030, "yield": 0.65, "srm": 1.5,
        "notes": "Germinated unkilned malt with high moisture and fresh grassy enzymatic characteristics.",
    },

    # Toasted Malts
    "biscuit-malt": {
        "potential_sg": 1.035, "yield": 0.76, "srm": 25.0,
        "notes": "Warm-air roasted Belgian malt delivering dry, crisp, saltine cracker and warm toasted bread flavors.",
    },
    "aromatic-malt": {
        "potential_sg": 1.035, "yield": 0.76, "srm": 20.0,
        "notes": "High-kilned European malt providing intense malty aroma and clean syrupy malt flavor without harsh astringency.",
    },
    "melanoidin-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 28.0,
        "notes": "Promotes deep red color, velvety mouthfeel, and rich decoction-like maltiness in lagers and bocks.",
    },
    "amber-malt": {
        "potential_sg": 1.035, "yield": 0.76, "srm": 27.0,
        "notes": "Traditional dry-roasted British specialty malt offering distinct biscuit, toasted wood, and coffee notes.",
    },
    "honey-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 25.0,
        "notes": "Brumalt style malt imparting intense sweet honey, graham cracker, and toasted grain character in small doses.",
    },
    "abbey-malt": {
        "potential_sg": 1.035, "yield": 0.76, "srm": 17.0,
        "notes": "Belgian toasted malt formulated for Trappist and Abbey ales, providing bread crust, nuttiness, and golden amber hue.",
    },
    "cookie-malt": {
        "potential_sg": 1.035, "yield": 0.76, "srm": 20.0,
        "notes": "Lightly toasted malt creating sweet pastry, butter cookie, and warm bakery aroma.",
    },
    "toffee-malt": {
        "potential_sg": 1.034, "yield": 0.74, "srm": 12.0,
        "notes": "Specialty malt prepared to enhance body and introduce subtle caramelized toffee notes.",
    },

    # Caramel / Crystal Malts
    "carapils-carafoam": {
        "potential_sg": 1.033, "yield": 0.72, "srm": 1.8,
        "notes": "Dextrin malt processed to maximize foam stability, head retention, and creaminess without adding color or flavor.",
    },
    "carahell": {
        "potential_sg": 1.035, "yield": 0.75, "srm": 10.0,
        "notes": "Light German caramel malt enhancing body, softness, and mild caramel sweetness in pale lagers.",
    },
    "caragold": {
        "potential_sg": 1.035, "yield": 0.75, "srm": 6.0,
        "notes": "Low-color caramel malt imparting sweet toffee notes, improved body, and brilliant golden color.",
    },
    "carared": {
        "potential_sg": 1.035, "yield": 0.75, "srm": 20.0,
        "notes": "Medium crystal malt engineered to enhance full body and deep red/copper hue in red ales and ambers.",
    },
    "caraamber": {
        "potential_sg": 1.035, "yield": 0.75, "srm": 30.0,
        "notes": "German drum-roasted caramel malt delivering toffee, bread crust, and warm caramel complexity.",
    },
    "caravienne": {
        "potential_sg": 1.035, "yield": 0.75, "srm": 22.0,
        "notes": "Belgian crystal malt yielding golden hues and delicate toffee and biscuit notes in Belgian ales.",
    },
    "carabelge": {
        "potential_sg": 1.035, "yield": 0.75, "srm": 15.0,
        "notes": "Enhances golden to amber color while contributing notes of mild honey, caramel, and biscuit.",
    },
    "carabohemian": {
        "potential_sg": 1.034, "yield": 0.74, "srm": 75.0,
        "notes": "Bohemian drum-roasted caramel malt offering rich bread crust and dark toffee flavors for Czech dark lagers.",
    },
    "caramunich-i": {
        "potential_sg": 1.035, "yield": 0.75, "srm": 38.0,
        "notes": "Type I CaraMunich. Introduces deep amber color, rich maltiness, and caramel flavors in dark lagers.",
    },
    "caramunich-ii": {
        "potential_sg": 1.035, "yield": 0.75, "srm": 45.0,
        "notes": "Type II CaraMunich. Adds pronounced dark caramel, cookie, and toasted bread notes in bocks and märzens.",
    },
    "caramunich-iii": {
        "potential_sg": 1.034, "yield": 0.74, "srm": 55.0,
        "notes": "Type III CaraMunich. Full-flavored dark caramel malt delivering raisin, plum, and intense malt richness.",
    },
    "caraaroma": {
        "potential_sg": 1.034, "yield": 0.74, "srm": 150.0,
        "notes": "Dark German caramel malt imparting deep reddish-brown color, dark fruit, and roasted caramel aromas.",
    },
    "cararye": {
        "potential_sg": 1.033, "yield": 0.72, "srm": 65.0,
        "notes": "Caramelized malted rye. Adds deep reddish color, velvety mouthfeel, and spicy rye bread complexity.",
    },
    "carawheat": {
        "potential_sg": 1.035, "yield": 0.75, "srm": 45.0,
        "notes": "Caramelized wheat malt. Infuses dark wheat beers with rich body, dark color, and subtle roast-caramel aroma.",
    },
    "golden-naked-oats": {
        "potential_sg": 1.033, "yield": 0.72, "srm": 10.0,
        "notes": "Crystal malted huskless oats. Imparts creamy silkiness, nutty sweetness, and toffee highlights.",
    },
    "salty-caramel-malt": {
        "potential_sg": 1.033, "yield": 0.72, "srm": 35.0,
        "notes": "Specialty toasted/caramel malt offering savory-sweet caramelized toffee tones.",
    },

    # Roasted Malts
    "chocolate-malt": {
        "potential_sg": 1.028, "yield": 0.60, "srm": 350.0,
        "notes": "Essential dark ale grain. Imparts rich cocoa, dark baker's chocolate, and nutty roasted flavors without harsh ashiness.",
    },
    "pale-chocolate": {
        "potential_sg": 1.030, "yield": 0.65, "srm": 220.0,
        "notes": "Lightly roasted chocolate malt with mellow milk chocolate, mocha, and toasted hazelnut nuances.",
    },
    "dark-chocolate-malt": {
        "potential_sg": 1.027, "yield": 0.58, "srm": 420.0,
        "notes": "Deeply roasted malt delivering intense dark chocolate, espresso, and opaque black color.",
    },
    "black-malt": {
        "potential_sg": 1.025, "yield": 0.55, "srm": 500.0,
        "notes": "Black Patent malt. High-temperature roasted malt giving sharp, dry, acrid, burnt bread tones and deep black color.",
    },
    "debittered-black-malt": {
        "potential_sg": 1.025, "yield": 0.55, "srm": 500.0,
        "notes": "Husk-stripped black malt providing deep pitch-black color without bitter astringent bite.",
    },
    "roasted-barley-malt": {
        "potential_sg": 1.025, "yield": 0.55, "srm": 450.0,
        "notes": "Unmalted roasted whole barley. Signature component of dry Irish stout, lending distinctive coffee and bitter roasted flavor.",
    },
    "brown-malt": {
        "potential_sg": 1.032, "yield": 0.70, "srm": 65.0,
        "notes": "Historical English kiln-roasted malt. Delivers dry, biscuit, coffee-like, and charred wood complexity in porters.",
    },
    "carafa-i": {
        "potential_sg": 1.032, "yield": 0.70, "srm": 320.0,
        "notes": "German dark roasted specialty malt. Imparts dark color and fine roasted coffee flavors in Schwarzbier.",
    },
    "carafa-ii": {
        "potential_sg": 1.030, "yield": 0.65, "srm": 425.0,
        "notes": "Mid-tier Carafa malt delivering deep black-brown color and rich espresso aroma.",
    },
    "carafa-iii": {
        "potential_sg": 1.028, "yield": 0.60, "srm": 525.0,
        "notes": "Darkest Carafa malt for maximum color contribution and robust roast character.",
    },
    "carafa-special-i": {
        "potential_sg": 1.032, "yield": 0.70, "srm": 320.0,
        "notes": "Dehusked Carafa I. Provides clean dark color and smooth roasted finish without harsh bitterness.",
    },
    "carafa-special-ii": {
        "potential_sg": 1.030, "yield": 0.65, "srm": 425.0,
        "notes": "Dehusked Carafa II. Imparts deep color and mild dark-chocolate notes with reduced astringency.",
    },
    "carafa-special-iii": {
        "potential_sg": 1.028, "yield": 0.60, "srm": 525.0,
        "notes": "Dehusked Carafa III. Maximum color depth with ultra-smooth cocoa and mild roast profile.",
    },
    "coffee-malt": {
        "potential_sg": 1.030, "yield": 0.65, "srm": 150.0,
        "notes": "Gently roasted malt producing smooth fresh brewed coffee and roasted nut aromas.",
    },
    "light-coffee-malt": {
        "potential_sg": 1.032, "yield": 0.70, "srm": 100.0,
        "notes": "Lightly kilned coffee malt offering subtle roasted coffee notes without astringent bitterness.",
    },
    "roasted-wheat-malt": {
        "potential_sg": 1.028, "yield": 0.60, "srm": 400.0,
        "notes": "Roasted huskless wheat. Adds dark color, smooth creamy mouthfeel, and dark chocolate notes to stouts and porters.",
    },
    "roasted-rye-malt": {
        "potential_sg": 1.028, "yield": 0.60, "srm": 300.0,
        "notes": "Roasted malted rye providing spicy, earthy, dark-chocolate, and coffee nuances.",
    },
    "roasted-millet-malt": {
        "potential_sg": 1.026, "yield": 0.56, "srm": 350.0,
        "notes": "Gluten-free roasted alternative grain offering deep color and chocolate-coffee profile.",
    },
    "roasted-spelt-malt": {
        "potential_sg": 1.028, "yield": 0.60, "srm": 380.0,
        "notes": "Ancient grain roasted malt giving rustic nutty cocoa complexity.",
    },

    # Other Malts
    "rye-malt": {
        "potential_sg": 1.038, "yield": 0.81, "srm": 3.7,
        "notes": "Malted rye grain. Adds distinctive spicy, crisp, earthy rye flavor and velvety mouthfeel.",
    },
    "oat-malt": {
        "potential_sg": 1.033, "yield": 0.72, "srm": 2.5,
        "notes": "Malted husked oats providing silky texture, enhanced head retention, and delicate nutty flavor.",
    },
    "spelt-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 3.0,
        "notes": "Ancient wheat variety producing soft, nutty, rustic flavor and excellent foam stability.",
    },
    "small-spelt-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 2.8,
        "notes": "Einkorn malt. Delicate sweet ancient grain with high protein and silky body.",
    },
    "buckwheat-malt": {
        "potential_sg": 1.032, "yield": 0.70, "srm": 2.5,
        "notes": "Gluten-free malted pseudocereal delivering earthy, nutty, and savory grain characteristics.",
    },
    "millet-malt": {
        "potential_sg": 1.032, "yield": 0.70, "srm": 2.0,
        "notes": "Primary gluten-free brewing grain offering mild, crisp, clean cereal profile.",
    },
    "emmer-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 4.0,
        "notes": "Ancient farro grain malt providing deep golden color and rustic nutty breadiness.",
    },
    "triticale-malt": {
        "potential_sg": 1.038, "yield": 0.81, "srm": 3.5,
        "notes": "Wheat-rye hybrid combining the bready smoothness of wheat with the spicy bite of rye.",
    },

    # Adjunct Malts
    "acidulated-malt": {
        "potential_sg": 1.034, "yield": 0.74, "srm": 3.0, "category": MaltCategory.ACID,
        "di_ph": 3.80, "buffer_index": 35.0,
        "notes": "Contains naturally produced lactic acid (approx 1-2% by weight) to naturally lower mash pH without chemical acid additions.",
    },
    "chit-malt": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 1.8,
        "notes": "Very lightly germinated malt rich in high-molecular proteins. Enhances head retention and foam without adding haze.",
    },
    "diastatic-malt": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 2.0,
        "notes": "Super high-enzyme malt engineered to convert high fractions of unmalted adjuncts in the mash.",
    },
    "diastatic-wheat-malt": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 2.0,
        "notes": "Malted wheat optimized for exceptionally high alpha and beta amylase enzymatic potency.",
    },

    # Unmalted Adjuncts
    "flaked-oats": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 1.0,
        "notes": "Pre-gelatinized rolled oats. Imparts creamy mouthfeel, silky body, and haze stability in NEIPAs and oatmeal stouts.",
    },
    "flaked-barley": {
        "potential_sg": 1.032, "yield": 0.70, "srm": 1.5,
        "notes": "Unmalted rolled barley flakes providing protein and beta-glucans for dense, creamy head retention and grainy body.",
    },
    "flaked-wheat": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 1.6,
        "notes": "Essential for Belgian witbiers. Enhances mouthfeel, cloudiness, and clean cereal grain sweetness.",
    },
    "flaked-corn": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 0.8,
        "notes": "Lightens body and color while contributing subtle sweet corn flavor in American lagers, cream ales, and pre-prohibition styles.",
    },
    "maize": {
        "potential_sg": 1.037, "yield": 0.80, "srm": 1.0,
        "notes": "Unmalted corn providing clean neutral fermentables to lighten body and crisp up pale lagers.",
    },
    "flaked-rice": {
        "potential_sg": 1.038, "yield": 0.82, "srm": 0.5,
        "notes": "Lightens body, alcohol perception, and color to maximum dryness in Japanese dry lagers and American light lagers.",
    },
    "flaked-rye": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 2.0,
        "notes": "Gelatinized rye flakes contributing sharp spicy character and full, chewy viscosity to the wort.",
    },
    "flaked-spelt": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 2.0,
        "notes": "Rustic unmalted ancient grain flakes enhancing foam and gentle nutty complexity.",
    },
    "flaked-quinoa": {
        "potential_sg": 1.034, "yield": 0.74, "srm": 1.5,
        "notes": "Gluten-free pseudocereal flakes adding nutty flavor, light body, and amino acid nutrition.",
    },
    "rice-hulls": {
        "potential_sg": 1.000, "yield": 0.00, "srm": 0.0,
        "notes": "Inert filter aid with zero extract or flavor contribution. Prevents stuck sparges when mashing high wheat, rye, or oat ratios.",
    },
    "torrified-wheat-malt": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 1.5,
        "notes": "Heat-puffed unmalted wheat. Improves head retention and adds clean rustic wheat character without requiring a cereal cook.",
    },
    "torrified-barley-malt": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 1.5,
        "notes": "Popped whole barley grain providing foam stability and grainy character in traditional British bitters.",
    },
    "torrified-oats": {
        "potential_sg": 1.034, "yield": 0.74, "srm": 1.5,
        "notes": "Heat-puffed whole oats adding body and smooth mouthfeel.",
    },
    "unmalted-wheat": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 1.8,
        "notes": "Raw unmalted wheat grain. Key traditional ingredient in Belgian lambic and witbier for starch haze and crisp flavor.",
    },
    "unmalted-barley": {
        "potential_sg": 1.032, "yield": 0.70, "srm": 1.5,
        "notes": "Raw barley grain contributing grainy, cereal notes and heavy foam proteins.",
    },
    "unmalted-rye": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 2.5,
        "notes": "Raw whole rye kernel offering intense peppery rye spice.",
    },
    "unmalted-oat": {
        "potential_sg": 1.032, "yield": 0.70, "srm": 1.8,
        "notes": "Raw unmalted oats for rich silkiness and body.",
    },
    "unmalted-buckwheat": {
        "potential_sg": 1.032, "yield": 0.70, "srm": 2.0,
        "notes": "Raw buckwheat for rustic earthy gluten-free brewing.",
    },
    "unmalted-spelt": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 2.0,
        "notes": "Raw ancient spelt grain for soft cereal body.",
    },
    "unmalted-millet": {
        "potential_sg": 1.032, "yield": 0.70, "srm": 1.5,
        "notes": "Raw millet grains for gluten-free cereal mashes.",
    },
    "unmalted-emmer": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 3.0,
        "notes": "Raw ancient farro kernel for traditional rustic grain beers.",
    },
    "unmalted-triticale": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 2.5,
        "notes": "Raw wheat-rye hybrid grain offering crispness and body.",
    },

    # Malt Extract
    "malt-extract": {
        "potential_sg": 1.036, "yield": 0.78, "srm": 4.0,
        "notes": "Concentrated wort extract derived from base barley malt. Used for yeast starters, gravity boosts, or extract brewing.",
    },

    # Sugars
    "corn-sugar": {
        "potential_sg": 1.046, "srm": 0.0,
        "notes": "100% fermentable D-glucose (dextrose). Ideal for bottle priming and boosting gravity while drying out IPAs and strong ales.",
    },
    "cane-sugar": {
        "potential_sg": 1.046, "srm": 0.0,
        "notes": "Pure sucrose from sugar cane. 100% fermentable, commonly used to dry out high-gravity Belgian tripels and strong ales.",
    },
    "sugar": {
        "potential_sg": 1.046, "srm": 0.0,
        "notes": "Standard granulated white table sugar (sucrose). Ferments completely leaving zero residual sweetness or color.",
    },
    "brown-sugar": {
        "potential_sg": 1.045, "srm": 15.0,
        "notes": "Sucrose with molasses content. Contributes subtle rum, caramel, and toffee character in stouts and winter warmers.",
    },
    "turbinado": {
        "potential_sg": 1.045, "srm": 10.0,
        "notes": "Raw cane sugar with light molasses remnants providing soft honey-like sweetness and delicate caramel color.",
    },
    "candi-sugar": {
        "potential_sg": 1.045, "srm": 1.0,
        "notes": "Crystallized beet sugar popular in Belgian brewing. Lightens body while increasing ABV without harsh hot-alcohol bite.",
    },
    "candi-syrup": {
        "potential_sg": 1.032, "srm": 60.0,
        "notes": "Caramelized invert sugar syrup essential for Belgian Dubbels and Dark Strong Ales. Imparts rich dark fruit, toffee, and plum.",
    },
    "caramel": {
        "potential_sg": 1.035, "srm": 40.0,
        "notes": "Caramelized culinary sugar offering rich burnt sugar notes and golden-brown hue.",
    },
    "honey": {
        "potential_sg": 1.035, "srm": 1.5,
        "notes": "Natural unpasteurized bee honey. High in fructose and glucose; adds delicate floral aroma and crisp dryness when added late.",
    },
    "lactose-milk-sugar": {
        "potential_sg": 1.035, "srm": 0.0,
        "notes": "Unfermentable milk sugar by brewer's yeast. Retains permanent residual sweetness, milky mouthfeel, and body in Milk Stouts and Pastry Sours.",
    },
    "maltodextrin": {
        "potential_sg": 1.040, "srm": 0.0,
        "notes": "Non-sweet unfermentable complex polysaccharide. Enhances body, head retention, and viscosity without adding sweetness.",
    },
    "maple-syrup": {
        "potential_sg": 1.030, "srm": 35.0,
        "notes": "Boiled maple sap syrup. Delivers distinct earthy woody sweetness and delicate maple aroma in dark ales and porters.",
    },
    "molasses": {
        "potential_sg": 1.036, "srm": 80.0,
        "notes": "Cane sugar refining byproduct. Delivers bold pungent dark sugar, licorice, rum, and burnt molasses flavor in imperial stouts.",
    },
    "corn-syrup": {
        "potential_sg": 1.037, "srm": 0.5,
        "notes": "Liquid glucose syrup used to boost gravity and lighten body in light lagers and IPAs.",
    },
    "rice-syrup": {
        "potential_sg": 1.036, "srm": 1.0,
        "notes": "Fermentable syrup made from cultured rice. Enhances crisp dry finish in lagers.",
    },
    "sorghum-syrup": {
        "potential_sg": 1.037, "srm": 2.5,
        "notes": "Key ingredient in gluten-free brewing. Liquid extract from sweet sorghum cane yielding herbal, citrusy, and sweet notes.",
    },
    "agave-nectar": {
        "potential_sg": 1.038, "srm": 3.0,
        "notes": "Fructose-rich syrup from agave plants. Highly fermentable with mild neutral honey-like character.",
    },
}


def parse_numeric_lovibond(name: str) -> float | None:
    """Extracts numeric Lovibond degrees from name if formatted like '60L' or '120L'."""
    m = re.search(r"(\d+(?:\.\d+)?)\s*L\b", name, re.IGNORECASE)
    if m:
        return float(m.group(1))
    return None


def determine_malt_parameters(name: str, raw_category: str) -> dict:
    """Computes standard brewing parameters for a malt item."""
    slug = slugify(name)
    spec = FERMENTABLE_SPECS.get(slug, {})

    # 1. Category mapping
    if "category" in spec:
        category = spec["category"]
    elif raw_category == "Caramel/Crystal Malt":
        category = MaltCategory.CRYSTAL
    elif raw_category == "Roasted":
        category = MaltCategory.ROASTED
    elif name.lower().startswith("acid"):
        category = MaltCategory.ACID
    else:
        category = MaltCategory.BASE

    # 2. Color (SRM)
    extracted_l = parse_numeric_lovibond(name)
    if extracted_l is not None:
        color_srm = extracted_l
    elif "srm" in spec:
        color_srm = float(spec["srm"])
    else:
        # Default fallback by category
        if category == MaltCategory.BASE:
            color_srm = 3.0
        elif category == MaltCategory.CRYSTAL:
            color_srm = 40.0
        elif category == MaltCategory.ROASTED:
            color_srm = 400.0
        elif category == MaltCategory.ACID:
            color_srm = 3.0
        else:
            color_srm = 2.0

    # 3. Extract potential (SG and Dry Basis)
    if "potential_sg" in spec:
        potential_sg = float(spec["potential_sg"])
        potential_dry_basis = float(spec.get("yield", round((potential_sg - 1.0) / 0.0462, 2)))
    else:
        if category == MaltCategory.BASE:
            potential_sg = 1.037
            potential_dry_basis = 0.80
        elif category == MaltCategory.CRYSTAL:
            potential_sg = 1.034
            potential_dry_basis = 0.74
        elif category == MaltCategory.ROASTED:
            potential_sg = 1.028
            potential_dry_basis = 0.60
        elif category == MaltCategory.ACID:
            potential_sg = 1.034
            potential_dry_basis = 0.74
        else:
            potential_sg = 1.035
            potential_dry_basis = 0.75

    # 4. Deionized water pH and buffering index
    if "di_ph" in spec:
        di_ph = float(spec["di_ph"])
    else:
        if category == MaltCategory.BASE:
            di_ph = 5.75
        elif category == MaltCategory.CRYSTAL:
            di_ph = 5.00
        elif category == MaltCategory.ROASTED:
            di_ph = 4.70
        elif category == MaltCategory.ACID:
            di_ph = 3.80
        else:
            di_ph = 5.60

    if "buffer_index" in spec:
        buffer_index = float(spec["buffer_index"])
    else:
        if category == MaltCategory.BASE:
            buffer_index = 45.0
        elif category == MaltCategory.CRYSTAL:
            buffer_index = 30.0
        elif category == MaltCategory.ROASTED:
            buffer_index = 15.0
        elif category == MaltCategory.ACID:
            buffer_index = 35.0
        else:
            buffer_index = 40.0

    # 5. Sensory / Maltster Notes
    if "notes" in spec:
        notes = spec["notes"]
    else:
        notes = f"{name} ({raw_category}). Traditional specialty brewing fermentable."

    return {
        "id": slug,
        "name": name.replace(" – ", " ").replace("—", " "),
        "category": category,
        "potential_sg": potential_sg,
        "potential_dry_basis": potential_dry_basis,
        "color_srm": color_srm,
        "moisture_pct": 0.04,
        "di_ph": di_ph,
        "buffer_index": buffer_index,
        "notes": notes,
    }


def determine_sugar_parameters(name: str) -> dict:
    """Computes standard brewing parameters for a sugar item."""
    slug = slugify(name)
    spec = FERMENTABLE_SPECS.get(slug, {})

    potential_sg = float(spec.get("potential_sg", 1.046))
    color_srm = float(spec.get("srm", 0.0))
    notes = spec.get("notes", f"{name}. Highly fermentable brewing sugar adjunct.")

    return {
        "id": slug,
        "name": name,
        "potential_sg": potential_sg,
        "color_srm": color_srm,
        "notes": notes,
    }


def build_catalogs():
    """Generates and validates all malt and sugar primitives."""
    malts: list[MaltPrimitive] = []
    sugars: list[SugarPrimitive] = []

    seen_ids = set()

    for category, items in RAW_FERMENTABLES.items():
        for name in items:
            slug = slugify(name)
            if slug in seen_ids:
                # Handle duplicates (e.g. Maize in Grain vs Unmalted Adjunct)
                continue
            seen_ids.add(slug)

            if category == "Sugar":
                data = determine_sugar_parameters(name)
                sugar = SugarPrimitive(**data)
                sugars.append(sugar)
            else:
                data = determine_malt_parameters(name, category)
                malt = MaltPrimitive(**data)
                malts.append(malt)

    # Sort deterministically by name
    malts.sort(key=lambda m: m.name)
    sugars.sort(key=lambda s: s.name)

    return malts, sugars


def main():
    print("Building brewing fermentables seed catalog...")
    malts, sugars = build_catalogs()

    print(f"Generated {len(malts)} malts and {len(sugars)} sugars.")

    # Target output paths
    seeds_dir = BACKEND_DIR / "app" / "seeds"
    seeds_dir.mkdir(parents=True, exist_ok=True)

    malts_file = seeds_dir / "malts.json"
    sugars_file = seeds_dir / "sugars.json"

    with open(malts_file, "w", encoding="utf-8") as f:
        json.dump([m.model_dump() for m in malts], f, indent=2, ensure_ascii=False)
        f.write("\n")

    with open(sugars_file, "w", encoding="utf-8") as f:
        json.dump([s.model_dump() for s in sugars], f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Successfully wrote {len(malts)} malts to {malts_file}")
    print(f"Successfully wrote {len(sugars)} sugars to {sugars_file}")


if __name__ == "__main__":
    main()
