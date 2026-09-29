import csv
ARK=[("Malin","182fMopVKF1KhFQO1tpCa1o-mhC-S6NxjMq6qDlUffPw"),
("Even","19Pu9dAWZ7spfSI7PVRF5Pu_8PqlEZS5XZduH90cTQ2Q"),
("Sverre","1ZXF5DYFqopG1hnzWnqEjerbpmiZqrPhmWkgCAyrnZ9E"),
("Elias","10N4kujH29D0SbcUDCPJ0bb9RB675AetX7M5MOTJTaq0"),
("Liliane","14HzgNDcSWK5JZacWq8MkR4z9lSGoRrhCQg4QkJoGgMo"),
("Marlene","10dLSuq1XQVb6sjUZbKILUbfTRiIb0oUgRmbm0enqNGo"),
("Kristine","1WWMSQMpNx13qlVx1hCtgGOoxkj2nNO1nE6tOFjwlOLw"),
("Glenn","1Ce_AEr77en7fnkKQOiiWnVFI_ZZ3BUYzTuwYS9W2RJk"),
("Espen","17YW_kmqqphjnrKdsN8BmL8u-yO9gic9iOM755EURdgM"),
("Ailin","1rP9z2AkdgYU90jswUBcV2i3r7J9VyZL_hn9R7QyzANw"),
("David","1hNqAP5G66PXbL1jyF3iZNDBcs3CK5mDi-UdN5YuUj1c"),
("Paul","1st_fDfmn4ph9Qd6nFURQAi-gelbVE7C7wW252qyqP-I"),
("Thomas","1owBzt9UGiocEnMcO6RTLN0MJcBiFSEWfqxX3caF9kJU"),
("Vera","1qDI7U5HA7LLgpMfctLPwIjD8jKZJSFSFbL92xmoWvns")]
N=len(ARK)
rows=[[] for _ in range(210)]
def put(r,c,v):
    row=rows[r-1]
    while len(row)<=c: row.append("")
    row[c]=v

put(1,0,"DASHBORD  -  TIMER +/-")
put(2,0,"Minustimer overst. Pluss = timer til gode. Minus = timer som skyldes.")
put(4,0,"Navn"); put(4,1,"Timer +/-"); put(4,2,"Begrunnelse")
put(5,0,"=SORT(E5:G%d;2;TRUE)"%(4+N))
put(5+N,0,"SUM"); put(5+N,1,"=SUM(B5:B%d)"%(4+N))

for i,(navn,fid) in enumerate(ARK):
    n=10+i*10
    r=5+i
    put(1,n-1,'=IMPORTRANGE("%s";"A7:H206")'%fid)
    put(1,n+7,'=IFERROR(IMPORTRANGE("%s";"H2");8)'%fid)
    put(r,3,n)
    put(r,4,navn)
    t="OFFSET($A$1;0;$D%d+5;200;1)"%r        # Timer
    k="OFFSET($A$1;0;$D%d+6;200;1)"%r        # Kommentar
    d="OFFSET($A$1;0;$D%d-1;200;1)"%r        # Dato
    nt="OFFSET($A$1;0;$D%d+7;1;1)"%r         # Normaltid pr dag
    av='(%s<>"")*(%s-%s)'%(t,t,nt)
    put(r,5,'=IFERROR(SUMPRODUCT(%s);"")'%av)
    put(r,6,'=IFERROR(LET(t;%s;k;%s;d;%s;n;%s;a;ARRAYFORMULA((t<>"")*(t-n));'
            'c;SCAN(0;t;LAMBDA(x;y;x+IF(y="";0;y-n)));'
            'p;IFERROR(XMATCH(1;ARRAYFORMULA((c=0)*(t<>""));0;-1);0);'
            'TEXTJOIN(CHAR(10);TRUE;ARRAYFORMULA(IF((k<>"")*(a<>0)*(SEQUENCE(200)>p);'
            'TEXT(d;"dd.mm")&"  "&k;""))));"")'%(t,k,d,nt))

with open("d12.csv","w",newline="") as f: csv.writer(f).writerows(rows)
