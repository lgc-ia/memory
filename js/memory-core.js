export function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

export function sampleN(arr, n){
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

export function uuid(){
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "u" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export class MemoryEngine {
  constructor({ buildDeck, onStateChange, onToast, onSpeakToken }){
    this.buildDeck = buildDeck;
    this.onStateChange = onStateChange;
    this.onToast = onToast;
    this.onSpeakToken = onSpeakToken;

    this.state = {
      deck: [],
      flipped: [],
      lock: false,
      moves: 0,
      matchedPairs: 0,
      pairsTotal: 0,
    };
  }

  emit(){ this.onStateChange?.({ ...this.state }); }

  newGame(){
    const built = this.buildDeck();
    this.state.deck = built.deck;
    this.state.pairsTotal = built.pairsTotal;
    this.state.flipped = [];
    this.state.lock = false;
    this.state.moves = 0;
    this.state.matchedPairs = 0;
    this.emit();
    this.onToast?.(`Nouvelle partie : ${this.state.pairsTotal} paires ✅`);
  }

  revealAll(ms=2000){
    if(this.state.lock) return;
    this.state.lock = true;
    this.state.deck.forEach(c => c._reveal = true);
    this.emit();
    setTimeout(() => {
      this.state.deck.forEach(c => { if(!c.matched) c._reveal = false; });
      this.state.lock = false;
      this.emit();
    }, ms);
  }

  clickCard(uid, clickedOnTts=false){
    if(this.state.lock) return;

    const card = this.state.deck.find(c => c.uid === uid);
    if(!card || card.matched) return;

    if(clickedOnTts){
      this.onSpeakToken?.({ tokenText: card.ttsText ?? card.faceText ?? "", audioUrl: card.audioUrl ?? null });
      return;
    }

    if(card.flipped || this.state.flipped.some(x => x.uid === uid)) return;

    card.flipped = true;
    this.state.flipped.push(card);

    if(this.state.flipped.length === 2){
      this.state.moves += 1;
      this.emit();

      const [a,b] = this.state.flipped;
      const isMatch = (a.pairId === b.pairId) && (a.type !== b.type);

      this.state.lock = true;
      this.emit();

      setTimeout(() => {
        if(isMatch){
          a.matched = true; b.matched = true;
          this.state.matchedPairs += 1;
          this.onToast?.(`✅ ${a.pairId}`);
          this.onSpeakToken?.({ tokenText: a.ttsText ?? a.pairId, audioUrl: a.audioUrl ?? null });

          if(this.state.matchedPairs === this.state.pairsTotal){
            this.onToast?.("🎉 Bravo ! Nouvelle partie ?");
          }
        } else {
          this.onToast?.("↩️ Réessaye");
          a.flipped = false; b.flipped = false;
        }

        this.state.flipped = [];
        this.state.lock = false;
        this.emit();
      }, isMatch ? 380 : 780);

    } else {
      this.emit();
    }
  }
}
