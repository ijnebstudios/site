(function(){
  function ready(fn){
    if(document.readyState !== 'loading'){ fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  }

  ready(function(){
    var player = document.getElementById('sitePlayer');
    if(!player) return;

    var controls = player.querySelector('.playerControls') || player;

    var credit = document.createElement('span');
    credit.className = 'trackCredit';
    credit.innerHTML = 'MINDSHANK – Funky 2 (feat Danny Brickwell, Max Shred & Ace Blaze) — <a href="https://www.bandlab.com/bands/mindshank" target="_blank" rel="noopener">BandLab</a>';

    var volume = player.querySelector('input[type="range"]');
    if(volume && volume.parentNode){
      volume.parentNode.insertBefore(credit, volume);
    } else {
      controls.appendChild(credit);
    }
  });
})();