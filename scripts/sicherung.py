# Erzeugt eine lesbare Textsicherung von Janitas Rezepten (Markdown) für Google Drive.
# Mircos Rezepte fehlen bewusst, sie liegen in seinem eigenen Repo.
# Aufruf: python3 scripts/sicherung.py . > sicherung.md
import glob,os,re,sys,datetime
root=sys.argv[1]
items=[]
for f in sorted(glob.glob(os.path.join(root,'src/content/recipes/*/index.md'))):
    s=open(f).read(); fm,body=s.split('---',2)[1:]
    g=lambda k,fm=fm:(re.search(rf'^{k}: (.*)$',fm,re.M) or [None,''])[1].strip()
    if g('book')=='mirco': continue
    items.append((False,g('title'),os.path.basename(os.path.dirname(f)),g,body))
items.sort(key=lambda x:(x[0],x[1].lower()))
out=[f"# Janitas RecipeBook – Sicherung vom {datetime.date.today():%d.%m.%Y}\n","Online: https://janitaberlin.github.io/RecipeBook/ · Fotos und vollständige Historie: github.com/janitaberlin/RecipeBook\n"]
cur=None
for mirco,t,slug,g,body in items:
    sec='Mircos Rezepte' if mirco else 'Janitas Rezepte'
    if sec!=cur: out.append(f"\n# {sec}\n"); cur=sec
    meta=[x for x in [f"Tags: {g('tags').strip('[]')}" if g('tags') else '', f"{g('duration')} Min." if g('duration') else '', f"{g('servings')} {g('servingsLabel') or 'Personen'}", f"Bewertung: {g('rating')}/5" if g('rating') else '', f"Quelle: {g('source')}" if g('source') else ''] if x]
    b=re.sub(r'\{\{(.*?)\}\}',r'\1',body)
    b=re.sub(r'^\s*!\[.*?\]\(.*?\)\s*$\n?','',b,flags=re.M)
    b=re.sub(r'^## ',r'### ',b,flags=re.M)
    out.append(f"\n## {t}\n\n{' · '.join(meta)}  \nLink: https://janitaberlin.github.io/RecipeBook/rezepte/{slug}/\n{b.strip()}\n")
print('\n'.join(out))
