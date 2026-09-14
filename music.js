// Original, locally synthesized Live soundtrack. No audio downloads or services.
(function () {
  'use strict';
  let context,master,analyser,timer=null,active=false,enabled=false,initialized=false,teacherMode=false;
  let volume=.25,nextTime=0,step=0;
  const voices=new Set(),beat=60/116,stepLength=beat/2;
  const melody=[
    72,0,76,79,0,76,74,0, 72,76,79,81,79,0,76,0,
    69,0,72,76,0,72,71,0, 69,72,76,79,76,0,72,0,
    65,0,69,72,0,74,72,0, 69,72,77,76,74,0,72,0,
    67,0,71,74,0,76,74,0, 71,74,79,77,76,74,72,0
  ];
  const chords=[[48,60,64,67],[45,57,60,64],[41,53,57,60],[43,55,59,62]];
  const panel=document.createElement('section');
  panel.className='live-music';panel.hidden=true;panel.setAttribute('aria-label','Live 背景音樂');
  panel.innerHTML='<div><strong>♫ Live 輕快配樂</strong><small id="music-status">準備播放</small></div><button type="button" id="music-toggle" aria-pressed="false">播放音樂</button><label for="music-volume">音量 <output id="music-volume-label">25%</output><input id="music-volume" type="range" min="0" max="100" step="1" value="25"></label>';
  document.body.appendChild(panel);
  const toggle=panel.querySelector('button'),slider=panel.querySelector('input'),label=panel.querySelector('output'),status=panel.querySelector('small');
  function preferenceKey(){return 'wt-live-music-'+(teacherMode?'teacher':'student');}
  function store(){try{localStorage.setItem(preferenceKey(),JSON.stringify({enabled,volume}));}catch{}}
  function update(){
    panel.hidden=!active;toggle.setAttribute('aria-pressed',String(enabled));
    toggle.textContent=enabled&&context?.state==='running'?'🔇 靜音':'♫ 播放音樂';
    status.textContent=!enabled?'已靜音，隨時可以開啟':context?.state==='running'?'輕快節奏 · 116 BPM':'點一下播放，開啟配樂';
    slider.value=String(Math.round(volume*100));label.textContent=Math.round(volume*100)+'%';
  }
  function createContext(){
    if(context)return true;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){status.textContent='瀏覽器不支援音樂播放';return false;}
    context=new Audio();master=context.createGain();master.gain.value=volume*.65;
    analyser=context.createAnalyser();master.connect(analyser);analyser.connect(context.destination);
    context.addEventListener('statechange',update);return true;
  }
  function tone(midi,at,duration,level,type='triangle'){
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type=type;oscillator.frequency.value=440*Math.pow(2,(midi-69)/12);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    oscillator.connect(gain);gain.connect(master);voices.add(oscillator);
    oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
    oscillator.start(at);oscillator.stop(at+duration+.02);
  }
  function schedule(){
    if(!active||!enabled||context.state!=='running')return;
    // A throttled background tab resumes from now rather than emitting a backlog.
    if(nextTime<context.currentTime-.2)nextTime=context.currentTime+.03;
    while(nextTime<context.currentTime+.15){
      const chord=chords[Math.floor(step/16)%4],note=melody[step%melody.length];
      if(note)tone(note,nextTime,stepLength*.85,.22);
      if(step%4===0){tone(chord[0],nextTime,beat*.7,.3,'sine');}
      if(step%4===2)chord.slice(1).forEach(n=>tone(n,nextTime,beat*.35,.065,'sine'));
      if(step%2===1)tone(96,nextTime,.045,.025,'sine');
      step++;nextTime+=stepLength;
    }
  }
  function stop(){
    clearInterval(timer);timer=null;
    if(master&&context)master.gain.setTargetAtTime(0,context.currentTime,.02);
    for(const oscillator of voices){try{oscillator.stop();}catch{}}
    step=0;
  }
  async function start(){
    if(!active||!enabled)return;
    try{
      if(!createContext())return;
      await context.resume();
      if(!active||!enabled)return;
      master.gain.setTargetAtTime(volume*.65,context.currentTime,.04);
      if(!timer){nextTime=context.currentTime+.04;step=0;schedule();timer=setInterval(schedule,25);}
    }catch{status.textContent='無法播放，請點一下再試';}
    update();
  }
  toggle.addEventListener('click',()=>{
    // A blocked autoplay attempt means this button should unlock, not mute.
    enabled=!(enabled&&context?.state==='running');store();
    if(enabled)start();else stop();update();
  });
  slider.addEventListener('input',()=>{
    volume=Number(slider.value)/100;store();
    if(master&&context)master.gain.setTargetAtTime(enabled?volume*.65:0,context.currentTime,.04);
    update();
  });
  window.liveMusic={
    setActive(value,teacher=false){
      if(value&&(!initialized||teacherMode!==teacher)){
        initialized=true;teacherMode=teacher;enabled=teacher;volume=.25;
        try{const saved=JSON.parse(localStorage.getItem(preferenceKey()));if(saved&&typeof saved.enabled==='boolean')enabled=saved.enabled;if(Number.isFinite(saved?.volume))volume=Math.max(0,Math.min(1,saved.volume));}catch{}
      }
      const changed=active!==Boolean(value);active=Boolean(value);
      if(!active){stop();}else if(changed){start();}
      update();
    },
    stop(){active=false;stop();update();},
    getState(){return {active,enabled,volume,running:timer!==null&&context?.state==='running',voices:voices.size};},
    samplePeak(){if(!analyser)return 0;const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);return data.reduce((m,n)=>Math.max(m,Math.abs(n)),0);}
  };
  window.addEventListener('pagehide',()=>window.liveMusic.stop());
})();
