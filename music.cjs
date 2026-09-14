// Real Web Audio integration, with a local classroom fixture (no signaling needed).
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'chrome'});
  const errors=[];
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4173');
    await page.evaluate(()=>{
      role='teacher';view='teacher';
      const set=sets[0],students=[E.student('Amy',set.words),E.student('Ben',set.words)];
      host={code:'MUSIC1',set,students:Object.fromEntries(students.map(s=>[s.id,s])),open:true,joinOpen:true,listening:true,
        live:E.makeLive(students,set.words,2,3,'mixed'),challenge:null};renderTeacher();
    });
    await page.locator('[data-action="start-live"]').click();
    await page.waitForFunction(()=>liveMusic.getState().running&&liveMusic.samplePeak()>.00001);
    assert.equal(await page.locator('.live-music').isVisible(),true);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#music-volume').fill('50');
    assert.equal(await page.evaluate(()=>liveMusic.getState().volume),.5);
    await page.locator('#music-toggle').click();
    await page.waitForFunction(()=>!liveMusic.getState().running&&liveMusic.getState().voices===0);
    await page.locator('#music-toggle').click();
    await page.waitForFunction(()=>liveMusic.getState().running);
    await page.locator('[data-action="project"]').click();
    assert.ok(await page.evaluate(()=>liveMusic.getState().running));
    await page.evaluate(()=>{host.live.status='finished';renderTeacher();});
    await page.waitForFunction(()=>!liveMusic.getState().running&&liveMusic.getState().voices===0);
    assert.equal(await page.locator('.live-music').isVisible(),false);
    console.log('PASS teacher start produces audio, volume, mute/unmute, projection and finish stop');
    await page.evaluate(()=>{
      const s=Object.values(host.students)[0];snapshot=pack(s);snapshot.live.status='playing';
      host=null;role='student';view='live';conn={open:true};renderLive();
    });
    assert.equal(await page.evaluate(()=>liveMusic.getState().enabled),false);
    await page.locator('#music-toggle').click();
    await page.waitForFunction(()=>liveMusic.getState().running&&liveMusic.samplePeak()>.00001);
    await page.locator('[data-action="student-home"]').click();
    await page.waitForFunction(()=>!liveMusic.getState().running);
    await page.locator('[data-action="live"]').click();
    await page.waitForFunction(()=>liveMusic.getState().running);
    await page.evaluate(()=>{conn.open=false;status('已斷線');});
    await page.waitForFunction(()=>!liveMusic.getState().running);
    assert.deepEqual(errors,[]);
    console.log('PASS student defaults muted, opt-in audio, leave stops, reconnect view resumes, disconnect stops');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
