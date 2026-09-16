# Dashbordet slik det faktisk ble levert

Apps Script-varianten i mappa over ble aldri kjørt. Det som ligger i Drive nå
er bygget uten script, fordi Drive-koblingen kan opprette filer, men ikke
skrive i celler i filer som allerede finnes.

Det er to filer i Drive, og de henger sammen:

1. **DATA dashbord - ikke slett** (`1VErZlMx4Acyp4ONm7d83ILqpmcugIzGAcgrnUfMUVlQ`)
   Laget fra CSV av `lag_datablad.py`. Henter A7:F206 fra hver timeliste med
   IMPORTRANGE og regner ut saldo og relevant begrunnelse. All logikk ligger
   her. Ingen formatering.

2. **DASHBORD Peter** (`1qbJhlQodZmEKkauf-rv-KtkbhLUGIn3chyIalFxjzLw`)
   Laget fra .xlsx av `lag_dashbord_xlsx.py`. Ren fasade: en IMPORTRANGE mot
   A5:C17 i databladet, pluss farger, rammer og betinget formatering.

Delingen i to er ikke pynt. Et .xlsx må lastes opp som base64 limt inn for
hånd i verktøykallet, og over ~5 KB blir det korrupt. Ved å flytte alle
formlene til CSV-arket havner .xlsx-en på ~3,3 KB, som går gjennom.

## Kumulativ saldo uten hjelpekolonne

Begrunnelser etter siste nullpunkt krever en løpende saldo. En hjelpekolonne
som fyller 200 rader kan ikke brukes: CSV-import lager et rutenett på nøyaktig
så mange rader som fila har linjer, og en ARRAYFORMULA som skal utvide seg
forbi den grensen gir `#REF!`. Løsningen er MMULT mot en trekantmatrise, som
gir hele den kumulative summen inne i én celle:

    MMULT(--(ROW(D)>=TRANSPOSE(ROW(D))), (T<>"")*(T-8))

## Ved endringer

Legge til eller fjerne en ansatt betyr at begge filene må lages på nytt —
antall rader og kolonneplasseringen endrer seg. Rediger `ARK` i
`lag_datablad.py`, kjør begge scriptene, last opp CSV-en først og pek så
`SRC` i `lag_dashbord_xlsx.py` mot den nye fil-ID-en.
