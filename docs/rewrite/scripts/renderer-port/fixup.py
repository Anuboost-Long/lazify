import re,os,glob,subprocess,sys
sys.path.insert(0,os.path.dirname(__file__))
import gen_api as g
from extract_types import blocks
REPO=g.REPO; ELEC=g.ELEC
def types_only(f):
    s=open(f).read()
    if re.search(r'from "(node:[^"]+|electron|undici|unzipper|node-pty)"',s): return False
    for m in re.finditer(r'^import\s+(?!type\b)',s,re.M): return False
    return not re.search(r'^export\s+(async\s+)?(function|class|const|let)\b',s,re.M) or bool(re.fullmatch(r'(?s).*',''))
def stub(elec_file,target):
    s=open(elec_file).read()
    body="\n\n".join(blocks(s))
    imports=[]
    for m in re.finditer(r'import\s+(type\s+)?\{([^}]*)\}\s+from\s+"(\.[^"]+)";',s):
        names=[n.strip().replace("type ","").split(" as ")[-1].strip() for n in m.group(2).split(",") if n.strip()]
        used=[n for n in names if re.search(r'\b'+re.escape(n)+r'\b',body)]
        if used: imports.append(f'import type {{ {", ".join(used)} }} from "{m.group(3)}";')
    open(target,"w").write(("\n".join(imports)+"\n\n" if imports else "")+body+"\n")
g.is_pure=types_only
def map_spec(spec):
    m=re.match(r'^((?:\.\./)+)(main|renderer|brain|preload)/(.+)$',spec) or re.match(r'^@(main)/(.+)$',spec)
    return None
# 1. inline import() rewrites
for f in glob.glob(REPO+"/src/**/*.ts*",recursive=True):
    s=open(f).read(); o=s
    def rw(m):
        t=g.dest("main/"+m.group(2))
        return f'import("{t.replace("src/","@/",1)}")'
    s=re.sub(r'import\("(?:(?:\.\./)+|@)main/([^"]+)"\)',lambda m: f'import("{g.dest("main/"+m.group(1)).replace("src/","@/",1)}")',s)
    if s!=o: open(f,"w").write(s); print("inline rewrite",os.path.relpath(f,REPO))
# 2. restub logic files that were copied
for rel in ["linting/scan/phase-tasks","scaffolding/harmonizer","environment/port-reaper","scaffolding/workflow/types"]:
    elec=g.resolve(os.path.join(ELEC,"main",rel)); target=os.path.join(REPO,"src/shared/lib",rel+".ts")
    if not types_only(elec): stub(elec,target); print("restubbed",rel)
# 3. loop on missing relative modules inside src/shared/lib
for round_ in range(8):
    out=subprocess.run(["npx","tsc","--noEmit","-p","."],cwd=REPO,capture_output=True,text=True).stdout
    missing=re.findall(r'^(src/shared/lib/[^(]+)\(\d+,\d+\): error TS2307: Cannot find module \'(\.[^\']+)\'',out,re.M)
    if not missing: print("no missing modules"); break
    for ours,spec in sorted(set(missing)):
        rel_ours=os.path.relpath(os.path.join(REPO,ours),os.path.join(REPO,"src/shared/lib"))
        elec_from=os.path.join(ELEC,"main",rel_ours)
        elec_target=os.path.normpath(os.path.join(os.path.dirname(elec_from),spec))
        rel_elec=os.path.relpath(elec_target,ELEC)
        mapped=g.dest(rel_elec)
        text=open(os.path.join(REPO,ours)).read()
        names=[]
        for m in re.finditer(r'import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"'+re.escape(spec)+'"',text):
            names+= [n.strip().replace("type ","").split(" as ")[0].strip() for n in m.group(1).split(",") if n.strip()]
        names+=re.findall(r'import\("'+re.escape(spec)+r'"\)\.(\w+)',text)
        for n in set(names):
            f=g.find(elec_target,n)
            if not f: print("!! unresolved",ours,spec,n); continue
            t=g.ensure(f,n)
            newspec=t.replace("src/","@/",1)
            text=text.replace(f'"{spec}"',f'"{newspec}"')
        open(os.path.join(REPO,ours),"w").write(text)
