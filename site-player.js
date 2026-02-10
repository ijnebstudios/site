(function(){
  var player = document.getElementById('sitePlayer');
  var audio = document.getElementById('siteAudio');
  var btnMain = document.getElementById('spMain');
  var btnOnOff = document.getElementById('spOnOff');
  var vol = document.getElementById('spVol');
  var status = document.getElementById('spStatus');
  var prog = document.getElementById('spProg');
  var progFill = document.getElementById('spProgFill');

  if(!player || !audio || !btnMain || !btnOnOff || !vol || !status || !prog || !progFill){
    return;
  }

  var KEY_ENABLED = 'ijneb_music_enabled';
  var KEY_VOL = 'ijneb_music_vol';
  var KEY_TIME = 'ijneb_music_time';
  var KEY_WANTS_PLAY = 'ijneb_music_wants_play';

  function getBool(key, fallback){
    try{
      var v = localStorage.getItem(key);
      if(v === null) return fallback;
      return v === '1';
    }catch(e){ return fallback; }
  }
  function setBool(key, val){
    try{ localStorage.setItem(key, val ? '1' : '0'); }catch(e){}
  }
  function getNum(key, fallback){
    try{
      var v = localStorage.getItem(key);
      if(v === null) return fallback;
      var n = parseFloat(v);
      return isFinite(n) ? n : fallback;
    }catch(e){ return fallback; }
  }
  function setNum(key, val){
    try{ localStorage.setItem(key, String(val)); }catch(e){}
  }

  var enabled = getBool(KEY_ENABLED, true);
  var wantsPlay = getBool(KEY_WANTS_PLAY, true);

  // Restore volume and time
  audio.volume = Math.min(1, Math.max(0, getNum(KEY_VOL, 0.35)));
  vol.value = String(audio.volume);

  var t = getNum(KEY_TIME, 0);
  if(t > 0){
    try{ audio.currentTime = t; }catch(e){}
  }

  // We treat "paused" as also "muted" to match your new one-button UX.
  function isPlaying(){
    return !audio.paused && !audio.ended;
  }

  function syncUI(){
    var playing = isPlaying();
    player.setAttribute('data-playing', playing ? '1' : '0');
    player.classList.toggle('isPlaying', playing);
    player.classList.toggle('isPaused', !playing);

    if(!enabled){
      status.textContent = 'Off';
      btnOnOff.textContent = 'Disabled';
      btnMain.textContent = 'Play';
      btnMain.disabled = true;
      return;
    }

    btnMain.disabled = false;
    btnOnOff.textContent = 'Disable';
    status.textContent = playing ? 'On' : 'Paused';
    btnMain.textContent = playing ? 'Pause' : 'Play';
  }

  function pauseSiteAudio(){
    try{
      audio.pause();
      audio.muted = true;
      setBool(KEY_WANTS_PLAY, false);
    }catch(e){}
    syncUI();
  }

  function playSiteAudio(){
    if(!enabled) return;
    audio.muted = false;

    var p = audio.play();
    if(p && typeof p.then === 'function'){
      p.then(function(){
        setBool(KEY_WANTS_PLAY, true);
        syncUI();
      }).catch(function(){
        // Autoplay blocked. Keep it paused but obvious.
        setBool(KEY_WANTS_PLAY, false);
        syncUI();
      });
    }else{
      setBool(KEY_WANTS_PLAY, true);
      syncUI();
    }
  }

  // Main button: Play+Unmute <-> Pause+Mute
  btnMain.addEventListener('click', function(){
    if(!enabled) return;
    if(isPlaying()){
      pauseSiteAudio();
    }else{
      playSiteAudio();
    }
  });

  // Disable button: stops playback and prevents accidental restart
  btnOnOff.addEventListener('click', function(){
    enabled = !enabled;
    setBool(KEY_ENABLED, enabled);

    if(!enabled){
      pauseSiteAudio();
      // keep wantsPlay false
    }else{
      // re-enable, do not force play unless user previously wanted it
      if(getBool(KEY_WANTS_PLAY, false)){
        playSiteAudio();
      }else{
        audio.muted = true;
        syncUI();
      }
    }
    syncUI();
  });

  // Volume
  vol.addEventListener('input', function(){
    var v = Math.min(1, Math.max(0, parseFloat(vol.value)));
    if(!isFinite(v)) v = 0.35;
    audio.volume = v;
    setNum(KEY_VOL, v);
  });

  // Progress bar updates
  function updateProgress(){
    var dur = audio.duration || 0;
    var cur = audio.currentTime || 0;
    var pct = (dur > 0) ? (cur / dur) * 100 : 0;
    progFill.style.width = pct.toFixed(3) + '%';
    prog.setAttribute('aria-valuenow', String(Math.round(pct)));
  }

  audio.addEventListener('timeupdate', function(){
    updateProgress();
    setNum(KEY_TIME, audio.currentTime || 0);
  });
  audio.addEventListener('play', syncUI);
  audio.addEventListener('pause', syncUI);
  audio.addEventListener('ended', function(){
    audio.currentTime = 0;
    setNum(KEY_TIME, 0);
    pauseSiteAudio();
  });

  // Click to seek
  prog.addEventListener('click', function(e){
    var rect = prog.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var pct = Math.min(1, Math.max(0, x / rect.width));
    var dur = audio.duration || 0;
    if(dur > 0){
      audio.currentTime = dur * pct;
      setNum(KEY_TIME, audio.currentTime || 0);
      updateProgress();
    }
  });

  // Keyboard seek (left/right)
  prog.addEventListener('keydown', function(e){
    if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    var step = 5; // seconds
    var cur = audio.currentTime || 0;
    audio.currentTime = Math.max(0, cur + (e.key === 'ArrowRight' ? step : -step));
    setNum(KEY_TIME, audio.currentTime || 0);
    updateProgress();
  });

  // Persist on leave
  window.addEventListener('pagehide', function(){
    setNum(KEY_TIME, audio.currentTime || 0);
    setNum(KEY_VOL, audio.volume || 0.35);
  });

  // Best-effort autostart
  if(enabled){
    if(wantsPlay){
      playSiteAudio();
    }else{
      audio.muted = true;
      syncUI();
    }
  }else{
    audio.muted = true;
    syncUI();
  }

  // Expose small API for other pages (BandLab pause)
  window.IJNEB = window.IJNEB || {};
  window.IJNEB.pauseSiteAudio = pauseSiteAudio;

  // Keep progress moving when paused or loading
  setInterval(updateProgress, 250);
})();