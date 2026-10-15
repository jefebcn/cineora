// I test esercitano il vero codice TypeScript dei servizi, sostituendo SOLO
// integrazioni esterne (NestJS DI, PostgreSQL/Prisma, TMDB HTTP e BullMQ).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const src = path.join(__dirname, '..', 'apps', 'api', 'src', 'catalog');

const passthrough = () => (...args) => args[0];
class TestHttpError extends Error { constructor(message, status=500) { super(message); this.status=status; } }
const common = {
  Injectable: passthrough, Controller: passthrough, Get: passthrough, Post: passthrough,
  Headers: passthrough, Param: passthrough, Query: passthrough, Body: passthrough,
  Logger: class { error(){} warn(){} log(){} },
  NotFoundException: class extends TestHttpError { constructor(message){super(message,404);} },
  ServiceUnavailableException: class extends TestHttpError { constructor(message){super(message,503);} },
  HttpException: TestHttpError,
  HttpStatus: { SERVICE_UNAVAILABLE:503, UNAUTHORIZED:401, BAD_REQUEST:400 },
};
function transpile(file) {
  return ts.transpileModule(fs.readFileSync(file,'utf8'), {
    fileName:file,
    compilerOptions: { target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS,
      experimentalDecorators:true, emitDecoratorMetadata:true, esModuleInterop:true }
  }).outputText;
}
const moduleCache = new Map();
function load(name) {
  const file = path.join(src, `${name}.ts`);
  if (moduleCache.has(file)) return moduleCache.get(file).exports;
  const mod = new Module(file, module);
  mod.filename=file;
  moduleCache.set(file,mod);
  mod.require = (id) => {
    if (id === '@nestjs/common') return common;
    if (id === '@nestjs/bullmq') return { InjectQueue:passthrough };
    if (id === 'bullmq') return { Queue:class{}, Job:class{} };
    if (id === '../database/prisma.service') return { PrismaService:class {} };
    if (id.startsWith('./')) return load(path.basename(id));
    return require(id);
  };
  mod._compile(transpile(file),file);
  return mod.exports;
}

class MemoryDb {
  constructor(){
    this.titles=[]; this.genres=[]; this.titleGenres=[]; this.seasonRows=[];
    this.episodeRows=[]; this.runs=[]; this.deletions=0; this.sourceRows=[];
    this.title = {
      findUniqueOrThrow:async ({where:{type_tmdbId:{type,tmdbId}}}) => {const row=this.titles.find(t=>t.type===type&&t.tmdbId===tmdbId);if(!row)throw Error('Titolo mancante');return row;},
      upsert: async ({where,create,update}) => {
        const {type,tmdbId}=where.type_tmdbId;
        let t=this.titles.find(t=>t.type===type && t.tmdbId===tmdbId);
        if (t) Object.assign(t,update,{updatedAt:new Date()});
        else {t={...create,id:`id-${type}-${tmdbId}`,createdAt:new Date(),updatedAt:new Date()};this.titles.push(t);}
        return t;
      },
      updateMany: async ({where,data}) => {
        const hit=this.titles.filter(t=>t.type===where.type && !where.tmdbId.notIn.includes(t.tmdbId));
        hit.forEach(t=>Object.assign(t,data));
        return {count:hit.length};
      },
      deleteMany: async () => {this.deletions++; throw new Error('La discovery non dovrebbe cancellare titoli');},
      findMany: async ({where,orderBy,take}={})=>{
        let matches=this.titles.filter(t => !where?.type || t.type===where.type);
        if (orderBy?.updatedAt==='asc') matches=matches.sort((a,b)=>a.updatedAt-b.updatedAt);
        if (orderBy?.popularity==='desc') matches=matches.sort((a,b)=>b.popularity-a.popularity);
        return matches.slice(0,take||Infinity);
      },
    };
    this.genre={
      upsert: async ({where,create,update})=>{let g=this.genres.find(g=>g.id===where.id);if(g)Object.assign(g,update);else this.genres.push({...create});},
      findMany: async ({where})=>this.genres.filter(g=>where.id.in.includes(g.id)).map(g=>({id:g.id})),
    };
    this.titleGenre={
      deleteMany: async ({where})=>{this.titleGenres=this.titleGenres.filter(g=>g.titleId!==where.titleId);},
      createMany: async ({data})=>{this.titleGenres.push(...data);},
    };
    this.sourceObservation={upsert:async({where,create,update})=>{let row=this.sourceRows.find(r=>r.sourceUrl===where.sourceUrl); if(row)Object.assign(row,update);else this.sourceRows.push({...create}); return row||create;}};
    this.syncRun={
      create: async ({data})=>{const r={id:`run-${this.runs.length+1}`,...data};this.runs.push(r);return r;},
      update: async ({where,data})=>{const r=this.runs.find(r=>r.id===where.id);Object.assign(r,data);return r;},
    };
    this.season={
      upsert: async ({where,create,update})=>{let s=this.seasonRows.find(s=>s.titleId===where.titleId_seasonNumber.titleId&&s.seasonNumber===where.titleId_seasonNumber.seasonNumber);if(s)Object.assign(s,update);else{ s={id:`season-${this.seasonRows.length+1}`,...create};this.seasonRows.push(s); }return s;},
    };
    this.episode={
      upsert: async ({where,create,update})=>{let e=this.episodeRows.find(e=>e.seasonId===where.seasonId_episodeNumber.seasonId&&e.episodeNumber===where.seasonId_episodeNumber.episodeNumber);if(e)Object.assign(e,update);else{e={id:`episode-${this.episodeRows.length+1}`,...create};this.episodeRows.push(e);}return e;},
    };
    this.$transaction=async (operations)=>Promise.all(operations);
  }
}
function dataFeed({badTitle=false}={}) {
  const requests=[];
  const movie={id:10,title:'Luna Blu',genre_ids:[28],popularity:90,release_date:'2026-05-01',poster_path:'/luna.jpg'};
  const tv={id:20,name:'Serie Alba',genre_ids:[18],popularity:50,first_air_date:'2025-11-12'};
  return {requests, get:async (url,{page}={})=>{
    requests.push({url,page});
    if(url==='/genre/movie/list')return{genres:[{id:28,name:'Azione'}]};
    if(url==='/genre/tv/list')return{genres:[{id:18,name:'Dramma'}]};
    if(url==='/trending/movie/week' || url==='/discover/movie')return {results:page===1?[movie,{...movie},...(badTitle?[{id:0,title:'Zero'}]:[])]:[]};
    if(url==='/trending/tv/week' || url==='/discover/tv')return {results:page===1?[tv]:[]};
    if(url==='/movie/10')return{...movie, title:'Luna Blu - aggiornato',genres:[{id:28,name:'Azione'}]};
    if(url==='/tv/20')return{...tv, seasons:[{season_number:0},{season_number:1}], genres:[{id:18,name:'Dramma'}]};
    if(url==='/tv/20/season/1')return {id:912,season_number:1,name:'Stagione 1',episodes:[{episode_number:1,name:'Pilota',runtime:42},{episode_number:2,name:'Secondo episodio',runtime:45}]};
    throw new Error(`Richiesta non prevista: ${url}`);
  }};
}
const { SyncService }=load('sync.service');
const { CatalogService }=load('catalog.service');
const { TmdbService }=load('tmdb.service');
const { AdminController }=load('admin.controller');
const { SchedulerService }=load('scheduler.service');

// Con gli stessi id, piu' giri non devono duplicare titoli/episodi.
test('trending: import reale del servizio, deduplica, classifica e collegamento generi',async()=>{
  const db=new MemoryDb(), tmdb=dataFeed({badTitle:true});
  db.titles.push({id:'old',type:'movie',tmdbId:500,trendRank:8});
  const sync=new SyncService(db,tmdb);
  assert.equal(await sync.run('trending'),2);
  assert.equal(db.titles.length,3);
  assert.equal(db.titles.find(t=>t.tmdbId===500).trendRank,null);
  assert.equal(db.titles.find(t=>t.tmdbId===10).trendRank,1);
  assert.equal(db.titleGenres.length,2);
  assert.equal(db.runs[0].status,'success');
  assert.equal(db.runs[0].processed,2);
  assert.equal(await sync.run('trending'),2);
  assert.equal(db.titles.length,3);
  assert.equal(db.titleGenres.length,2);
});

test('discover: non elimina titoli storici e rimane idempotente',async()=>{
  const db=new MemoryDb(), tmdb=dataFeed();
  db.titles.push({id:'ancient',type:'movie',tmdbId:12345,updatedAt:new Date('2020-01-01')});
  const sync=new SyncService(db,tmdb);
  assert.equal(await sync.run('discover'),2);
  assert.equal(await sync.run('discover'),2);
  assert.equal(db.deletions,0);
  assert.equal(db.titles.length,3);
  assert.ok(db.titles.some(t=>t.tmdbId===12345));
});

test('refresh: aggiorna nome e non duplica record',async()=>{
  const db=new MemoryDb(),tmdb=dataFeed();const sync=new SyncService(db,tmdb);
  await sync.run('discover');
  assert.equal(await sync.run('refresh'),2);
  assert.equal(db.titles.find(t=>t.tmdbId===10).name,'Luna Blu - aggiornato');
  assert.equal(db.titles.length,2);
  assert.equal(db.runs.at(-1).status,'success');
});

test('refresh parziale: registra stato partial e conteggio corretto',async()=>{
  const db=new MemoryDb(),tmdb=dataFeed();const sync=new SyncService(db,tmdb);
  await sync.run('discover');
  const get=tmdb.get.bind(tmdb);
  tmdb.get=async (url,opts)=>{if(url==='/tv/20')throw new Error('HTTP 503');return get(url,opts);};
  assert.equal(await sync.run('refresh'),1);
  assert.equal(db.runs.at(-1).status,'partial');
  assert.equal(db.runs.at(-1).processed,1);
});

test('stagioni: salvataggio episodi ripetibile senza duplicati',async()=>{
  const db=new MemoryDb(),tmdb=dataFeed();const sync=new SyncService(db,tmdb);
  await sync.run('discover');
  assert.equal(await sync.run('seasons'),2);
  assert.equal(await sync.run('seasons'),2);
  assert.equal(db.seasonRows.length,1);
  assert.equal(db.episodeRows.length,2);
  assert.equal(db.episodeRows[0].duration,42);
});

test('TMDB: token mancante blocca le richieste e gli endpoint non ammessi',async()=>{
  const old=process.env.TMDB_READ_ACCESS_TOKEN;
  try {
    delete process.env.TMDB_READ_ACCESS_TOKEN;
    await assert.rejects(new TmdbService().get('/movie/10'),{status:503});
    process.env.TMDB_READ_ACCESS_TOKEN='test-token';
    await assert.rejects(new TmdbService().get('https://evil.test/'),/Endpoint TMDB non previsto/);
  } finally {if(old===undefined)delete process.env.TMDB_READ_ACCESS_TOKEN;else process.env.TMDB_READ_ACCESS_TOKEN=old;}
});

test('TMDB: autenticazione Bearer, lingua italiana, percorsi e query corretti',async()=>{
  const oldToken=process.env.TMDB_READ_ACCESS_TOKEN, oldFetch=global.fetch;
  try {
    process.env.TMDB_READ_ACCESS_TOKEN='test-token';let recorded;
    global.fetch=async (url,options)=>{recorded={url:String(url),options};return{ok:true,json:async()=>({id:10})};};
    assert.deepEqual(await new TmdbService().get('/movie/10',{page:2}),{id:10});
    assert.match(recorded.url,/^https:\/\/api\.themoviedb\.org\/3\/movie\/10\?/);
    assert.match(recorded.url,/language=it-IT/);
    assert.match(recorded.url,/page=2/);
    assert.equal(recorded.options.headers.Authorization,'Bearer test-token');
  } finally {global.fetch=oldFetch;if(oldToken===undefined)delete process.env.TMDB_READ_ACCESS_TOKEN;else process.env.TMDB_READ_ACCESS_TOKEN=oldToken;}
});

test('CatalogService: ordinamento per aggiunta e filtro anno corretti',async()=>{
  let opts;
  const db={title:{findMany:async q=>(opts=q,[]),count:async()=>0}};
  const response=await new CatalogService(db).titles({sort:'added',page:'3',genre:'28',year:'2026'});
  assert.equal(response.page,3);
  assert.deepEqual(opts.orderBy,[{createdAt:'desc'}]);
  assert.equal(opts.skip,40);
  assert.equal(opts.where.genres.some.genreId,28);
  assert.equal(opts.where.releaseDate.gte.toISOString(),'2026-01-01T00:00:00.000Z');
});

test('API admin: respinge chiave assente o sbagliata e accoda job autorizzato',async()=>{
  const old=process.env.ADMIN_SYNC_KEY;
  try {
    process.env.ADMIN_SYNC_KEY='12345678901234567890123456789012';
    const queue={add:async(name)=>({id:'job-1',name})};
    const admin=new AdminController(queue,{syncHistory:async()=>[]});
    await assert.rejects(admin.sync('sbagliata',{kind:'trending'}),{status:401});
    await assert.rejects(admin.sync(process.env.ADMIN_SYNC_KEY,{kind:'unknown'}),{status:400});
    assert.deepEqual(await admin.sync(process.env.ADMIN_SYNC_KEY,{kind:'discover'}),{queued:true,jobId:'job-1',kind:'discover'});
  } finally {if(old===undefined)delete process.env.ADMIN_SYNC_KEY;else process.env.ADMIN_SYNC_KEY=old;}
});

test('new-releases: il servizio importa film e serie e passa i limiti per date',async()=>{
  const db=new MemoryDb(), feed=dataFeed();
  const sync=new SyncService(db,feed);
  const processed=await sync.run('new-releases');
  assert.equal(processed,2);
  assert.deepEqual(db.titles.map(t=>t.name).sort(),['Luna Blu','Serie Alba']);
  assert.ok(feed.requests.some(r=>r.url==='/discover/movie'));
  assert.ok(feed.requests.some(r=>r.url==='/discover/tv'));
  assert.equal(db.runs.at(-1).status,'success');
});

test('source-latest: feed osservato TMDB importato con provenienza, idempotenza e nessun video',async()=>{
  const os=require('node:os');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cineora-sample-'));
  const sample=path.join(dir,'source-latest-enriched.json');
  const seed={source:'streamingcommunityz.shiksha',sourceDatasetType:'verified-present-not-verified-latest', items:[
    {type:'tv',tmdbId:20,sourceUrl:'https://streamingcommunityz.shiksha/it/titles/101-serie-alba',matchStatus:'accepted',sourceObservedAt:'2026-10-15T10:00:00Z'},
    {type:'movie',tmdbId:10,sourceUrl:'https://evil.example/it/titles/1-blocco',matchStatus:'accepted'},
  ]};
  fs.writeFileSync(sample,JSON.stringify(seed));
  const old=process.env.CINEORA_SOURCE_FEED;
  try{
    process.env.CINEORA_SOURCE_FEED=sample;
    const db=new MemoryDb(),feed=dataFeed();const sync=new SyncService(db,feed);
    assert.equal(await sync.run('source-latest'),1);
    assert.equal(await sync.run('source-latest'),1);
    assert.equal(db.sourceRows.length,1);
    assert.equal(db.titles.length,1);
    assert.equal(db.sourceRows[0].datasetType,'verified-present-not-verified-latest');
    assert.equal(db.sourceRows[0].type,'tv');
    assert.ok(!JSON.stringify(db.sourceRows).includes('player'));
  }finally{
    if(old===undefined)delete process.env.CINEORA_SOURCE_FEED;else process.env.CINEORA_SOURCE_FEED=old;
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

test('Scheduler: nessun job senza token e bootstrap quando abilitato',async()=>{
  const oldToken=process.env.TMDB_READ_ACCESS_TOKEN, oldScheduler=process.env.ENABLE_SCHEDULER;
  try {
    let created=0, queued=0;
    const queue={upsertJobScheduler:async()=>{created++;},add:async()=>{queued++;}};
    delete process.env.TMDB_READ_ACCESS_TOKEN;process.env.ENABLE_SCHEDULER='1';
    await new SchedulerService(queue).onModuleInit();
    assert.equal(created,0);assert.equal(queued,0);
    process.env.TMDB_READ_ACCESS_TOKEN='test-token';
    await new SchedulerService(queue).onModuleInit();
    assert.equal(created,5);assert.equal(queued,5);
  } finally {
    for(const [k,v] of [['TMDB_READ_ACCESS_TOKEN',oldToken],['ENABLE_SCHEDULER',oldScheduler]]){
      if(v===undefined)delete process.env[k];else process.env[k]=v;
    }
  }
});

test('trending vuoto: non cancella la classifica esistente',async()=>{
  const db=new MemoryDb(), feed=dataFeed();
  db.titles.push({id:'existing',type:'movie',tmdbId:100,trendRank:1});
  const get=feed.get.bind(feed);
  feed.get=async(url,params)=>url==='/trending/movie/week'?{results:[]}:get(url,params);
  const sync=new SyncService(db,feed);
  await assert.rejects(sync.run('trending'),/Classifica movie vuota/);
  assert.equal(db.titles.find(t=>t.tmdbId===100).trendRank,1);
  assert.equal(db.runs.at(-1).status,'failed');
});

test('HTTP end-to-end simulato: client reale raggiunge le API del servizio catalogo',async()=>{
  const http=require('node:http');
  const file=path.join(__dirname,'..','apps','web','lib','api.ts');
  const clientMod=new Module(file,module);clientMod.filename=file;clientMod._compile(transpile(file),file);
  const client=clientMod.exports;
  const titleId='deafbeef-0000-4000-8000-000000000010';
  const showId='deafbeef-0000-4000-8000-000000000020';
  const movie={id:titleId,tmdbId:10,type:'movie',name:'Luna Blu',overview:'Un film',releaseDate:new Date('2026-05-01'),voteAverage:8,popularity:90,posterPath:'/luna.jpg',backdropPath:'/backdrop.jpg',createdAt:new Date('2026-10-01'),genres:[{genre:{id:28,name:'Azione'}}]};
  const series={...movie,id:showId,tmdbId:20,type:'tv',name:'Serie Alba',popularity:50,posterPath:null,genres:[{genre:{id:18,name:'Dramma'}}]};
  const records=[movie,series];
  const mockDb={
    title:{
      findMany:async(q={})=>{
        let list=records.filter(t=>!q.where?.type||t.type===q.where.type);
        if(q.where?.trendRank?.not===null) list=list.filter(t=>t.trendRank!=null);
        if(q.where?.name?.contains) list=list.filter(t=>t.name.toLowerCase().includes(q.where.name.contains.toLowerCase()));
        if(q.where?.genres?.some?.genreId)list=list.filter(t=>t.genres.some(g=>g.genre.id===q.where.genres.some.genreId));
        if(q.where?.releaseDate?.gte)list=list.filter(t=>t.releaseDate>=q.where.releaseDate.gte&&t.releaseDate<q.where.releaseDate.lt);
        if(q.orderBy?.[0]?.createdAt==='desc')list=list.sort((a,b)=>b.createdAt-a.createdAt);
        return list.slice(q.skip??0,(q.skip??0)+(q.take??100));
      },
      findUnique:async({where})=>records.find(t=>t.id===where.id)??null,
      count:async({where})=>records.filter(t=>!where.type||t.type===where.type).length,
    },
    genre:{findMany:async()=>[{id:28,name:'Azione'},{id:18,name:'Dramma'}]},
    sourceObservation:{findMany:async()=>[]},
    season:{findMany:async()=>[{id:'season-1',seasonNumber:1,episodes:[{id:'ep-1',episodeNumber:1,name:'Pilota'}]}]},
    $queryRaw:async()=>[{value:1}],
  };
  const catalog=new CatalogService(mockDb);
  const server=http.createServer(async(req,res)=>{
    const u=new URL(req.url,'http://localhost');
    const query=Object.fromEntries(u.searchParams);
    let data;
    try{
      if(u.pathname==='/api/home')data=await catalog.home();
      else if(u.pathname==='/api/genres')data=await catalog.genres();
      else if(u.pathname==='/api/titles')data=await catalog.titles(query);
      else if(u.pathname==='/api/search')data=await catalog.search(query);
      else if(u.pathname==='/api/titles/'+titleId)data=await catalog.title(titleId);
      else if(u.pathname==='/api/tv/'+showId+'/seasons')data=await catalog.seasons(showId);
      else if(u.pathname==='/api/health')data=await catalog.health();
      else {res.writeHead(404);res.end('{}');return;}
      res.setHeader('content-type','application/json');res.end(JSON.stringify(data));
    }catch(err){res.writeHead(500);res.end(JSON.stringify({error:err.message}));}
  });
  await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
  const original=process.env.API_URL;
  try {
    process.env.API_URL=`http://127.0.0.1:${server.address().port}`;
    const home=await client.getHome();
    assert.equal(home.featured.name,'Luna Blu');
    assert.equal(home.movies[0].name,'Luna Blu');
    const catalogPage=await client.getCatalog({type:'movie',page:'1'});
    assert.equal(catalogPage.items.length,1);
    assert.equal(catalogPage.total,1);
    assert.equal((await client.searchTitles('luna')).items[0].name,'Luna Blu');
    assert.equal((await client.getTitle(titleId)).id,titleId);
    assert.equal((await client.getSeasons(showId))[0].episodes[0].name,'Pilota');
    assert.deepEqual((await client.getGenres()).map(g=>g.name),['Azione','Dramma']);
    const health=await fetch(process.env.API_URL+'/api/health');
    assert.equal((await health.json()).status,'ok');
  } finally {
    if(original===undefined)delete process.env.API_URL;else process.env.API_URL=original;
    await new Promise(resolve=>server.close(resolve));
  }
});
