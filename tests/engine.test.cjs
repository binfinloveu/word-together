const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js');
const text='apple,蘋果\nbanana,香蕉\nrestaurant,餐廳\nexpensive,昂貴的\ncheap,便宜的\nhungry,飢餓的';
test('Parser supports separators and rejects invalid / duplicate rows',()=>{
  assert.equal(E.parse(text.replace('apple,','apple，').replace('banana,','banana\t')).length,6);
  assert.throws(()=>E.parse(text+'\napple,水果'),/重複/);assert.throws(()=>E.parse('apple,蘋果'),/4～100/);
  assert.throws(()=>E.parse(text+'\nhello'),/第 7 行/);
});
test('Scores are clamped and stale questions never score twice',()=>{
  const words=E.parse(text),s=E.student('Amy',words);
  for(let i=0;i<120;i++){const q=E.question(s,words);const good=i<80;assert.ok(E.answer(s,words,q.id,good?q.answer:'bad answer'));assert.equal(E.answer(s,words,q.id,q.answer),null);}
  assert.equal(s.total,120);assert.equal(s.correct,80);assert.ok(Object.values(s.words).every(w=>w.score>=0&&w.score<=100));
  const stats=E.stats(s);assert.equal(stats.accuracy,80/120*100);assert.equal(stats.progress,stats.mastered/6*100);
});
test('Question answers stay private; types rotate and mistakes recur',()=>{
  const words=E.parse(text),s=E.student('Amy',words),q=E.question(s,words);
  assert.equal(E.publicQuestion(q).answer,undefined);assert.equal(E.question(s,words).id,q.id);
  E.answer(s,words,q.id,'wrong');const id=q.wordId;
  for(let i=0;i<3;i++){const other=E.question(s,words);assert.notEqual(other.wordId,id);E.answer(s,words,other.id,other.answer);}
  const repeat=E.question(s,words);assert.equal(repeat.wordId,id);assert.notEqual(repeat.type,q.type);
  assert.equal(E.publicQuestion(repeat).wordId,undefined);
});
test('Ranking prioritizes mastery and exposes only public fields',()=>{
  const words=E.parse(text),a=E.student('A',words),b=E.student('B',words);
  Object.values(a.words).forEach(w=>w.score=80);Object.values(b.words).forEach(w=>w.score=60);
  a.total=100;a.correct=40;b.total=1000;b.correct=1000;
  const rank=E.rank([b,a]);assert.equal(rank[0].name,'A');assert.deepEqual(Object.keys(rank[0]).sort(),['id','mastery','name','rank']);
});
test('40 students, ten teams: stale simultaneous answers count once; one winner stops everyone',()=>{
  const words=E.parse(text),students=Array.from({length:40},(_,i)=>E.student('Student '+i,words));
  const game=E.makeLive(students,words,10,12,'mixed');assert.equal(game.teams.length,10);
  assert.ok(game.teams.every(t=>t.members.length===4));assert.equal(new Set(game.teams.flatMap(t=>t.members)).size,40);
  game.status='playing';const team=game.teams[0];
  let v=team.version,answer=team.question.answer;assert.ok(E.liveAnswer(game,team.members[0],v,answer,words));
  assert.equal(E.liveAnswer(game,team.members[1],v,answer,words),null);assert.equal(team.score,1);
  assert.ok(E.liveAnswer(game,team.members[2],team.version,'wrong',words));assert.equal(team.score,0);assert.equal(team.resets,1);
  for(let i=0;i<12;i++)E.liveAnswer(game,team.members[i%4],team.version,team.question.answer,words);
  assert.equal(game.winner,team.id);assert.equal(game.status,'finished');
  const other=game.teams[1];assert.equal(E.liveAnswer(game,other.members[0],other.version,other.question.answer,words),null);
});
test('No team accepts outsiders, invalid versions, or pre-start answers',()=>{
  const words=E.parse(text),students=[E.student('A',words),E.student('B',words)],g=E.makeLive(students,words,2,3,'zh-en'),t=g.teams[0];
  assert.equal(E.liveAnswer(g,t.members[0],t.version,t.question.answer,words),null);g.status='playing';
  assert.equal(E.liveAnswer(g,'outsider',t.version,t.question.answer,words),null);
  assert.equal(E.liveAnswer(g,t.members[0],-1,t.question.answer,words),null);
});
