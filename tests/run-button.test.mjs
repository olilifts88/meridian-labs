import test from 'node:test';import assert from 'node:assert/strict';import {runAction} from '../demo-web/assets/run-button.mjs';
test('a completed button stays complete and repeated clicks view output without rerunning',()=>{
 let runs=0,views=0,state;const action=runAction({run:()=>runs++,view:()=>views++,render:s=>state=s});
 action.activate();assert.equal(runs,1);const ticket=action.begin();action.activate();assert.equal(runs,1);
 action.complete(ticket);for(let i=0;i<3;i++)action.activate();assert.equal(views,3);assert.equal(runs,1);assert.equal(state,'complete');
 action.reset();assert.equal(state,'idle');action.activate();assert.equal(runs,2);
});
test('changing inputs invalidates an in-flight completion instead of restoring a stale green button',()=>{
 let state;const action=runAction({run:()=>{},view:()=>{},render:s=>state=s});const old=action.begin();action.reset();
 assert.equal(action.current(old),false);assert.equal(action.complete(old),false);assert.equal(state,'idle');
 const current=action.begin();assert.equal(action.complete(current),true);assert.equal(state,'complete');
});
test('failed runs return to red; held evidence can be viewed without claiming completion',()=>{
 let state,views=0;const action=runAction({run:()=>{},view:()=>views++,render:s=>state=s});
 action.fail(action.begin());assert.equal(state,'idle');action.held();assert.equal(state,'held');action.activate();assert.equal(views,1);action.reset();assert.equal(state,'idle');
});
