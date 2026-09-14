// 40 real WebRTC data channels on one test computer; not 40 physical devices.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const tc=await browser.newContext(),sc=await browser.newContext();const t=await tc.newPage(),s=await sc.newPage();
  await t.goto('http://127.0.0.1:4173');await s.goto('http://127.0.0.1:4173');
  await t.locator('[data-action="host"]').first().click();await t.waitForFunction(()=>peer?.open,{},{timeout:30000});const code=await t.evaluate(()=>host.code);
  await s.evaluate(async code=>{
    window.loadClients=[];
    const tasks=Array.from({length:40},(_,i)=>new Promise((resolve,reject)=>{
      const p=new Peer(),client={peer:p,index:i,states:0};window.loadClients.push(client);
      const timer=setTimeout(()=>reject(Error('Client '+i+' timed out')),45000);
      p.on('error',e=>{clearTimeout(timer);reject(Error(i+': '+e.type));});
      p.on('open',()=>{const c=p.connect('word-together-v1-'+code,{reliable:true,serialization:'json'});client.conn=c;
        c.on('open',()=>c.send({type:'join',token:crypto.randomUUID(),name:'同學 '+String(i+1).padStart(2,'0')}));
        c.on('data',m=>{if(m.type==='state'){client.state=m;client.states++;clearTimeout(timer);resolve();}if(m.type==='question')client.question=m.question;if(m.type==='feedback')client.feedback=m.result;});
      });
    }));
    await Promise.all(tasks);
    window.loadPing=setInterval(()=>loadClients.forEach(c=>c.conn.send({type:'ping'})),3000);
  },code);
  await t.waitForFunction(()=>Object.values(host.students).filter(s=>s.online).length===40);
  console.log('PASS 40 real PeerJS / WebRTC student connections');
  await s.evaluate(()=>loadClients.forEach(c=>c.conn.send({type:'question',requestId:crypto.randomUUID()})));
  await s.waitForFunction(()=>loadClients.every(c=>c.question));
  const answers=await t.evaluate(()=>Object.values(host.students).map(s=>({id:s.id,q:s.pending.id,answer:s.pending.answer})));
  const begin=Date.now();
  await s.evaluate(answers=>loadClients.forEach(c=>{const a=answers.find(a=>a.id===c.state.self.id);c.conn.send({type:'answer',requestId:crypto.randomUUID(),questionId:a.q,value:a.answer});}),answers);
  await t.waitForFunction(()=>Object.values(host.students).every(s=>s.total===1));
  await s.waitForFunction(()=>loadClients.every(c=>c.state.self.total===1&&c.state.board.every(r=>r.mastery>0)));
  console.log('PASS 40 simultaneous graded answers and all-student leaderboard propagation in '+(Date.now()-begin)+' ms');
  await t.locator('[data-action="group"]').click();await t.locator('[data-action="start-live"]').click();
  await s.waitForFunction(()=>loadClients.every(c=>c.state.live?.status==='playing'));
  assert.equal(await t.evaluate(()=>host.live.teams.length),10);
  const live=await t.evaluate(()=>host.live.teams.map(team=>({id:team.id,version:team.version,answer:team.question.answer,members:team.members})));
  await s.evaluate(live=>loadClients.forEach(c=>{const team=live.find(t=>t.members.includes(c.state.self.id));c.conn.send({type:'live-answer',requestId:crypto.randomUUID(),version:team.version,value:team.answer});}),live);
  await t.waitForFunction(()=>host.live.teams.every(t=>t.score===1));
  await s.waitForFunction(()=>loadClients.every(c=>c.state.live.teams.every(t=>t.score===1)));
  console.log('PASS ten teams / 40 concurrent same-version submissions count once per team');
  await s.evaluate(()=>{clearInterval(loadPing);loadClients.forEach(c=>c.peer.destroy());});
  console.log('COMPLETE load check');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
