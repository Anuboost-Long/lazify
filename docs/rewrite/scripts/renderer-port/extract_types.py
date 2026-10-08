import re,sys,os
SRC="/Users/anuboost/Work/lazify/src/main"
DEST="/Users/anuboost/Work/lazify-chain/src/shared/lib"
HEADER="// Types only. The module itself is ported with its feature; until then this\n// keeps the renderer's type imports working without the Node code behind them.\n\n"

def blocks(s):
    out=[]
    for m in re.finditer(r'(/\*\*(?:(?!\*/).)*\*/\s*)?^(export\s+)?(type|interface)\s+(\w+)',s,re.S|re.M):
        start=m.start(); i=m.end()
        if m.group(3)=="interface":
            j=s.index("{",i); depth=0
            for k in range(j,len(s)):
                if s[k]=="{":depth+=1
                elif s[k]=="}":
                    depth-=1
                    if depth==0: end=k+1;break
        else:
            depth=0
            for k in range(i,len(s)):
                c=s[k]
                if c in "{([<":depth+=1
                elif c in "})]>":depth-=1
                elif c==";" and depth==0: end=k+1;break
        text=s[start:end]
        if not m.group(2): text="export "+text.lstrip() if not text.lstrip().startswith("/**") else text.replace("\n"+m.group(3)+" ","\nexport "+m.group(3)+" ",1)
        out.append(text)
    return out

def extract(rel):
    s=open(os.path.join(SRC,rel)).read()
    body="\n\n".join(blocks(s))
    imports=[]
    for m in re.finditer(r'import\s+(type\s+)?\{([^}]*)\}\s+from\s+"(\.[^"]+)";',s):
        names=[n.strip().replace("type ","").split(" as ")[-1].strip() for n in m.group(2).split(",") if n.strip()]
        used=[n for n in names if re.search(r'\b'+re.escape(n)+r'\b',body)]
        if used: imports.append(f'import type {{ {", ".join(used)} }} from "{m.group(3)}";')
    out=HEADER+("\n".join(imports)+"\n\n" if imports else "")+body+"\n"
    dst=os.path.join(DEST,rel)
    os.makedirs(os.path.dirname(dst),exist_ok=True)
    open(dst,"w").write(out)
    print("wrote",dst,len(body.splitlines()),"lines; imports:",[i.split('from ')[1] for i in imports])

for rel in sys.argv[1:]: extract(rel)
