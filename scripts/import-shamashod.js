// Quick re-import for shamashod restaurant
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

const IMPORT_DIR = path.join(process.env.HOME || '/home/bmbrenov', 'menu', 'bulk-import');
const TRANSLIT = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
function slugify(n){return n.toLowerCase().split('').map(c=>TRANSLIT[c]||c).join('').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'x-'+Date.now().toString(36)}
const EXTS = ['.mp4','.webm','.mov','.m4v','.jpg','.jpeg','.png','.webp','.gif'];

function parse(f){
  const b=path.basename(f),ext=path.extname(b).toLowerCase();
  if(!EXTS.includes(ext))return null;
  const parts=b.slice(0,-ext.length).split('.');
  if(parts.length<4){console.warn('  ⚠️ Skip '+b);return null}
  const order=Number(parts.pop()),cat=parts.pop().trim(),price=Number(parts.pop()),name=parts.join('.').trim();
  if(!name||isNaN(price)||!cat||isNaN(order))return null;
  return{path:f,name,price,cat,order,ext};
}

async function main(){
  const restaurant = await prisma.restaurant.findFirst({ where: { name: { contains: 'shamashod' } } });
  if(!restaurant){
    // Try case-insensitive search
    const all = await prisma.restaurant.findMany();
    const found = all.find(r => r.name.toLowerCase().includes('shamashod'));
    if(!found){console.error('❌ Restaurant "shamashod" not found. Available:',all.map(r=>r.name));process.exit(1)}
    var rest = found;
  } else { var rest = restaurant; }
  
  let langs; try{langs=JSON.parse(rest.languages)}catch{langs=['ru']}
  console.log('🏪 Restaurant: "'+rest.name+'" ('+rest.id+')');
  console.log('🌍 Languages: '+langs.join(', '));

  const files=fs.readdirSync(IMPORT_DIR).map(f=>path.join(IMPORT_DIR,f));
  const items=files.map(parse).filter(Boolean);
  console.log('\n📁 '+items.length+' files\n');

  const cats=[...new Set(items.map(i=>i.cat))];
  const catMap=new Map();
  for(const c of cats){
    const ex=await prisma.category.findFirst({where:{restaurantId:rest.id,translations:{some:{name:c}}}});
    if(ex){catMap.set(c,ex.id);console.log('   ✅ "'+c+'" exists')}
    else{const cr=await prisma.category.create({data:{slug:slugify(c)+'-'+Date.now().toString(36),restaurantId:rest.id,translations:{create:langs.map(l=>({langCode:l,name:c}))}}});catMap.set(c,cr.id);console.log('   ✨ Created "'+c+'"')}
  }

  const dir=path.join(process.cwd(),'public','uploads','videos');
  fs.mkdirSync(dir,{recursive:true});
  console.log('\n🍳 Importing...\n');
  let ok=0;
  for(const it of items){
    try{
      const fn=Date.now()+'-'+randomUUID()+it.ext;
      fs.copyFileSync(it.path,path.join(dir,fn));
      await prisma.menuItem.create({data:{price:it.price,videoUrl:'/uploads/videos/'+fn,order:it.order,active:true,categoryId:catMap.get(it.cat),translations:{create:langs.map(l=>({langCode:l,title:it.name,description:''}))}}});
      ok++;console.log('   ✅ '+it.name+' → '+it.cat);
    }catch(e){console.error('   ❌ '+it.name+' - '+e.message)}
  }
  console.log('\n✅ Done: '+ok+'/'+items.length);
  await prisma.$disconnect();
}
main().catch(e=>{console.error(e);process.exit(1)});
