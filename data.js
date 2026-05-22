// Each round: category + 4 options, one marked as the fake.
// `hint` is shown after the user answers, to teach them something.
const ROUNDS = [
  {
    category: "Greek Philosophers",
    options: [
      { word: "Heraclitus",  fake: false },
      { word: "Parmenides",  fake: false },
      { word: "Xenophilos",  fake: true  },
      { word: "Anaximander", fake: false }
    ],
    hint: "“Xenophilos” sounds Greek but was invented. The real Anaximander proposed the apeiron — the boundless origin of all things."
  },
  {
    category: "Programming Languages",
    options: [
      { word: "Crystal",  fake: false },
      { word: "Marble",   fake: true  },
      { word: "Elixir",   fake: false },
      { word: "Nim",      fake: false }
    ],
    hint: "“Marble” isn't a language. Crystal, Elixir and Nim are all real (and surprisingly elegant)."
  },
  {
    category: "Constellations",
    options: [
      { word: "Cassiopeia", fake: false },
      { word: "Lyra",       fake: false },
      { word: "Vulpecula",  fake: false },
      { word: "Tethralis",  fake: true  }
    ],
    hint: "“Tethralis” was invented. Vulpecula — the little fox — is a real but faint northern constellation."
  },
  {
    category: "Cheeses",
    options: [
      { word: "Manchego",   fake: false },
      { word: "Vacherol",   fake: true  },
      { word: "Taleggio",   fake: false },
      { word: "Reblochon",  fake: false }
    ],
    hint: "“Vacherol” is fake (though Vacherin is real!). Reblochon comes from Savoie, France."
  },
  {
    category: "Chemical Elements",
    options: [
      { word: "Promethium", fake: false },
      { word: "Astatine",   fake: false },
      { word: "Lanthium",   fake: true  },
      { word: "Dysprosium", fake: false }
    ],
    hint: "“Lanthium” is fake — but Lanthanum (element 57) is real. Astatine is the rarest naturally occurring element on Earth."
  },
  {
    category: "Japanese Sword Terms",
    options: [
      { word: "Katana",   fake: false },
      { word: "Wakizashi", fake: false },
      { word: "Tsurugi",  fake: false },
      { word: "Kenjido",  fake: true  }
    ],
    hint: "“Kenjido” was made up. Tsurugi refers to ancient straight double-edged swords."
  },
  {
    category: "Cognitive Biases",
    options: [
      { word: "Dunning–Kruger effect", fake: false },
      { word: "Availability heuristic", fake: false },
      { word: "Recency mirage",        fake: true  },
      { word: "Anchoring bias",        fake: false }
    ],
    hint: "“Recency mirage” isn't a recognised bias. (Confusingly, there *is* a linguistics term called the recency illusion!)"
  },
  {
    category: "Mountain Ranges",
    options: [
      { word: "Karakoram", fake: false },
      { word: "Drakensberg", fake: false },
      { word: "Tien Shan", fake: false },
      { word: "Veligar",   fake: true  }
    ],
    hint: "“Veligar” is fake. The Tien Shan stretches across Central Asia for over 2,500 km."
  },
  {
    category: "Music Theory Terms",
    options: [
      { word: "Appoggiatura", fake: false },
      { word: "Hemiola",      fake: false },
      { word: "Cadenza",      fake: false },
      { word: "Tritonata",    fake: true  }
    ],
    hint: "“Tritonata” isn't real (though “tritone” is). A hemiola is a rhythmic feeling of 3 against 2."
  },
  {
    category: "Dinosaurs",
    options: [
      { word: "Therizinosaurus", fake: false },
      { word: "Gallimimus",      fake: false },
      { word: "Velocidactyl",    fake: true  },
      { word: "Parasaurolophus", fake: false }
    ],
    hint: "“Velocidactyl” mashes two real names together. Therizinosaurus had meter-long claws."
  },
  {
    category: "Logical Fallacies",
    options: [
      { word: "Ad hominem",     fake: false },
      { word: "Straw man",      fake: false },
      { word: "Red herring",    fake: false },
      { word: "Silver lantern", fake: true  }
    ],
    hint: "“Silver lantern” isn't a fallacy. A red herring distracts from the real issue."
  },
  {
    category: "Coffee Drinks",
    options: [
      { word: "Cortado",   fake: false },
      { word: "Macchiato", fake: false },
      { word: "Affogato",  fake: false },
      { word: "Brevitato", fake: true  }
    ],
    hint: "“Brevitato” is invented (though a “breve” is real). An affogato is espresso poured over ice cream."
  }
];

// Pick N rounds at random and shuffle their options
function buildGame(n = 10) {
  const shuffled = [...ROUNDS].sort(() => Math.random() - 0.5).slice(0, n);
  return shuffled.map(r => ({
    ...r,
    options: [...r.options].sort(() => Math.random() - 0.5)
  }));
}

// Support Node.js require (server) while keeping browser globals
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ROUNDS, buildGame };
}
