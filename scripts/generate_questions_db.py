import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "questions.json"
OUT_JS = ROOT / "data" / "questions-db.js"


CATEGORIES = [
    {
        "name": "Chemical Elements",
        "hint": "The impostor is invented; the other options are official chemical element names.",
        "reals": ["Actinium", "Berkelium", "Cerium", "Dysprosium", "Erbium", "Fermium", "Hafnium", "Iridium", "Livermorium", "Mendelevium", "Neodymium", "Oganesson"],
        "fakes": ["Lanthium", "Novarium", "Aurelium", "Cerulium", "Ferronium", "Quantium", "Rhadium", "Silvium", "Vesperium", "Zenthium"],
    },
    {
        "name": "IAU Constellations",
        "hint": "The impostor is not one of the 88 constellations recognized by the International Astronomical Union.",
        "reals": ["Andromeda", "Boötes", "Carina", "Delphinus", "Eridanus", "Fornax", "Grus", "Hydrus", "Lacerta", "Monoceros", "Pictor", "Volans"],
        "fakes": ["Tethralis", "Aurelion", "Draconis Major", "Noctua", "Vulpina", "Cervus", "Orbellum", "Solisca", "Lyronyx", "Nimbora"],
    },
    {
        "name": "Planetary Moons",
        "hint": "The impostor is made up; the other options are named moons in our solar system.",
        "reals": ["Amalthea", "Callisto", "Deimos", "Enceladus", "Europa", "Ganymede", "Hyperion", "Iapetus", "Miranda", "Nereid", "Oberon", "Triton"],
        "fakes": ["Caldora", "Vireon", "Lunessa", "Marithel", "Orbatis", "Thalora", "Jovia", "Saturna Minor", "Neptara", "Umbrielis"],
    },
    {
        "name": "Dinosaurs",
        "hint": "The impostor is a dinosaur-like invention; the other options are real dinosaur genera.",
        "reals": ["Allosaurus", "Ankylosaurus", "Baryonyx", "Carnotaurus", "Diplodocus", "Gallimimus", "Iguanodon", "Maiasaura", "Parasaurolophus", "Spinosaurus", "Therizinosaurus", "Velociraptor"],
        "fakes": ["Velocidactyl", "Raptorexus", "Triceradon", "Megaclawrus", "Stegonyx", "Brontoraptor", "Ceratovenator", "Dinomimus Rex", "Thundrosaurus", "Clawceratops"],
    },
    {
        "name": "Programming Languages",
        "hint": "The impostor is not a recognized programming language; the others are real languages.",
        "reals": ["Ada", "Clojure", "Crystal", "Dart", "Elixir", "Erlang", "Forth", "Haskell", "Julia", "Kotlin", "Nim", "Rust"],
        "fakes": ["Marble", "CopperScript", "Lattice", "Orchid", "ZephyrLang", "Pebble", "Northstar", "QuantaScript", "Vellum", "Bonsai"],
    },
    {
        "name": "Cognitive Biases",
        "hint": "The impostor sounds psychological but is not a standard cognitive bias name.",
        "reals": ["Anchoring bias", "Availability heuristic", "Bandwagon effect", "Confirmation bias", "Framing effect", "Hindsight bias", "Illusory correlation", "Negativity bias", "Optimism bias", "Planning fallacy", "Self-serving bias", "Status quo bias"],
        "fakes": ["Recency mirage", "Certainty drift", "Halo rebound", "Memory varnish", "Novelty magnetism", "Pattern fog", "Truth sparkle", "Choice gravity", "Consensus shimmer", "Focus echo"],
    },
    {
        "name": "Logical Fallacies",
        "hint": "The impostor is invented; the other options name recognized informal or formal fallacies.",
        "reals": ["Ad hominem", "Appeal to authority", "Begging the question", "False dilemma", "Hasty generalization", "No true Scotsman", "Post hoc ergo propter hoc", "Red herring", "Slippery slope", "Straw man", "Tu quoque", "Texas sharpshooter"],
        "fakes": ["Silver lantern", "Golden staircase", "Mirror puddle", "Paper crown", "Circular candle", "Velvet ladder", "Silent trumpet", "Frosted premise", "Lantern bridge", "False umbrella"],
    },
    {
        "name": "Music Theory Terms",
        "hint": "The impostor is made up; the other options are established music theory or notation terms.",
        "reals": ["Appoggiatura", "Arpeggio", "Cadenza", "Counterpoint", "Fermata", "Hemiola", "Interval", "Motif", "Ostinato", "Polyrhythm", "Syncopation", "Tritone"],
        "fakes": ["Tritonata", "Arpeggial", "Cadenzino", "HarmoniqueX", "Melodrake", "Syncopata", "Tempolet", "Chordora", "Ostinelle", "Motiflex"],
    },
    {
        "name": "Typography Terms",
        "hint": "The impostor is invented; the other options are real typography or type-design terms.",
        "reals": ["Ascender", "Baseline", "Counter", "Descender", "Glyph", "Kerning", "Leading", "Ligature", "Serif", "Tracking", "X-height", "Aperture"],
        "fakes": ["Glyphline", "Kernmark", "Seriflet", "Typoraid", "Baselock", "Ligaframe", "CounterlineX", "Ascendry", "Inkspan", "Letterwell"],
    },
    {
        "name": "Coffee Drinks",
        "hint": "The impostor is invented; the other options are real coffee drinks or preparations.",
        "reals": ["Affogato", "Americano", "Cappuccino", "Cortado", "Doppio", "Espresso", "Flat white", "Latte", "Lungo", "Macchiato", "Mocha", "Ristretto"],
        "fakes": ["Brevitato", "Foamado", "Cremello", "Steamretto", "Macchino", "Lattesso", "Cortanino", "MocharinoX", "Espressini", "Aromato"],
    },
    {
        "name": "Cheeses",
        "hint": "The impostor is invented; the other options are real cheese names.",
        "reals": ["Asiago", "Comté", "Gorgonzola", "Halloumi", "Manchego", "Mimolette", "Paneer", "Pecorino", "Reblochon", "Roquefort", "Taleggio", "Vacherin"],
        "fakes": ["Vacherol", "Brielette", "Goudarin", "Morbella", "Cheddano", "Fetessa", "TalegginoX", "Roquefin", "Manchera", "Curdova"],
    },
    {
        "name": "Board Games",
        "hint": "The impostor is invented; the other options are real tabletop board game titles.",
        "reals": ["Azul", "Carcassonne", "Catan", "Codenames", "Dominion", "Gloomhaven", "Pandemic", "Patchwork", "Root", "Scythe", "Ticket to Ride", "Wingspan"],
        "fakes": ["Port RoyaleX", "Crownmarket", "Tilehaven", "Hex Harbor", "Castle Orchard", "Trainspire", "Meadowlords", "Guildglass", "Dice Abbey", "Kingdom Loom"],
    },
    {
        "name": "Classical Composers",
        "hint": "The impostor is invented; the other options are real classical composers.",
        "reals": ["Bach", "Bartók", "Beethoven", "Brahms", "Debussy", "Dvořák", "Handel", "Mahler", "Mozart", "Ravel", "Sibelius", "Stravinsky"],
        "fakes": ["Morvinsky", "Ravelsky", "Bachmannino", "Debussart", "Mozarini", "Sibeliusson", "Handelberg", "Dvoranek", "Mahlerov", "Bartokian"],
    },
    {
        "name": "Art Movements",
        "hint": "The impostor is invented; the other options are real art movements or styles.",
        "reals": ["Baroque", "Cubism", "Dada", "Expressionism", "Fauvism", "Futurism", "Impressionism", "Minimalism", "Pointillism", "Realism", "Rococo", "Surrealism"],
        "fakes": ["LuminarismX", "Chromalism", "Velvetism", "Post-Fauval", "Neo-Glintism", "Cuborism", "Soft RealismX", "Prismatism", "Dreamline", "Auralism"],
    },
    {
        "name": "Greek Philosophers",
        "hint": "The impostor is invented; the other options are real ancient Greek philosophers.",
        "reals": ["Anaxagoras", "Anaximander", "Aristotle", "Democritus", "Diogenes", "Epicurus", "Heraclitus", "Parmenides", "Plato", "Plotinus", "Socrates", "Zeno of Elea"],
        "fakes": ["Xenophilos", "Kleonides", "Aristonex", "Praxitos", "Theomander", "Demosophos", "Zenarchus", "Platonor", "Epikreon", "Sophirion"],
    },
    {
        "name": "Norse Mythology",
        "hint": "The impostor is invented; the other options are names from Norse myth.",
        "reals": ["Baldur", "Bifrost", "Fenrir", "Freya", "Heimdall", "Hel", "Jörmungandr", "Loki", "Mjölnir", "Odin", "Thor", "Yggdrasil"],
        "fakes": ["Helmora", "Stormvik", "Runefall", "Skaldor", "Frostheim", "Lokivar", "Odinspear", "Thundra", "Bifrostar", "Wolfsaga"],
    },
    {
        "name": "Ancient Civilizations",
        "hint": "The impostor is invented; the other options are real ancient peoples or civilizations.",
        "reals": ["Akkadians", "Assyrians", "Babylonians", "Carthaginians", "Etruscans", "Hittites", "Minoans", "Mycenaeans", "Nabataeans", "Olmecs", "Phoenicians", "Sumerians"],
        "fakes": ["Laruthians", "Velorians", "Namarites", "Aurelites", "Solmecans", "Karthunians", "Etrunites", "Mycorians", "Hittorians", "Phoebans"],
    },
    {
        "name": "Mountain Ranges",
        "hint": "The impostor is invented; the other options are real mountain ranges.",
        "reals": ["Alps", "Andes", "Appalachians", "Atlas", "Caucasus", "Drakensberg", "Himalayas", "Karakoram", "Pyrenees", "Rockies", "Tien Shan", "Urals"],
        "fakes": ["Veligar", "Northspine", "Eldar Ridge", "Velvet Alps", "Thornreach", "Solmar Range", "Karakel", "Cloudspine", "Highmere", "Dawnfold"],
    },
    {
        "name": "Cloud Types",
        "hint": "The impostor is invented; the other options are real cloud genera or supplementary cloud features.",
        "reals": ["Altocumulus", "Altostratus", "Cirrocumulus", "Cirrostratus", "Cirrus", "Cumulonimbus", "Cumulus", "Nimbostratus", "Stratocumulus", "Stratus", "Mammatus", "Lenticularis"],
        "fakes": ["Fractuson", "Vaporalis", "Nimbuslet", "Cirrava", "Stratolux", "Cumulora", "Mistiform", "Aerolace", "Rainveil", "Cloudora"],
    },
    {
        "name": "Marine Animals",
        "hint": "The impostor is invented; the other options are real marine animals.",
        "reals": ["Blue tang", "Cuttlefish", "Dugong", "Lionfish", "Manta ray", "Moray eel", "Nautilus", "Nudibranch", "Oarfish", "Sea cucumber", "Sea dragon", "Vaquita"],
        "fakes": ["Glasswhale", "Coral lynx", "Velvet squidling", "Moonfin", "Reef panther", "Sapphire krillbeast", "Ocealisk", "Pearlback", "Tide fox", "Kelpwing"],
    },
    {
        "name": "World Currencies",
        "hint": "The impostor is invented; the other options are real currency names.",
        "reals": ["Baht", "Cedi", "Dinar", "Dirham", "Dollar", "Euro", "Forint", "Krona", "Leu", "Peso", "Rupee", "Won"],
        "fakes": ["Florinex", "Creda", "Dollaroid", "Eurotal", "Rupino", "Pesara", "Krint", "Levora", "Dinariq", "Wonlet"],
    },
    {
        "name": "SI Units",
        "hint": "The impostor is invented; the other options are real SI base or derived units.",
        "reals": ["Ampere", "Becquerel", "Candela", "Coulomb", "Farad", "Joule", "Kelvin", "Mole", "Newton", "Pascal", "Tesla", "Watt"],
        "fakes": ["Lumel", "Voltane", "Joulon", "Newtra", "Kelvion", "Pascalis", "Candor", "Teslon", "Metrion", "Faradayne"],
    },
    {
        "name": "Literary Terms",
        "hint": "The impostor is invented; the other options are real literary terms.",
        "reals": ["Allegory", "Alliteration", "Anaphora", "Caesura", "Diction", "Enjambment", "Foreshadowing", "Hyperbole", "Irony", "Metaphor", "Motif", "Synecdoche"],
        "fakes": ["Plotglow", "Metaphoria", "Ironique", "Verselet", "Narratone", "Symbolift", "Foreshade", "Dictionalism", "Motifora", "Caesurine"],
    },
    {
        "name": "Chess Terms",
        "hint": "The impostor is invented; the other options are real chess terms.",
        "reals": ["Castling", "Checkmate", "En passant", "Fianchetto", "Fork", "Gambit", "Pin", "Promotion", "Skewer", "Stalemate", "Tempo", "Zugzwang"],
        "fakes": ["Crownshift", "Pawnfall", "Knightlock", "Queenveil", "Tempo forkX", "Bishop jump", "Castlepin", "Rookspin", "Matebridge", "Zugflare"],
    },
    {
        "name": "Architectural Styles",
        "hint": "The impostor is invented; the other options are real architectural styles.",
        "reals": ["Art Deco", "Baroque", "Bauhaus", "Beaux-Arts", "Brutalism", "Deconstructivism", "Gothic", "Modernism", "Neoclassical", "Postmodernism", "Romanesque", "Victorian"],
        "fakes": ["Glass GothicX", "Neo-Brickism", "Velvet Deco", "Archiform", "Baucurve", "Romanovo", "Post-Baroquism", "Modernique", "Stonewave", "Columnarism"],
    },
]


def build_questions():
    questions = []
    for category in CATEGORIES:
        reals = category["reals"]
        fakes = category["fakes"]
        for index, fake in enumerate(fakes):
            real_options = [
                reals[(index * 3) % len(reals)],
                reals[(index * 3 + 5) % len(reals)],
                reals[(index * 3 + 9) % len(reals)],
            ]
            options = [{"word": word, "fake": False} for word in real_options]
            options.append({"word": fake, "fake": True})
            questions.append({
                "category": category["name"],
                "options": options,
                "hint": f'"{fake}" is the impostor. {category["hint"]}',
            })
    return questions


def main():
    questions = build_questions()
    data = {
        "version": 1,
        "description": "Question database for FakeRealGame. Each round has three real terms and one invented impostor.",
        "categories": [category["name"] for category in CATEGORIES],
        "researchSources": [
            "https://iauarchive.eso.org/public/themes/constellations/",
            "https://iupac.org/what-we-do/periodic-table-of-elements/",
            "https://science.nasa.gov/solar-system/moons/facts/",
            "https://www.nhm.ac.uk/discover/dino-directory.html",
        ],
        "questions": questions,
    }
    OUT.parent.mkdir(exist_ok=True)
    json_text = json.dumps(data, indent=2, ensure_ascii=False)
    OUT.write_text(json_text + "\n", encoding="utf-8")
    OUT_JS.write_text(
        "// Generated from data/questions.json by scripts/generate_questions_db.py\n"
        f"window.QUESTIONS_DB = {json_text};\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(questions)} questions to {OUT.relative_to(ROOT)} and {OUT_JS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
