import json, base64, io, sys, subprocess, random
from PIL import Image, ImageDraw, ImageFilter
ud = sys.argv[1]; lib = sys.argv[2]
items = json.loads(subprocess.check_output(['node','-e',f"console.log(JSON.stringify(require('/home/claude/cinelocal/src/main/scanner').scanLibrary({json.dumps(lib)}).items))"]))
def img(w,h,seed):
    r=random.Random(seed); im=Image.new('RGB',(w,h)); d=ImageDraw.Draw(im)
    c1=[r.randint(10,120) for _ in range(3)]; c2=[r.randint(60,230) for _ in range(3)]
    for y in range(h):
        t=y/h; d.line([(0,y),(w,y)],fill=tuple(int(c1[i]+(c2[i]-c1[i])*t) for i in range(3)))
    for _ in range(6):
        x,y,s=r.randint(0,w),r.randint(0,h),r.randint(w//8,w//2)
        d.ellipse((x-s,y-s,x+s,y+s),fill=tuple(r.randint(0,255) for _ in range(3)))
    im=im.filter(ImageFilter.GaussianBlur(w/30))
    b=io.BytesIO(); im.save(b,'JPEG',quality=70); return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode()
G=[['Ciencia ficción','Acción'],['Drama','Suspense'],['Drama','Historia'],['Comedia','Romance'],['Suspense','Drama'],['Terror','Ciencia ficción']]
meta={}
for k,it in enumerate(items):
    m={'tmdbId':1000+k,'title':it['title'],'originalTitle':it['title'],'overview':'Una historia fascinante sobre personajes que se enfrentan a lo desconocido. Con giros inesperados, gran reparto y una fotografía espectacular que no te dejará indiferente.','year':it['year'] or 2010,'runtime':128,'rating':round(6.5+k*0.3,1),'genres':G[k%len(G)],'poster':img(300,450,k),'backdrop':img(1280,720,k+50),'logo':None,'certification':'16','director':'Christopher Nolan','creators':'Vince Gilligan','networks':['AMC'],'cast':[{'name':n,'character':'Personaje','photo':img(96,96,k*10+j)} for j,n in enumerate(['Ana Torres','Luis Gómez','Marta Ruiz','Pedro Sanz'])],'trailer':None}
    if it['type']=='series':
        m['seasons']={str(s):{'name':f'Temporada {s}','overview':'','episodes':{str(e['episode']):{'name':f'Episodio piloto {e["episode"]}','overview':'Walter toma una decisión que cambiará su vida para siempre mientras su familia sospecha.','still':img(320,180,e['episode']+s*7),'runtime':47,'airDate':'2008-01-20'} for e in it['episodes'] if e['season']==s}} for s in it['seasons']}
    meta[it['id']]={'tmdbId':1000+k,'meta':m,'at':9e12,'lang':'es-ES'}
json.dump(meta,open(ud+'/metadata.json','w'))
json.dump({'libraryPath':lib,'tmdbKey':'x','metaLang':'es-ES'},open(ud+'/settings.json','w'))
bb=[i for i in items if i['title']=='Breaking Bad'][0]; mx=[i for i in items if i['title']=='The Matrix'][0]
json.dump({bb['episodes'][0]['path']:{'pos':0,'dur':2800,'watched':True,'at':1},bb['episodes'][1]['path']:{'pos':1300,'dur':2800,'watched':False,'at':2},mx['path']:{'pos':3000,'dur':8100,'watched':False,'at':3}},open(ud+'/progress.json','w'))
print(len(items))
