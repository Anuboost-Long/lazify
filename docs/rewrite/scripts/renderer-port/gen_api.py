import json,re,os,shutil,sys
sys.path.insert(0,os.path.dirname(__file__))
from extract_types import blocks
ELEC="/Users/anuboost/Work/lazify/src"
REPO="/Users/anuboost/Work/lazify-chain"
d=json.load(open(os.environ.get("PRELOAD_JSON", os.path.join(os.path.dirname(__file__),"preload.json"))))
SPECIAL={"main/prompts":"src/features/prompts/lib","main/agents":"src/shared/lib/agents","main/command-runner":"src/platform/command-runner",
"main/projects/project-search":"src/shared/lib/projects/project-search","main/pty-runner":"src/platform/terminal",
"main/projects/git-actions":"src/shared/lib/git/git-actions","main/projects/project-git-status":"src/shared/lib/git/project-git-status",
"main/agents/agent-changes":"src/shared/lib/git/agent-changes",
"brain/stack-detection":"src/shared/lib/stack-detection","brain/package-version-matcher":"src/shared/lib/package-version-matcher",
"renderer/shared":"src/shared","renderer":"src"}
def dest(elec_rel):
    best=None
    for k,v in SPECIAL.items():
        if (elec_rel==k or elec_rel.startswith(k+"/")) and (best is None or len(k)>len(best[0])): best=(k,v)
    if best: return best[1]+elec_rel[len(best[0]):]
    if elec_rel.startswith("main/"): return "src/shared/lib/"+elec_rel[5:]
    return None
def resolve(base):
    for c in (base+".ts",base+".tsx",base+"/index.ts"):
        if os.path.exists(c): return c
    return None
DECL=lambda n: re.compile(r'^export\s+(declare\s+)?(type|interface|enum|class|const|function)\s+'+re.escape(n)+r'\b',re.M)
def find(module,name,seen=None):
    seen=seen or set(); f=resolve(module)
    if not f or f in seen: return None
    seen.add(f); s=open(f).read()
    if DECL(name).search(s): return f
    for m in re.finditer(r'export\s+(type\s+)?\{([^}]*)\}\s+from\s+"([^"]+)"',s):
        parts=[x.strip().replace("type ","") for x in m.group(2).split(",") if x.strip()]
        for p in parts:
            orig,alias=(p.split(" as ")+[p])[:2] if " as " in p else (p,p)
            if alias.strip()==name: return find(os.path.normpath(os.path.join(os.path.dirname(f),m.group(3))),orig.strip(),seen)
    for m in re.finditer(r'export\s+(?:type\s+)?\*\s+from\s+"([^"]+)"',s):
        r=find(os.path.normpath(os.path.join(os.path.dirname(f),m.group(1))),name,seen)
        if r: return r
    return None
def is_pure(f):
    return not re.search(r'from "(node:[^"]+|electron|undici|unzipper|node-pty)"',open(f).read())
def ensure(elec_file,name):
    rel=os.path.relpath(elec_file,ELEC)[:-3] if elec_file.endswith(".ts") else os.path.relpath(elec_file,ELEC)[:-4]
    target=dest(rel)
    tfile=os.path.join(REPO,target+(".tsx" if elec_file.endswith(".tsx") else ".ts"))
    if os.path.exists(tfile):
        if DECL(name).search(open(tfile).read()) or re.search(r'export\s+(type\s+)?\{[^}]*\b'+name+r'\b',open(tfile).read()): return target
        src=open(elec_file).read()
        for b in blocks(src):
            if re.search(r'(type|interface)\s+'+name+r'\b',b.split("{")[0].split("=")[0]):
                open(tfile,"a").write("\n"+b+"\n"); print("appended",name,"to",target); return target
        print("!! could not append",name,target); return target
    os.makedirs(os.path.dirname(tfile),exist_ok=True)
    if is_pure(elec_file):
        shutil.copy(elec_file,tfile); print("copied",target)
    else:
        import extract_types
        extract_types.SRC=ELEC; extract_types.DEST=REPO
        s=open(elec_file).read()
        body="\n\n".join(blocks(s))
        imports=[]
        for m in re.finditer(r'import\s+(type\s+)?\{([^}]*)\}\s+from\s+"(\.[^"]+)";',s):
            names=[n.strip().replace("type ","").split(" as ")[-1].strip() for n in m.group(2).split(",") if n.strip()]
            used=[n for n in names if re.search(r'\b'+re.escape(n)+r'\b',body)]
            if used: imports.append(f'import type {{ {", ".join(used)} }} from "{m.group(3)}";')
        open(tfile,"w").write(("\n".join(imports)+"\n\n" if imports else "")+body+"\n"); print("stubbed",target)
    return target
LITERAL={"number":r"^-?\d","string":r"^[\"'`]","boolean":r"^(true|false)$"}
def split_top(text, sep):
    parts=[];depth=0;cur="";i=0
    while i<len(text):
        ch=text[i]
        if ch in "([{<":depth+=1
        elif ch in ")]}" :depth-=1
        elif ch==">" and i>0 and text[i-1]!="=":depth-=1
        if depth==0 and text.startswith(sep,i) and not (sep=="=" and text[i+1:i+2]==">"):
            parts.append(cur);cur="";i+=len(sep);continue
        cur+=ch;i+=1
    parts.append(cur)
    return parts
def param_fix(params):
    fixed=[]
    for p in split_top(params,","):
        p=p.strip()
        if not p: continue
        pieces=split_top(p,"=")
        if len(pieces)==2:
            head,val=pieces[0].strip(),pieces[1].strip()
            name,_,typ=head.partition(":")
            typ=typ.strip() or next((t for t,r in LITERAL.items() if re.match(r,val)),"unknown")
            p=f"{name.strip()}?: {typ}"
        fixed.append(p)
    return ", ".join(fixed)
def split_signature(sig):
    depth=0
    for i,ch in enumerate(sig):
        if ch=="(":depth+=1
        elif ch==")":
            depth-=1
            if depth==0: return sig[1:i], sig[i+1:].strip()[2:].strip()
members=[]
for mem in d["members"]:
    sig=mem["signature"]
    if mem["kind"]=="function":
        params,returns=split_signature(sig)
        sig=f"({param_fix(params)}) => {returns}"
    members.append((mem,sig))
text="\n".join(f'\t{mem["name"]}: {"string" if mem["kind"]=="value" else sig};' for mem,sig in members)
def inline(m):
    elec=os.path.normpath(os.path.join(ELEC,"preload/api",m.group(1)))
    name=m.group(2)
    f=find(elec,name)
    if not f: print("!! inline unresolved",m.group(1),name); return m.group(0)
    t=ensure(f,name); return f'import("{t.replace("src/","@/",1)}").{name}'
text=re.sub(r'import\("([^"]+)"\)\.(\w+)',inline,text)
used={}
for name,info in d["imports"].items():
    if not re.search(r'\b'+re.escape(name)+r'\b',text): continue
    src,original=info["from"],info["original"]
    elec=os.path.normpath(os.path.join(ELEC,"preload/api",src))
    f=find(elec,original)
    if not f: print("!! unresolved",src,original); continue
    t=ensure(f,original).replace("src/","@/",1)
    used.setdefault(t,[]).append(name if name==original else f"{original} as {name}")
lines=[f'import type {{ {", ".join(sorted(set(n)))} }} from "{s}";' for s,n in sorted(used.items())]
open(os.path.join(REPO,"src/platform/lazify-api.ts"),"w").write("\n".join(lines)+"\n\nexport interface LazifyApi {\n"+text+"\n}\n")
print("done")
