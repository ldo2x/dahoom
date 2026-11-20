import re,sys,glob
# يحذف التكرار داخل الملف وعبر الملفات (المفتاح: الحرف + الجواب) — الملفات السهلة أولًا ثم الصعبة
files=sorted(glob.glob('data/letters-[0-9].js'))+sorted(glob.glob('data/letters-hard-*.js'))
seen=set()
for p in files:
    s=open(p,encoding='utf-8').read(); out=[]; removed=0
    for ln in s.split('\n'):
        m=re.match(r"\s*[LH]\('(.)','(.*?)','(.*?)'\);",ln)
        if m:
            k=(m.group(1),m.group(3).strip())
            if k in seen: removed+=1; continue
            seen.add(k)
        out.append(ln)
    open(p,'w',encoding='utf-8').write('\n'.join(out)); print(p,'removed',removed)
