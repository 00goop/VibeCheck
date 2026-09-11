import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
export function createProxy({verifyToken,embed,generate,origin='http://localhost:5174',timeoutMs=10000,trustProxy=false}) {
 const app=express();app.disable('x-powered-by');app.set('trust proxy',trustProxy)
 app.use(cors({origin:origin.split(',').map(x=>x.trim())}));app.use(express.json({limit:'16kb'}))
 app.get('/health',(_req,res)=>res.json({status:'ok'}))
 app.use(rateLimit({windowMs:60000,max:60,standardHeaders:true,legacyHeaders:false}))
 app.use(async(req,res,next)=>{try{const token=req.get('authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token||!(await verifyToken(token)))return res.status(401).json({error:'Valid session required'});next()}catch{res.status(401).json({error:'Valid session required'})}})
 const valid=(s,max,required=true)=>typeof s==='string'&&s.length<=max&&(!required||Boolean(s.trim()))
 app.post('/embed',async(req,res)=>{
   if(!valid(req.body?.text,2000))return res.status(400).json({error:'Text must be 1–2000 characters'})
   const controller=new AbortController();const timer=setTimeout(()=>{controller.abort();if(!res.headersSent)res.status(504).json({error:'Embedding timed out'})},timeoutMs)
   res.on('close',()=>controller.abort())
   try {const embedding=await embed(req.body.text,controller.signal);if(controller.signal.aborted)return
     if(!Array.isArray(embedding)||embedding.length!==768||!embedding.every(Number.isFinite))throw Error('invalid dimensions')
     res.json({embedding})
   }catch{if(!res.headersSent)res.status(502).json({error:'Embedding unavailable'})}finally{clearTimeout(timer)}
 })
 app.post('/icebreaker',async(req,res)=>{
   const {cardA,cardB,personality='default'}=req.body||{}
   if(![cardA,cardB].every(c=>c&&valid(c.name,80)&&valid(c.project,500)&&valid(c.need??'',1000,false)&&valid(c.offer??'',1000,false)))return res.status(400).json({error:'Both cards require bounded text fields'})
   if(!['default','hype','roast','philosopher','investor'].includes(personality))return res.status(400).json({error:'Unknown personality'})
   res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.flushHeaders()
   const controller=new AbortController();const timer=setTimeout(()=>{controller.abort();if(!res.writableEnded){res.write('data: [TIMEOUT]\n\n');res.end()}},timeoutMs)
   res.on('close',()=>{controller.abort();clearTimeout(timer)})
   try {for await(const text of generate(cardA,cardB,personality,controller.signal)){if(controller.signal.aborted)break;res.write(`data: ${JSON.stringify(text)}\n\n`)}
     if(!res.writableEnded)res.write('data: [DONE]\n\n')
   }catch{if(!res.writableEnded)res.write('data: [ERROR]\n\n')}finally{clearTimeout(timer);if(!res.writableEnded)res.end()}
 })
 app.use((err,req,res,next)=>{if(!res.headersSent)res.status(err.status===413?413:400).json({error:'Invalid request'})})
 return app
}
