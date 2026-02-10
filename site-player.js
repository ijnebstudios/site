
(function(){
  var audio = document.getElementById('siteAudio');
  var btnToggle = document.getElementById('spToggle');
  var btnMute = document.getElementById('spMute');
  var btnOnOff = document.getElementById('spOnOff');
  var vol = document.getElementById('spVol');
  var status = document.getElementById('spStatus');

  if(!audio || !btnToggle || !btnMute || !btnOnOff || !vol || !status){
    return;
  }

  var KEY_ENABLED = 'ijneb_music_enabled';
  var KEY_VOL = 'ijneb_music_vol';
  var KEY_TIME = 'ijneb_music_time';
  var KEY_PLAYING = 'ijneb_music_playing';

  function getBool(key, defVal){
    var v = localStorage.getItem(key);
    if(v === null || v === undefined){ return defVal; }
    return v === '1';
  }

  function setBool(key, val){
    localStorage.setItem(key, val ? '1' : '0');
  }

  function fmtEnabled(enabled){
    return enabled ? 'On' : 'Off';
  }

  function syncUI(){
    var enabled = getBool(KEY_ENABLED, true);
    var playing = getBool(KEY_PLAYING, true);
    var muted = audio.muted;

    status.textContent = enabled ? (playing ? 'On' : 'Paused') : 'Off';
    btnToggle.textContent = playing ? 'Pause' : 'Play';
    btnMute.textContent = muted ? 'Unmute' : 'Mute';
    btnOnOff.textContent = enabled ? 'Disable' : 'Enable';

    // Disable controls when music is disabled
    btnToggle.disabled = !enabled;
    btnMute.disabled = !enabled;
    vol.disabled = !enabled;
    btnToggle.style.opacity = !enabled ? '0.55' : '1';
    btnMute.style.opacity = !enabled ? '0.55' : '1';
    vol.style.opacity = !enabled ? '0.55' : '1';
  }

  function safePlay(){
    return audio.play().catch(function(){
      // Autoplay likely blocked. Start muted so play is allowed, then user can unmute.
      audio.muted = true;
      setTimeout(function(){
        audio.play().catch(function(){ /* still blocked, user must press play */ });
        syncUI();
      }, 0);
    });
  }

  function pauseSiteAudio(){
    audio.pause();
    setBool(KEY_PLAYING, false);
    syncUI();
  }

  function playSiteAudio(){
    setBool(KEY_PLAYING, true);
    syncUI();
    return safePlay();
  }

  function setEnabled(enabled){
    setBool(KEY_ENABLED, enabled);
    if(!enabled){
      audio.pause();
      setBool(KEY_PLAYING, false);
    }else{
      // If enabling, respect last playing state, default to playing
      var playing = getBool(KEY_PLAYING, true);
      if(playing){
        safePlay();
      }
    }
    syncUI();
  }

  // Restore volume
  var savedVol = localStorage.getItem(KEY_VOL);
  if(savedVol !== null && savedVol !== undefined && savedVol !== ''){
    var n = parseFloat(savedVol);
    if(!Number.isNaN(n)){
      audio.volume = Math.min(1, Math.max(0, n));
    }
  }else{
    audio.volume = 0.35;
  }
  vol.value = String(audio.volume);

  // Restore time
  var savedTime = localStorage.getItem(KEY_TIME);
  if(savedTime){
    var t = parseFloat(savedTime);
    if(!Number.isNaN(t) && t > 0){
      try{ audio.currentTime = t; }catch(e){}
    }
  }

  // Initial enable + play state
  var enabled = getBool(KEY_ENABLED, true);
  var playing = getBool(KEY_PLAYING, true);

  if(!enabled){
    audio.pause();
    setBool(KEY_PLAYING, false);
  }else if(playing){
    safePlay();
  }

  // Controls
  btnToggle.addEventListener('click', function(){
    if(!getBool(KEY_ENABLED, true)){ return; }
    if(audio.paused){
      playSiteAudio();
    }else{
      pauseSiteAudio();
    }
  });

  btnMute.addEventListener('click', function(){
    if(!getBool(KEY_ENABLED, true)){ return; }
    audio.muted = !audio.muted;
    syncUI();
  });

  btnOnOff.addEventListener('click', function(){
    setEnabled(!getBool(KEY_ENABLED, true));
  });

  vol.addEventListener('input', function(){
    if(!getBool(KEY_ENABLED, true)){ return; }
    var v = parseFloat(vol.value);
    if(!Number.isNaN(v)){
      audio.volume = Math.min(1, Math.max(0, v));
      localStorage.setItem(KEY_VOL, String(audio.volume));
    }
  });

  // Persist time while playing
  var tick = setInterval(function(){
    if(!audio.paused && getBool(KEY_ENABLED, true)){
      localStorage.setItem(KEY_TIME, String(audio.currentTime || 0));
    }
  }, 2000);

  window.addEventListener('pagehide', function(){
    try{
      localStorage.setItem(KEY_TIME, String(audio.currentTime || 0));
      localStorage.setItem(KEY_VOL, String(audio.volume || 0.35));
    }catch(e){}
  });

  // Expose small API for other pages (BandLab pause)
  window.IJNEB = window.IJNEB || {};
  window.IJNEB.pauseSiteAudio = pauseSiteAudio;

  syncUI();
})();
