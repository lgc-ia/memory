import { shuffle, sampleN, uuid } from "./memory-core.js";

function up(s){ return String(s).toUpperCase(); }
function low(s){ return String(s).toLowerCase(); }

function audioUrlFor({ audio }, token){
  if(!audio?.enabled) return null;
  const baseDir = audio.baseDir || "";
  const ext = audio.ext || "wav";
  const t = low(token);
  return `assets/audio/${baseDir}/${t}.${ext}`;
}

// Générateur générique : patterns CV/VC/ON/NO
function generateTokens(gen){
  const patterns = gen.patterns || ["CV"];
  const exclude = new Set((gen.exclude || []).map(x => low(x)));

  const vowels = gen.vowels || ["a","e","i","o","u"];
  const consonants = gen.consonants || ["m","n","p","t","l","r","s"];

  const onsets = gen.onsets || consonants;
  const nuclei = gen.nuclei || vowels;
  const codas  = gen.codas  || [];

  const out = [];
  for(const pat of patterns){
    if(pat === "CV"){
      for(const c of consonants) for(const v of vowels){
        const s = low(`${c}${v}`);
        if(!exclude.has(s)) out.push(s);
      }
    } else if(pat === "VC"){
      for(const v of vowels) for(const c of consonants){
        const s = low(`${v}${c}`);
        if(!exclude.has(s)) out.push(s);
      }
    } else if(pat === "ON"){ // onset+nucleus
      for(const o of onsets) for(const n of nuclei){
        const s = low(`${o}${n}`);
        if(!exclude.has(s)) out.push(s);
      }
    } else if(pat === "NO"){ // nucleus+coda
      for(const n of nuclei){
        if(codas.length === 0){
          const s = low(`${n}`);
          if(!exclude.has(s)) out.push(s);
        } else {
          for(const c of codas){
            const s = low(`${n}${c}`);
            if(!exclude.has(s)) out.push(s);
          }
        }
      }
    } else {
      throw new Error(`Pattern inconnu: ${pat}`);
    }
  }
  return [...new Set(out)];
}

function buildDeckCaseMatch(ds, pickCount){
  // items explicites OU générés
  let items = ds.items;
  if(!items && ds.generate){
    const tokens = generateTokens(ds.generate);
    items = tokens.map(t => ({
      pairId: up(t),
      upper: up(t),
      lower: low(t),
      ttsText: low(t)
    }));
  }
  const picked = sampleN(items || [], pickCount);

  const deck = [];
  for(const it of picked){
    const token = it.ttsText ?? it.pairId;
    const au = it.audioUpper ? `assets/audio/${it.audioUpper}` : (it.audio ? `assets/audio/${it.audio}` : audioUrlFor(ds, token));
    const al = it.audioLower ? `assets/audio/${it.audioLower}` : (it.audio ? `assets/audio/${it.audio}` : audioUrlFor(ds, token));

    deck.push({
      uid: uuid(), pairId: it.pairId, type:"upper", kind:"text",
      faceText: it.upper, ttsText: token, audioUrl: au, flipped:false, matched:false, _reveal:false
    });
    deck.push({
      uid: uuid(), pairId: it.pairId, type:"lower", kind:"text",
      faceText: it.lower, ttsText: token, audioUrl: al, flipped:false, matched:false, _reveal:false
    });
  }

  return { deck: shuffle(deck), pairsTotal: picked.length };
}

function buildDeckImageWord(ds, pickCount){
  const picked = sampleN(ds.items || [], pickCount);
  const deck = [];
  for(const it of picked){
    deck.push({
      uid: uuid(), pairId: it.pairId, type:"image", kind:"image",
      imageUrl: it.image, ttsText: it.ttsText ?? it.word ?? it.pairId, audioUrl: it.audio ?? null,
      flipped:false, matched:false, _reveal:false
    });
    deck.push({
      uid: uuid(), pairId: it.pairId, type:"word", kind:"text",
      faceText: it.word, ttsText: it.ttsText ?? it.word ?? it.pairId, audioUrl: it.audio ?? null,
      flipped:false, matched:false, _reveal:false
    });
  }
  return { deck: shuffle(deck), pairsTotal: picked.length };
}

export const LEVELS = [
  {
    id: "level1",
    title: "Niveau 1 — Voyelles",
    subtitle: "Associer MAJ ↔ min (A E I O U Y).",
    hint: "Audio optionnel : assets/audio/letters/a.wav …",
    mode: "case_match",
    pickDefault: 6,
    audio: { enabled:true, baseDir:"letters", ext:"wav" },
    items: ["A","E","I","O","U","Y"].map(x => ({ pairId:x, upper:x, lower:low(x), ttsText:low(x) }))
  },
  {
    id: "level2",
    title: "Niveau 2 — Alphabet",
    subtitle: "Associer MAJ ↔ min (tirage aléatoire).",
    hint: "Audio optionnel : assets/audio/letters/r.wav …",
    mode: "case_match",
    pickDefault: 9,
    audio: { enabled:true, baseDir:"letters", ext:"wav" },
    items: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(x => ({ pairId:x, upper:x, lower:low(x), ttsText:low(x) }))
  },
  {
    id: "level3",
    title: "Niveau 3 — Syllabes simples",
    subtitle: "CV / VC (ex : ra / ar) – MAJ ↔ min.",
    hint: "Audio auto : assets/audio/syllables/ra.wav, ar.wav, etc.",
    mode: "syllable_case_match",
    pickDefault: 9,
    audio: { enabled:true, baseDir:"syllables", ext:"wav" },
    generate: {
      patterns: ["CV","VC"],
      vowels: ["a","e","i","o","u"],
      consonants: ["m","n","p","t","l","r","s"],
      exclude: []
    }
  },
  {
    id: "level4",
    title: "Niveau 4 — Syllabes complexes",
    subtitle: "Digrammes / groupes consonantiques + graphèmes (ou/on/an/en/in/un/…)",
    hint: "Audio auto : assets/audio/syllables/chou.wav, oin.wav, etc.",
    mode: "syllable_case_match",
    pickDefault: 9,
    audio: { enabled:true, baseDir:"syllables", ext:"wav" },
    generate: {
      patterns: ["ON","NO"],
      onsets: ["ch","ph","gn","qu","tr","dr","br","cr","fr","gr","pr","vr","pl","bl","cl","fl","gl","sp","st","sk"],
      nuclei: ["a","e","i","o","u","ou","ai","oi","ui","au","eau","an","en","in","un","on","ain","ein","oin","eu","ien","ion","ill"],
      codas: ["n","m","r","l","s"],
      exclude: ["quu","quou","eauill","illn","illm","ienen","ienin","ienun","ienon","ioneau","ionill"]
    }
  },
  {
    id: "level5",
    title: "Niveau 5 — Image ↔ Mot (facile)",
    subtitle: "Associer image claire ↔ mot simple.",
    hint: "À compléter : items [{pairId, word, image, audio?}]",
    mode: "image_word",
    pickDefault: 9,
    items: [
      // EXEMPLE :
      // { pairId:"pomme", word:"POMME", image:"assets/images/objets/pomme.png", audio:"assets/audio/words/pomme.wav" }
    ]
  },
  {
    id: "level6",
    title: "Niveau 6 — Image ↔ Mot (difficile)",
    subtitle: "Mots plus difficiles (graphies proches, pièges…).",
    hint: "À compléter : items [{pairId, word, image, audio?}]",
    mode: "image_word",
    pickDefault: 9,
    items: []
  }
];

export function buildDeck(level, pickCount){
  const pc = Number(pickCount ?? level.pickDefault ?? 9);
  if(level.mode === "case_match" || level.mode === "syllable_case_match"){
    return buildDeckCaseMatch(level, pc);
  }
  if(level.mode === "image_word"){
    return buildDeckImageWord(level, pc);
  }
  throw new Error("Mode inconnu: " + level.mode);
}
