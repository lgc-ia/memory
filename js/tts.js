let enabled = true;

export function setEnabled(v){
  enabled = !!v;
  if(!enabled){
    try { window.speechSynthesis?.cancel?.(); } catch(_) {}
  }
}
export function isEnabled(){ return enabled; }

async function playAudio(url){
  return new Promise((resolve) => {
    const a = new Audio(url);
    a.preload = "auto";
    a.onended = () => resolve(true);
    a.onerror = () => resolve(false);
    a.play().then(()=>{}).catch(()=>resolve(false));
  });
}

async function speakFallback(text, lang="fr-FR"){
  if(!("speechSynthesis" in window)) return false;
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = lang;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    try { window.speechSynthesis.cancel(); } catch(_) {}
    window.speechSynthesis.speak(u);
  });
}

export async function speak({ tokenText, audioUrl }){
  if(!enabled) return;
  if(audioUrl){
    const ok = await playAudio(audioUrl);
    if(ok) return;
  }
  if(tokenText) await speakFallback(tokenText);
}
