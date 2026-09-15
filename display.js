'use strict';
// Only public display markup is received. No app.js, classroom storage or host controls.
const displayContent=document.getElementById('display-content'),displayStatus=document.getElementById('display-status');
let lastUpdate=0,lastMarkup='';
window.addEventListener('message',event=>{
  if(!window.opener||event.source!==window.opener||event.origin!==location.origin||event.data?.type!=='wt-projection-state'||typeof event.data.html!=='string')return;
  lastUpdate=Date.now();displayStatus.textContent='與老師同步中';
  if(event.data.html!==lastMarkup){lastMarkup=event.data.html;displayContent.innerHTML=lastMarkup;}
});
document.getElementById('display-fullscreen').addEventListener('click',()=>{
  if(document.fullscreenElement)document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(()=>displayStatus.textContent='請使用瀏覽器的全螢幕功能');
});
function announce(){if(window.opener&&!window.opener.closed)window.opener.postMessage({type:'wt-projection-ready'},location.origin);}
announce();
setInterval(()=>{if(!window.opener||window.opener.closed||Date.now()-lastUpdate>7000){displayStatus.textContent='老師連線中斷 · 畫面暫停更新';announce();}},2000);
