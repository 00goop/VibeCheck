import test from 'node:test'
import assert from 'node:assert/strict'
import {csvCell,vcardText,resolveTheirCard} from '../src/lib/exports.js'
test('CSV protects formula cells, quotes and multiline values',()=>{
 for(const value of ['=1+1','  @SUM(1)','\t=1','-2','+cmd'])assert.ok(csvCell(value).startsWith("'"))
 assert.equal(csvCell('A "quote"'),'A ""quote""');assert.equal(csvCell(null),'')
})
test('vCard prevents injected properties and resolves only participant snapshots',()=>{
 assert.equal(vcardText('Alice\nTEL:123'),'Alice TEL:123')
 const m={card_a:'a',card_b:'b',card_a_snapshot:{name:'A'},card_b_snapshot:{name:'B'}}
 assert.equal(resolveTheirCard(m,'a').name,'B');assert.equal(resolveTheirCard(m,'outsider'),null)
})
