(function(){
  const STORAGE_KEY = "ijnebSitePlayerState.v4";

  const PLAYLIST = [
    { src: "assets/audio/Vegan_Pie.m4a", type: "audio/mp4", title: "Vegan Pie", creditText: "MINDSHANK feat. @extreme_negligence", creditUrl: "https://www.bandlab.com/extreme_negligence" },
    { src: "assets/audio/dannyjase2.mp3", type: "audio/mpeg", title: "Funky 2", creditText: "MINDSHANK feat. Danny Brickwell, Max Shred & Ace Blaze", creditUrl: "https://www.bandlab.com/bands/mindshank" }
  ];

  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
  function loadState(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch(e){ return {}; }
  }
  function saveState(s){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }catch(e){}
  }

  function ensurePlayer(){
    if(document.getElementById("sitePlayer")) return;

    const el = document.createElement("div");
    el.id = "sitePlayer";
    el.className = "sitePlayer";
    el.innerHTML = `
      <div class="sitePlayerInner">
        <div class="sitePlayerControls">
          <button class="spBtn spBtnMain isPlay" id="spMainBtn" type="button">Play + Unmute</button>
          <button class="spBtn spBtnDisable" id="spDisableBtn" type="button">Disable</button>
          <input class="spVol" id="spVol" type="range" min="0" max="1" step="0.01" aria-label="Volume">
        </div>

        <div class="spState" aria-live="polite">
          <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
          <span id="spStatus">Paused</span>
          <span id="spCredit" style="margin-left:8px; font-size:12px; opacity:.68; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:45vw;"></span>
        </div>

        <audio id="siteAudio" preload="auto"></audio>
      </div>

      <div class="spProgressWrap" id="spProgressWrap" title="Seek">
        <div class="spProgress" id="spProgress"></div>
      </div>
    `;
    document.body.appendChild(el);
  }

  function setAudioSource(audio, idx){
    const t = PLAYLIST[idx] || PLAYLIST[0];
    // Clear sources
    while(audio.firstChild){ audio.removeChild(audio.firstChild); }
    const src = document.createElement("source");
    src.src = t.src;
    src.type = t.type;
    audio.appendChild(src);
    audio.load();
  }

  function setCredit(el, idx){
    const t = PLAYLIST[idx] || PLAYLIST[0];
    el.innerHTML = `${t.title} — <a href="${t.creditUrl}" target="_blank" rel="noopener" style="color:inherit; text-decoration:none; opacity:.9;">${t.creditText}</a>`;
  }

  function init(){
    ensurePlayer();

    const player = document.getElementById("sitePlayer");
    const audio = document.getElementById("siteAudio");
    const mainBtn = document.getElementById("spMainBtn");
    const disableBtn = document.getElementById("spDisableBtn");
    const vol = document.getElementById("spVol");
    const status = document.getElementById("spStatus");
    const credit = document.getElementById("spCredit");
    const progWrap = document.getElementById("spProgressWrap");
    const prog = document.getElementById("spProgress");

    if(!player || !audio || !mainBtn || !disableBtn || !vol || !status || !credit || !progWrap || !prog) return;

    let state = loadState();
    state.volume = typeof state.volume === "number" ? clamp(state.volume, 0, 1) : 0.6;
    state.disabled = !!state.disabled;
    state.wasPlaying = !!state.wasPlaying;
    state.time = typeof state.time === "number" ? Math.max(0, state.time) : 0;
    state.trackIndex = Number.isFinite(state.trackIndex) ? clamp(state.trackIndex, 0, PLAYLIST.length-1) : 0;

    vol.value = String(state.volume);
    audio.volume = state.volume;

    setAudioSource(audio, state.trackIndex);
    setCredit(credit, state.trackIndex);

    function setUI(){
      if(state.disabled){
        player.classList.remove("isPlaying");
        mainBtn.disabled = true;
        vol.disabled = true;
        status.textContent = "Music disabled";
        mainBtn.textContent = "Play + Unmute";
        mainBtn.classList.add("isPlay");
        mainBtn.classList.remove("isPause");
        try{ audio.pause(); }catch(e){}
        return;
      }

      mainBtn.disabled = false;
      vol.disabled = false;

      const playing = !audio.paused && !audio.ended;
      if(playing){
        player.classList.add("isPlaying");
        status.textContent = "Playing";
        mainBtn.textContent = "Pause + Mute";
        mainBtn.classList.remove("isPlay");
        mainBtn.classList.add("isPause");
      }else{
        player.classList.remove("isPlaying");
        status.textContent = "Paused";
        mainBtn.textContent = "Play + Unmute";
        mainBtn.classList.add("isPlay");
        mainBtn.classList.remove("isPause");
      }
    }

    function safePlay(){
      return audio.play().catch(function(){
        setUI();
      });
    }

    audio.addEventListener("loadedmetadata", function(){
      if(state.time && isFinite(audio.duration)){
        audio.currentTime = clamp(state.time, 0, Math.max(0, audio.duration - 0.25));
      }
      if(!state.disabled && state.wasPlaying){
        safePlay();
      }
      setUI();
    });

    audio.addEventListener("timeupdate", function(){
      if(audio.duration){
        prog.style.width = ((audio.currentTime / audio.duration) * 100).toFixed(3) + "%";
      }
      state.time = audio.currentTime || 0;
      saveState(state);
    });

    audio.addEventListener("ended", function(){
      // Next track
      state.trackIndex = (state.trackIndex + 1) % PLAYLIST.length;
      state.time = 0;
      saveState(state);
      setAudioSource(audio, state.trackIndex);
      setCredit(credit, state.trackIndex);
      if(!state.disabled){
        safePlay();
      }
      setUI();
    });

    audio.addEventListener("play", function(){
      state.wasPlaying = true;
      saveState(state);
      setUI();
    });

    audio.addEventListener("pause", function(){
      state.wasPlaying = false;
      saveState(state);
      setUI();
    });

    mainBtn.addEventListener("click", function(){
      if(state.disabled) return;

      if(audio.paused){
        audio.muted = false;
        safePlay();
      }else{
        audio.pause();
        audio.muted = true;
      }
      setUI();
    });

    disableBtn.addEventListener("click", function(){
      state.disabled = !state.disabled;
      if(state.disabled){
        audio.pause();
        audio.muted = true;
      }
      saveState(state);
      setUI();
    });

    vol.addEventListener("input", function(){
      const v = clamp(parseFloat(vol.value), 0, 1);
      audio.volume = v;
      state.volume = v;
      saveState(state);
    });

    progWrap.addEventListener("click", function(ev){
      if(!audio.duration) return;
      const rect = progWrap.getBoundingClientRect();
      const x = clamp(ev.clientX - rect.left, 0, rect.width);
      audio.currentTime = (x / rect.width) * audio.duration;
      state.time = audio.currentTime;
      saveState(state);
    });

    window.IJNEB = window.IJNEB || {};
    window.IJNEB.pauseSiteAudio = function(){
      try{ audio.pause(); setUI(); }catch(e){}
    };

    setUI();
  }

  if(document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
