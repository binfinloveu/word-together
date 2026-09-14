(function (root) {
  'use strict';
  const uid = () => globalThis.crypto.randomUUID();
  const shuffle = a => {const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
  const norm = s => String(s).normalize('NFKC').trim().toLowerCase();
  function parse(text) {
    const seen = new Set();
    const words = text.trim().split(/\r?\n/).filter(x=>x.trim()).map((line,i)=>{
      const parts = line.split(/[,，\t]/), en = (parts.shift()||'').trim(), zh = parts.join('，').trim();
      if (!en || !zh || en.length>80 || zh.length>120) throw Error(`第 ${i+1} 行需要英文、中文（每行一組）。`);
      if (seen.has(norm(en))) throw Error(`第 ${i+1} 行英文重複：${en}`);
      seen.add(norm(en)); return {id:uid(),en,zh};
    });
    if(words.length<4 || words.length>100) throw Error('每份單字集請放 4～100 個單字。');
    return words;
  }
  function student(name, words, token=uid()) {
    return {id:uid(),token,name:name.trim().slice(0,24),joinedAt:Date.now(),lastSeen:Date.now(),online:true,kicked:false,
      sequence:0,streak:0,correct:0,total:0,elapsed:0,lastAnswer:0,completedAt:null,pending:null,
      words:Object.fromEntries(words.map(w=>[w.id,{score:0,wrong:0,total:0,due:0,types:[]}]))};
  }
  function stats(s) {
    const words=Object.values(s.words), mastered=words.filter(w=>w.score>=90).length;
    return {mastery:words.reduce((a,w)=>a+w.score,0)/words.length,accuracy:s.total?s.correct/s.total*100:0,
      progress:mastered/words.length*100,mastered,total:words.length};
  }
  function rank(students) {
    return students.filter(s=>!s.kicked).map(s=>({...stats(s),id:s.id,name:s.name,completedAt:s.completedAt,joinedAt:s.joinedAt}))
      .sort((a,b)=>b.mastery-a.mastery||b.accuracy-a.accuracy||b.mastered-a.mastered||(a.completedAt??Infinity)-(b.completedAt??Infinity)||a.joinedAt-b.joinedAt||a.id.localeCompare(b.id))
      .map((s,i)=>({id:s.id,name:s.name,mastery:s.mastery,rank:i+1}));
  }
  function makeQuestion(words, word, type) {
    const q={id:uid(),wordId:word.id,type,english:word.en,prompt:word.zh,options:[],answer:word.en};
    if(type==='tf') {
      const yes=Math.random()>.5, other=shuffle(words.filter(w=>w.zh!==word.zh))[0];
      q.prompt=`${word.en} = ${yes||!other?word.zh:other.zh}`; q.answer=yes||!other?'正確':'錯誤'; q.options=['正確','錯誤'];
    } else if(type!=='spell') {
      const toChinese=type==='en-zh'||type==='listen', key=toChinese?'zh':'en';
      q.prompt=type==='listen'?'聽一聽，選出中文意思':toChinese?word.en:word.zh;
      q.answer=word[key]; const other=shuffle([...new Set(words.map(w=>w[key]))].filter(x=>x!==q.answer)).slice(0,3);
      if(other.length<3) return makeQuestion(words,word,'spell');
      q.options=shuffle([q.answer,...other]);
    }
    return q;
  }
  function question(s, words, listening=true) {
    if(s.pending) return s.pending;
    const due=words.filter(w=>s.words[w.id].due>0&&s.words[w.id].due<=s.sequence);
    let word;
    if(due.length) word=due.sort((a,b)=>s.words[a.id].due-s.words[b.id].due)[0];
    else {
      const pool=words.filter(w=>!s.words[w.id].due||s.words[w.id].due<=s.sequence);
      const choices=pool.length?pool:words;
      const weighted=choices.map(w=>({w,weight:Math.max(5,110-s.words[w.id].score)}));
      let n=Math.random()*weighted.reduce((a,x)=>a+x.weight,0); word=weighted.at(-1).w;
      for(const x of weighted) {n-=x.weight;if(n<0){word=x.w;break;}}
    }
    const enoughChinese=new Set(words.map(w=>w.zh)).size>=4;
    const record=s.words[word.id], types=['zh-en',...(enoughChinese?['en-zh']:[]),'tf','spell',...(listening&&enoughChinese?['listen']:[])];
    let available=types.filter(t=>!record.types.includes(t));
    if(!available.length){const last=record.types.at(-1);record.types=[];available=types.filter(t=>t!==last);}
    s.pending=makeQuestion(words,word,shuffle(available)[0]); return s.pending;
  }
  function publicQuestion(q) {if(!q)return null;const {answer,wordId,english,...safe}=q;return {...safe,...(q.type==='listen'?{english}:{})};}
  function answer(s, words, qid, value, now=Date.now()) {
    const q=s.pending;
    if(!q||q.id!==qid) return null;
    const correct=norm(value)===norm(q.answer), record=s.words[q.wordId];
    record.score=Math.max(0,Math.min(100,record.score+(correct?20:-10)));record.total++;
    if(!correct)record.wrong++;
    record.types.push(q.type);record.due=correct?0:s.sequence+4;
    s.sequence++;s.total++;s.correct+=Number(correct);s.streak=correct?s.streak+1:0;
    if(s.lastAnswer)s.elapsed+=Math.min(60000,Math.max(0,now-s.lastAnswer));
    s.lastAnswer=now;s.pending=null;
    s.completedAt=stats(s).progress===100?(s.completedAt||now):null;
    const word=words.find(w=>w.id===q.wordId);
    return {correct,answer:q.answer,en:word.en,zh:word.zh,score:record.score};
  }
  const teamNames=['🍎 Apple','🍌 Banana','🍊 Orange','🍇 Grape','🥝 Kiwi','🍑 Peach','🍒 Cherry','🍋 Lemon','🥭 Mango','🫐 Berry'];
  function makeLive(students, words, count, target, direction) {
    const list=shuffle(students.filter(s=>s.online&&!s.kicked));
    if(list.length<2)throw Error('至少需要 2 位已連線學生。');
    count=Math.max(1,Math.min(list.length,10,count));
    const game={id:uid(),status:'ready',target,direction,winner:null,teams:Array.from({length:count},(_,i)=>({id:uid(),name:teamNames[i],members:[],score:0,version:0,resets:0}))};
    list.forEach((s,i)=>game.teams[i%count].members.push(s.id));
    game.teams.forEach(t=>nextLive(game,t,words));return game;
  }
  function nextLive(game, team, words) {
    team.version++;
    const type=game.direction==='mixed'?shuffle(['zh-en','en-zh'])[0]:game.direction;
    team.question=makeQuestion(words,shuffle(words)[0],type);
  }
  function liveAnswer(game, sid, version, value, words) {
    if(!game||game.status!=='playing')return null;
    const team=game.teams.find(t=>t.members.includes(sid));
    if(!team||team.version!==version)return null;
    const correct=norm(value)===norm(team.question.answer);
    if(correct)team.score++;else {team.score=0;team.resets++;}
    if(team.score>=game.target){game.status='finished';game.winner=team.id;team.finishedAt=Date.now();}
    nextLive(game,team,words);return {correct,teamId:team.id};
  }
  root.WordEngine={uid,shuffle,norm,parse,student,stats,rank,question,publicQuestion,answer,makeLive,liveAnswer};
  if(typeof module!=='undefined')module.exports=root.WordEngine;
})(globalThis);
