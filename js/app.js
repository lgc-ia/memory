import { MemoryEngine } from "./memory-core.js";
import { LEVELS, buildDeck } from "./datasets.js";
import { speak, setEnabled, isEnabled } from "./tts.js";

const levelsEl = document.getElementById("levels");
const boardEl = document.getElementById("board");
const titleEl = document.getElementById("title");
const subtitleEl = document.getElementById("subtitle");
const hintEl = document.getElementById("hint");
const yearEl = document.getElementById("year");

const movesEl = document.getElementById("moves");
const pairsEl = document.getElementById("pairs");
const pairsTotalEl = document.getElementById("pairsTotal");
const toastEl = document.getElementById("toast");

const pickCountEl = document.getElementById("pickCount");
const newGameBtn = document.getElementById("newGameBtn");
const revealBtn = document.getElementById("revealBtn");
const muteBtn = document.getElementById("muteBtn");

let currentLevel = LEVELS[0];
let engine = null;

function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove("show"), 1600);
}

function setActiveNav(){
  [...levelsEl.querySelectorAll(".levelBtn")].forEach(btn => {
    btn.classList.toggle("active", btn.dataset.id === currentLevel.id);
  });
}

function render(state){
  movesEl.textContent = String(state.moves);
  pairsEl.textContent = String(state.matchedPairs);
  pairsTotalEl.textContent = String(state.pairsTotal);

  boardEl.innerHTML = "";

  for(const c of state.deck){
    const card = document.createElement("div");
    card.className = "card";
    if(c.matched) card.classList.add("matched");
    if(c.flipped || c._reveal) card.classList.add("flipped");

    const inner = document.createElement("div");
    inner.className = "card-inner";

    const front = document.createElement("div");
    front.className = "face front";
    front.innerHTML = `
      <div class="backContent">
        <div style="opacity:.75;font-weight:900">Memory</div>
        <div style="opacity:.65;font-size:12px">${escapeHtml(currentLevel.title)}</div>
      </div>
    `;

    const back = document.createElement("div");
    back.className = "face back";

    const tag = (c.type === "upper") ? "MAJUSCULE"
      : (c.type === "lower") ? "minuscule"
      : (c.type === "image") ? "IMAGE"
      : "MOT";

    const content = document.createElement("div");
    content.className = "backContent";

    if(c.kind === "image"){
      const wrap = document.createElement("div");
      wrap.className = "imgwrap";
      wrap.innerHTML = `<img src="${c.imageUrl}" alt="${escapeHtml(c.pairId)}">`;
      content.appendChild(wrap);

      const t = document.createElement("div");
      t.className = "tag";
      t.textContent = tag;
      content.appendChild(t);
    } else {
      const big = document.createElement("div");
      big.className = "big";
      big.textContent = c.faceText ?? "";
      content.appendChild(big);

      const t = document.createElement("div");
      t.className = "tag";
      t.textContent = tag;
      content.appendChild(t);
    }

    back.appendChild(content);

    const ttsBtn = document.createElement("div");
    ttsBtn.className = "tts";
    ttsBtn.title = "Écouter";
    ttsBtn.textContent = "🔊";
    ttsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      engine?.clickCard(c.uid, true);
    });
    back.appendChild(ttsBtn);

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.addEventListener("click", () => engine?.clickCard(c.uid, false));
    boardEl.appendChild(card);
  }
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function rebuildEngine(){
  titleEl.textContent = currentLevel.title;
  subtitleEl.textContent = currentLevel.subtitle || "";
  hintEl.textContent = currentLevel.hint || "";

  // pickCount default par niveau (et synchro UI)
  const def = currentLevel.pickDefault ?? 9;
  if(!pickCountEl.value) pickCountEl.value = String(def);

  engine = new MemoryEngine({
    buildDeck: () => buildDeck(currentLevel, Number(pickCountEl.value)),
    onStateChange: render,
    onToast: toast,
    onSpeakToken: ({ tokenText, audioUrl }) => speak({ tokenText, audioUrl })
  });

  engine.newGame();
  setActiveNav();
}

function buildNav(){
  levelsEl.innerHTML = "";
  for(const lvl of LEVELS){
    const btn = document.createElement("button");
    btn.className = "levelBtn";
    btn.dataset.id = lvl.id;

    btn.innerHTML = `
      <div>${escapeHtml(lvl.title)}</div>
      <div class="sub">${escapeHtml(lvl.subtitle || "")}</div>
    `;

    btn.addEventListener("click", () => {
      currentLevel = lvl;
      // preset pickCount par niveau
      pickCountEl.value = String(lvl.pickDefault ?? 9);
      rebuildEngine();
    });

    levelsEl.appendChild(btn);
  }
}

function syncMuteBtn(){
  muteBtn.textContent = isEnabled() ? "🔊 Son : ON" : "🔇 Son : OFF";
}

newGameBtn.addEventListener("click", () => engine?.newGame());
revealBtn.addEventListener("click", () => engine?.revealAll(2000));
pickCountEl.addEventListener("change", () => engine?.newGame());

muteBtn.addEventListener("click", () => {
  setEnabled(!isEnabled());
  syncMuteBtn();
  toast(isEnabled() ? "Son activé" : "Son désactivé");
});

buildNav();
syncMuteBtn();
rebuildEngine();

if(yearEl) yearEl.textContent = String(new Date().getFullYear());
