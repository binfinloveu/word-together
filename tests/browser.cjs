// Optional UI / real WebRTC integration check. Requires Playwright, not a production dependency.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
  fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
  const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
  const contexts=[],errors=[];
  const page=async(mobile=false)=>{const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});contexts.push(c);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4173/');return p;};
  try{
    const teacher=await page();
    await teacher.screenshot({path:'artifacts/home-desktop.png',fullPage:true});
    await teacher.locator('[data-action="new"]').click();
    await teacher.locator('#title').fill('測試班 Unit 1');
    await teacher.locator('#word-input').fill('apple,蘋果\nbanana,香蕉\nrestaurant,餐廳\nexpensive,昂貴的\ncheap,便宜的\nhungry,飢餓的');
    await teacher.locator('[data-action="parse"]').click();
    await teacher.locator('[data-action="word-down"]').first().click();
    await teacher.locator('#editor-form button.primary').click();
    assert.equal(await teacher.locator('.set-card').count(),2);
    await teacher.locator('[data-action="demo"]').click();
    await teacher.locator('[data-action="flashcards"]').click();
    await teacher.locator('[data-action="flip"]').click();
    assert.ok(await teacher.locator('.flash').evaluate(e=>e.classList.contains('flipped')));
    await teacher.locator('[data-action="mark-weak"]').click();
    await teacher.locator('[data-action="student-home"]').click();
    await teacher.locator('[data-action="learn"]').click();
    for(let i=0;i<8;i++){
      const q=await teacher.evaluate(()=>practice.student.pending);
      if(q.type==='spell'){await teacher.locator('#answer').fill(q.answer);await teacher.locator('#answer-form button').click();}
      else await teacher.locator('[data-action="answer"]').filter({hasText:q.answer}).first().click();
      await teacher.locator('[data-action="next-question"]').click();
    }
    assert.equal(await teacher.evaluate(()=>practice.student.total),8);
    await teacher.locator('[data-action="student-home"]').click();
    await teacher.locator('[data-action="leave"]').click();
    console.log('PASS editor, flashcards, eight graded questions and persistence');
    const mobile=await page(true);await mobile.screenshot({path:'artifacts/home-mobile.png',fullPage:true});
    for(const width of [320,390,768,1280]){await mobile.setViewportSize({width,height:900});assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`home overflow at ${width}`);}
    await mobile.setViewportSize({width:390,height:844});await mobile.locator('[data-action="demo"]').click();await mobile.locator('[data-action="learn"]').click();await mobile.screenshot({path:'artifacts/learn-mobile.png',fullPage:true});assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    console.log('PASS responsive home 320/390/768/1280 and mobile learning');
    if(process.env.TEST_WEBRTC!=='1'){assert.deepEqual(errors,[]);return;}
    await teacher.locator('[data-action="host"]').first().click();
    await teacher.waitForFunction(()=>peer?.open,{},{timeout:30000});
    const code=await teacher.evaluate(()=>host.code);console.log('SIGNAL connected, room '+code);
    const alice=await page(true),bob=await page(true);
    for(const [p,name] of [[alice,'Alice'],[bob,'Bob']]){await p.locator('#code').fill(code);await p.locator('#name').fill(name);await p.locator('#join-form button').click();await p.waitForFunction(()=>snapshot?.self?.name,{},{timeout:30000});}
    await teacher.waitForFunction(()=>Object.keys(host.students).length===2);
    console.log('PASS two independent student identities connected via real WebRTC');
    await alice.locator('[data-action="learn"]').click();await alice.waitForFunction(()=>question!==null);
    const q=await teacher.evaluate(()=>Object.values(host.students).find(s=>s.name==='Alice').pending);
    if(q.type==='spell'){await alice.locator('#answer').fill(q.answer);await alice.locator('#answer-form button').click();}else await alice.locator('[data-action="answer"]').filter({hasText:q.answer}).first().click();
    await alice.waitForFunction(()=>snapshot.self.total===1);await bob.waitForFunction(()=>snapshot.board[0].name==='Alice'&&snapshot.board[0].mastery>0);
    console.log('PASS host-graded answer and cross-browser leaderboard');
    await teacher.locator('[data-action="lock"]').click();
    const outsider=await page(true);await outsider.locator('#code').fill(code);await outsider.locator('#name').fill('Outsider');await outsider.locator('#join-form button').click();await outsider.waitForFunction(()=>studentClosed===true);
    assert.equal(await teacher.evaluate(()=>Object.keys(host.students).length),2);
    console.log('PASS locked room rejects new identity');
    await alice.reload();await alice.waitForFunction(()=>snapshot?.self?.total===1);
    assert.equal(await teacher.evaluate(()=>Object.keys(host.students).length),2);
    console.log('PASS student refresh restores original identity and progress');
    await teacher.locator('#group-kind').selectOption('count');await teacher.locator('#groups').fill('2');await teacher.locator('#target').fill('3');await teacher.locator('[data-action="group"]').click();await teacher.locator('[data-action="start-live"]').click();
    await alice.waitForFunction(()=>snapshot.live?.status==='playing'&&view==='live');await bob.waitForFunction(()=>snapshot.live?.status==='playing');
    await teacher.screenshot({path:'artifacts/teacher-live.png',fullPage:true});await alice.screenshot({path:'artifacts/student-live.png',fullPage:true});
    for(let i=0;i<3;i++){
      const answer=await teacher.evaluate(()=>{const s=Object.values(host.students).find(s=>s.name==='Alice');return host.live.teams.find(t=>t.members.includes(s.id)).question.answer;});
      await alice.locator('[data-action="live-answer"]').filter({hasText:answer}).first().click();
      await alice.waitForFunction(score=>snapshot.live.teams.find(t=>t.members.includes(snapshot.self.id)).score===score,i+1);
      await alice.waitForTimeout(350);
    }
    await bob.waitForFunction(()=>snapshot.live.status==='finished');assert.equal(await bob.locator('[data-action="live-answer"]').count(),0);
    await alice.waitForFunction(()=>snapshot.self.total===4&&snapshot.live.players[snapshot.self.id].total===3);
    assert.equal(await alice.locator('.live-results').count(),1);
    assert.equal(await alice.evaluate(()=>Object.keys(snapshot.live.players).length),1);
    assert.equal(await teacher.evaluate(()=>Object.values(host.students).find(s=>s.name==='Alice').correct),4);
    console.log('PASS live groups, synchronized score, winner and all-player stop');
    await teacher.locator('[data-action="project"]').click();await teacher.screenshot({path:'artifacts/projector.png',fullPage:true});await teacher.locator('[data-action="project"]').click();
    await teacher.locator('[data-action="start-challenge"]').click();await teacher.evaluate(()=>{host.challenge.end=Date.now()-1;finishChallenge();});await alice.waitForFunction(()=>snapshot.challenge?.finished&&view==='results');
    console.log('PASS deadline results reach student');
    await teacher.reload();await teacher.locator('[data-action="resume"]').click();
    await teacher.waitForFunction(()=>peer?.open,{},{timeout:30000});
    await alice.waitForFunction(()=>conn?.open&&snapshot?.self?.total===4,{},{timeout:30000});
    await teacher.waitForFunction(()=>Object.values(host.students).filter(s=>s.online).length===2,{},{timeout:30000});
    assert.equal(await teacher.evaluate(()=>Object.keys(host.students).length),2);
    console.log('PASS host reload, saved classroom restore, automatic student reconnect');
    teacher.once('dialog',dialog=>dialog.accept('Alice 新名字'));
    await teacher.locator('tr').filter({hasText:'Alice'}).locator('[data-action="rename"]').click();
    await alice.waitForFunction(()=>snapshot.self.name==='Alice 新名字');
    teacher.once('dialog',dialog=>dialog.accept());
    await teacher.locator('tr').filter({hasText:'Bob'}).locator('[data-action="kick"]').click();
    await bob.waitForFunction(()=>studentClosed===true);
    console.log('PASS teacher rename and kick reach target students');
    assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
