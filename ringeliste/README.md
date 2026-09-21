# Ringeliste (lokal)

Åpne `ringeliste.html` i nettleseren (dobbeltklikk). Alt kjøres lokalt – ingen server, ingen nett.

- Huk av kunder du har ringt (lagres i nettleseren via localStorage)
- Skriv notat/resultat per kunde
- Filtrer på ansvarlig, status og søk; sorter på beløp/dager/navn
- Eksporter CSV med status og notater

## Oppdatere data fra Excel
```
python3 -c "..."   # se generering under
python3 build.py   # bygger ringeliste.html fra template.html + data.json
```
