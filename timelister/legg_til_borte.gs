/**
 * legg_til_borte.gs
 *
 * Gjor alle tolv timelistene like, med en "Borte"-kolonne:
 *
 *   1. setter inn kolonne E med overskriften "Borte" i de arkene som
 *      mangler den (Marlene har den allerede og hoppes over)
 *   2. endrer Timer-formelen slik at den trekker fra det som staar i Borte
 *
 * Den rorer ingenting annet. Formatering, farger og oevrige formler
 * staar som de staar. Kan kjores paa nytt uten aa gjore skade -- arket
 * hoppes over hvis det allerede er i orden.
 *
 * SLIK BRUKER DU DEN:
 *   1. script.google.com -> Nytt prosjekt
 *   2. Slett alt som staar der, lim inn hele denne filen
 *   3. Trykk Lagre (diskettikonet)
 *   4. VIKTIG: i nedtrekksmenyen ved siden av "Kjor" staar det sannsynligvis
 *      "myFunction". Klikk paa den og velg "leggTilBorte" i lista.
 *   5. Trykk Kjor. Foerste gang maa du godkjenne tilgang.
 *      (Avansert -> Gaa til prosjekt -> Tillat)
 *   6. Den bruker et minutt. Loggen skal fylles med "OK <navn>".
 */

var ARK = [
  ["Malin",    "182fMopVKF1KhFQO1tpCa1o-mhC-S6NxjMq6qDlUffPw"],
  ["Even",     "19Pu9dAWZ7spfSI7PVRF5Pu_8PqlEZS5XZduH90cTQ2Q"],
  ["Sverre",   "1ZXF5DYFqopG1hnzWnqEjerbpmiZqrPhmWkgCAyrnZ9E"],
  ["Elias",    "10N4kujH29D0SbcUDCPJ0bb9RB675AetX7M5MOTJTaq0"],
  ["Liliane",  "14HzgNDcSWK5JZacWq8MkR4z9lSGoRrhCQg4QkJoGgMo"],
  ["Marlene",  "10dLSuq1XQVb6sjUZbKILUbfTRiIb0oUgRmbm0enqNGo"],
  ["Kristine", "1WWMSQMpNx13qlVx1hCtgGOoxkj2nNO1nE6tOFjwlOLw"],
  ["Glenn",    "1Ce_AEr77en7fnkKQOiiWnVFI_ZZ3BUYzTuwYS9W2RJk"],
  ["Espen",    "17YW_kmqqphjnrKdsN8BmL8u-yO9gic9iOM755EURdgM"],
  ["Ailin",    "1rP9z2AkdgYU90jswUBcV2i3r7J9VyZL_hn9R7QyzANw"],
  ["David",    "1hNqAP5G66PXbL1jyF3iZNDBcs3CK5mDi-UdN5YuUj1c"],
  ["Paul",     "1st_fDfmn4ph9Qd6nFURQAi-gelbVE7C7wW252qyqP-I"]
];

var HEADER  = 6;   // raden med kolonneoverskriftene
var FORSTE  = 7;   // foerste datarad
var BORTE   = 5;   // kolonne E
var TIMER   = 6;   // kolonne F etter at E er satt inn

function leggTilBorte() {
  var logg = [];
  for (var i = 0; i < ARK.length; i++) {
    try {
      logg.push(fiksEtt(ARK[i][1]) + "  " + ARK[i][0]);
    } catch (e) {
      logg.push("FEIL  " + ARK[i][0] + ": " + e.message);
    }
  }
  varsle(logg.join("\n"));
}

function fiksEtt(id) {
  var ws = SpreadsheetApp.openById(id).getSheets()[0];
  var siste = sisteDatarad(ws);
  if (siste < FORSTE) throw new Error("fant ingen datoer");

  var status = "OK  ";

  if (String(ws.getRange(HEADER, BORTE).getValue()).toLowerCase() !== "borte") {
    ws.insertColumnBefore(BORTE);
    var mal = ws.getRange(HEADER, BORTE + 1);           // Timer-overskriften
    mal.copyTo(ws.getRange(HEADER, BORTE), { formatOnly: true });
    ws.getRange(HEADER, BORTE).setValue("Borte");
    ws.getRange(FORSTE, BORTE + 1, siste - FORSTE + 1, 1)
      .copyTo(ws.getRange(FORSTE, BORTE, siste - FORSTE + 1, 1),
              { formatOnly: true });
    ws.setColumnWidth(BORTE, 70);
    status = "NY  ";
  }

  var n = siste - FORSTE + 1;
  var omr = ws.getRange(FORSTE, TIMER, n, 1);
  var formler = omr.getFormulas();
  var endret = false;

  for (var r = 0; r < n; r++) {
    var f = formler[r][0];
    if (!f) continue;                                   // tom rad, helg
    if (f.indexOf("N(E") !== -1) continue;              // allerede gjort
    formler[r][0] = "=(" + f.slice(1) + ")-N(E" + (FORSTE + r) + ")";
    endret = true;
  }
  if (endret) omr.setFormulas(formler);

  SpreadsheetApp.flush();
  return status;
}

function sisteDatarad(ws) {
  var v = ws.getRange(FORSTE, 1, ws.getMaxRows() - FORSTE + 1, 1).getValues();
  for (var i = v.length - 1; i >= 0; i--) {
    if (v[i][0] !== "" && v[i][0] !== null) return FORSTE + i;
  }
  return FORSTE - 1;
}

function varsle(tekst) {
  Logger.log(tekst);
  try { SpreadsheetApp.getUi().alert(tekst); } catch (e) { /* frittstaaende */ }
}
