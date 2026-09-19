import test from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {createProxy} from '../server/app.js'
test('proxy requires verified sessions, validates fields and enforces embedding contract',async t=>{
 const server=createProxy({verifyToken:async t=>t==='valid',embed:async text=>text==='bad'?[]:Array(768).fill(0),generate:async function*(){yield 'Hello'},timeoutMs:1000}).listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)))
 const call=(path,body,token='valid')=>fetch(`http://127.0.0.1:${server.address().port}${path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)})
 assert.equal((await call('/embed',{text:'hello'},'wrong')).status,401)
 for(const text of ['',{},'x'.repeat(2001)])assert.equal((await call('/embed',{text})).status,400)
 assert.equal((await(await call('/embed',{text:'hello'})).json()).embedding.length,768)
 assert.equal((await call('/embed',{text:'bad'})).status,502)
 assert.equal((await call('/icebreaker',{cardA:{name:'A'},cardB:{name:'B'}})).status,400)
 const result=await call('/icebreaker',{cardA:{name:'A',project:'Music'},cardB:{name:'B',project:'Art'}})
 assert.match(result.headers.get('content-type'),/text\/event-stream/);assert.match(await result.text(),/\[DONE\]/)
})
