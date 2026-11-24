const R=require('../js/rubric.js');
const weak=`Hi, my name is Sam and this is a story about my summer. I was very nervous. I went to the thing and it was really big. It was good. I was scared. Then I went home.`;
const strong=`The day the lantern went dark, nobody in the village said a word. Mai gripped the broom until her knuckles whitened. A cold draft crept under the door and the old stairs creaked. "Ask someone else," she whispered. Her knees went to water. "Everyone else said no," the stranger answered. She smelled damp smoke on his grey coat. Then she looked up the mountain. Her broom did not move.`;
const mod={final:{min:60,max:300,rubric:[{id:'hook',weight:2},{id:'telling',weight:2},{id:'sensory',p:{kinds:3},weight:2},{id:'body',p:{need:2},weight:1},{id:'dialogue',p:{need:2},weight:1},{id:'shortlast',p:{max:10},weight:1}],carry:['strongverbs','specific']}};
const a=R.scorePiece(weak,mod,{}), b=R.scorePiece(strong,mod,{});
console.log('weak',a.score,'strong',b.score, b.stars, '|', a.wish);
if(!(b.score>a.score+25)) {console.error('FAIL: no discrimination');process.exit(1)}
// paste-integrity
console.log(R.integrity({pasteBlocked:3,bigJumps:2,typedChars:50,activeMs:20000,focusLosses:7,focusMs:90000},500));
console.log(R.integrity({pasteBlocked:0,bigJumps:0,typedChars:520,activeMs:600000,focusLosses:1,focusMs:5000},480));
console.log('free',R.scoreFree(strong).score,R.scoreFree(weak).score);
console.log('OK');
