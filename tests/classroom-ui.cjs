const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  fs.mkdirSync('artifacts',{recursive:true});const p=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:4173');
  await p.evaluate(()=>{
    role='teacher';view='teacher';const set=sets[0],students=['Amy','Ben','Chris'].map(n=>E.student(n,set.words));
    Object.values(students[0].words).forEach(w=>w.score=100);students[0].total=5;students[0].correct=5;
    Object.values(students[1].words).forEach(w=>w.score=40);students[1].total=4;students[1].correct=2;
    host={code:'UITEST',set,students:Object.fromEntries(students.map(s=>[s.id,s])),open:true,joinOpen:true,listening:true,challenge:null,live:E.makeLive(students,set.words,1,3,'zh-en')};
    students[2].online=false;renderTeacher();
  });
  await p.locator('#roster-status').selectOption('offline');assert.equal(await p.locator('#student-roster tbody tr').count(),1);assert.ok(await p.locator('#student-roster tbody').textContent().then(s=>s.includes('Chris')));
  await p.locator('#roster-status').selectOption('all');await p.locator('#roster-sort').selectOption('mastery');await p.locator('#roster-direction').selectOption('desc');
  assert.equal(await p.locator('#student-roster tbody tr td:first-child').allTextContents().then(a=>a.join(',')),'Amy,Ben,Chris');
  await p.locator('#roster-name').fill('Ben');await p.evaluate(()=>renderTeacher());
  assert.equal(await p.locator('#roster-name').inputValue(),'Ben');assert.equal(await p.locator('#student-roster tbody tr').count(),1);
  await p.locator('#roster-name').fill('missing');assert.ok(await p.getByText('沒有符合條件的學生。').isVisible());await p.locator('#roster-name').fill('');
  const popupEvent=p.waitForEvent('popup');await p.locator('[data-action="project-window"]').click();const popup=await popupEvent;popup.on('pageerror',e=>errors.push(e.message));
  await popup.waitForSelector('.team-card');assert.equal(await p.locator('#student-roster').count(),1);assert.equal(await p.evaluate(()=>projecting),false);
  assert.equal(await popup.locator('#student-roster,[data-action="kick"],[data-action="rename"],[data-action="start-live"]').count(),0);
  await p.locator('[data-action="start-live"]').click();
  await p.evaluate(()=>{const s=Object.values(host.students)[0],t=host.live.teams[0];for(let i=0;i<3;i++)E.liveAnswer(host.live,s.id,t.version,t.question.answer,host.set.words,host.students);renderTeacher();});
  await popup.waitForSelector('.winner-members');
  assert.equal(await popup.locator('.winner-members .badge').allTextContents().then(x=>x.join(',')),await p.locator('.winner-members .badge').allTextContents().then(x=>x.join(',')));
  assert.equal(await popup.getByText('學生本場表現 · 僅老師可見').count(),0);
  await popup.reload();await popup.waitForSelector('.winner-members');
  await popup.screenshot({path:'artifacts/separate-projection.png',fullPage:true});
  await popup.close();const again=p.waitForEvent('popup');await p.locator('[data-action="project-window"]').click();const second=await again;await second.waitForSelector('.winner-members');await second.close();
  await p.evaluate(()=>{snapshot=pack(Object.values(host.students)[0]);role='student';view='live';conn={open:true};renderLive();});
  await p.setViewportSize({width:390,height:844});assert.equal(await p.locator('.winner-members .badge').count(),3);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:'artifacts/winner-members-mobile.png',fullPage:true});
  await p.evaluate(()=>{snapshot.live.status='playing';const s=snapshot.self.id;snapshot.live.teams[0].question={prompt:'蘋果',options:['apple','banana','cheap','hungry'],type:'zh-en'};jumpToLive=true;renderLive();});
  await p.waitForFunction(()=>document.activeElement?.id==='live-question');
  const top=await p.locator('#live-question').evaluate(e=>e.getBoundingClientRect().top);assert.ok(top>=0&&top<80);
  assert.deepEqual(errors,[]);console.log('PASS filters/sorting persist, separate popup sync/reopen/privacy, winner roster, mobile and question scroll/focus');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
