import csv

ARK = [
 ("Malin",    "182fMopVKF1KhFQO1tpCa1o-mhC-S6NxjMq6qDlUffPw"),
 ("Even",     "19Pu9dAWZ7spfSI7PVRF5Pu_8PqlEZS5XZduH90cTQ2Q"),
 ("Sverre",   "1ZXF5DYFqopG1hnzWnqEjerbpmiZqrPhmWkgCAyrnZ9E"),
 ("Elias",    "10N4kujH29D0SbcUDCPJ0bb9RB675AetX7M5MOTJTaq0"),
 ("Liliane",  "14HzgNDcSWK5JZacWq8MkR4z9lSGoRrhCQg4QkJoGgMo"),
 ("Marlene",  "10dLSuq1XQVb6sjUZbKILUbfTRiIb0oUgRmbm0enqNGo"),
 ("Kristine", "1WWMSQMpNx13qlVx1hCtgGOoxkj2nNO1nE6tOFjwlOLw"),
 ("Glenn",    "1Ce_AEr77en7fnkKQOiiWnVFI_ZZ3BUYzTuwYS9W2RJk"),
 ("Espen",    "17YW_kmqqphjnrKdsN8BmL8u-yO9gic9iOM755EURdgM"),
 ("Ailin",    "1rP9z2AkdgYU90jswUBcV2i3r7J9VyZL_hn9R7QyzANw"),
 ("David",    "1hNqAP5G66PXbL1jyF3iZNDBcs3CK5mDi-UdN5YuUj1c"),
 ("Paul",     "1st_fDfmn4ph9Qd6nFURQAi-gelbVE7C7wW252qyqP-I"),
]
N = len(ARK)
R0, R1 = 30, 229

def L(i):
    s = ""; i += 1
    while i:
        i, r = divmod(i - 1, 26); s = chr(65 + r) + s
    return s

rows = [[] for _ in range(R0)]
def put(r, c, v):
    row = rows[r - 1]
    while len(row) <= c: row.append("")
    row[c] = v

put(1, 0, "DASHBORD  -  TIMER +/-")
put(2, 0, "Minustimer overst. Pluss = timer til gode. Minus = timer som skyldes.")
put(4, 0, "Navn"); put(4, 1, "Timer +/-"); put(4, 2, "Begrunnelse")
put(5, 0, "=SORT(E5:G%d;2;TRUE)" % (4 + N))
put(5 + N, 0, "SUM")
put(5 + N, 1, "=SUM(B5:B%d)" % (4 + N))

for i, (navn, fid) in enumerate(ARK):
    b = 9 + i * 4
    c0, c1, c2 = L(b), L(b + 1), L(b + 2)
    rng = lambda c: "%s%d:%s%d" % (c, R0, c, R1)
    D, T, K = rng(c0), rng(c1), rng(c2)
    avvik = '(%s<>"")*(%s-8)' % (T, T)
    kum   = "MMULT(--(ROW(%s)>=TRANSPOSE(ROW(%s)));%s)" % (D, D, avvik)
    null  = "IFERROR(MAX(FILTER(ROW(%s);%s=0));%d)" % (D, kum, R0 - 1)

    put(R0, b,     '=IMPORTRANGE("%s";"A7:A206")' % fid)
    put(R0, b + 1, '=IMPORTRANGE("%s";"E7:F206")' % fid)

    put(5 + i, 4, navn)
    put(5 + i, 5, '=IFERROR(SUMPRODUCT(%s);"")' % avvik)
    put(5 + i, 6,
        '=IFERROR(TEXTJOIN(CHAR(10);TRUE;ARRAYFORMULA(IF((ROW(%s)>%s)*(%s<>"");'
        'TEXT(%s;"dd.mm")&" "&TEXT(%s;"+0.00;-0.00;0.00")&"t  "&%s;"")));"")'
        % (D, null, K, D, avvik, K))

with open("d3.csv", "w", newline="") as f:
    csv.writer(f).writerows(rows)
