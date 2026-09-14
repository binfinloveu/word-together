const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(()=>{
   role='teacher';view='teacher';const set=sets[0],students=[E.student('Amy',set.words),E.student('Ben',set.words)];
   host={code:'RESULT',set,students:Object.fromEntries(students.map(s=>[s.id,s])),open:true,joinOpen:true,listening:true,challenge:null,
     live:E.makeLive(students,set.words,1,3,'zh-en')};
   host.live.startedAt=Date.now()-30000;host.live.status='playing';const team=host.live.teams[0],sid=students[0].id;
   E.liveAnswer(host.live,sid,team.version,team.question.answer,set.words,host.students);
   E.liveAnswer(host.live,sid,team.version,'wrong',set.words,host.students);
   for(let i=0;i<3;i++)E.liveAnswer(host.live,sid,team.version,team.question.answer,set.words,host.students);
   renderTeacher();
  });
  const downloadEvent=page.waitForEvent('download');await page.locator('[data-action="export-live"]').click();const download=await downloadEvent;
  const csv=fs.readFileSync(await download.path(),'utf8');assert.ok(csv.includes('"Amy","5","4","80%"'));assert.ok(csv.includes('"Ben","0","0",""'));
  await page.screenshot({path:'artifacts/live-results-teacher.png',fullPage:true});
  await page.evaluate(()=>{snapshot=pack(Object.values(host.students)[0]);role='student';view='live';conn={open:true};renderLive();});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('.live-personal .stat strong').allTextContents().then(x=>x.join('|')),'5 題|4 題|80%|4 題');
  assert.equal(await page.locator('.live-results').getByText('學生本場表現 · 僅老師可見').count(),0);
  assert.equal(await page.evaluate(()=>Object.keys(snapshot.live.players).length),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'artifacts/live-results-mobile.png',fullPage:true});
  await page.evaluate(()=>{delete snapshot.live.statsVersion;delete snapshot.live.players;renderLive();});
  assert.ok(await page.getByText('這場使用舊版計分，未記錄累計題數，無法回補。請更新後重新分組開始新場次。').isVisible());
  assert.deepEqual(errors,[]);console.log('PASS Live result totals, CSV, student privacy, mobile layout, and legacy missing-data notice');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
