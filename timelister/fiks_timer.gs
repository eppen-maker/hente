/**
 * fiks_timer.gs
 *
 * Retter opp Timer-kolonnen i alle tolv timelistene.
 *
 * BAKGRUNN: forrige script pakket den gamle formelen inn som
 * "=(gammel)-N(E7)". Den gamle var en ARRAYFORMULA som fylte hele
 * kolonnen, og naar man trekker fra et enkelttall utenfor
 * ARRAYFORMULA-en kollapser hele uttrykket til én rad. Derfor er
 * bare rad 7 igjen med et tall.
 *
 * Denne setter én ARRAYFORMULA i F7 som regner ut timene fra Start og
 * Slutt og trekker fra det som staar i Borte, og tommer F8:F206 slik at
 * den faar plass til aa fylle seg ut.
 *
 * Start og Slutt taaler baade "07.00", "07:00" og ekte klokkeslett.
 * Tom Start eller Slutt gir tom celle, ikke null.
 *
 * SLIK BRUKER DU DEN:
 *   1. script.google.com -> Nytt prosjekt
 *   2. Slett alt, lim inn hele denne filen, trykk Lagre
 *   3. Velg "fiksTimer" i nedtrekksmenyen ved siden av Kjor
 *   4. Trykk Kjor
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

var FORSTE = 7;   // foerste datarad
var TIMER  = 6;   // kolonne F

function fiksTimer() {
  var logg = [];
  for (var i = 0; i < ARK.length; i++) {
    try {
      logg.push("OK   " + ARK[i][0] + "  (" + fiksEtt(ARK[i][1]) + " rader)");
    } catch (e) {
      logg.push("FEIL " + ARK[i][0] + ": " + e.message);
    }
  }
  varsle(logg.join("\n"));
}

function fiksEtt(id) {
  var ws = SpreadsheetApp.openById(id).getSheets()[0];
  var siste = sisteDatarad(ws);
  if (siste < FORSTE) throw new Error("fant ingen datoer");

  var n = siste - FORSTE + 1;
  ws.getRange(FORSTE, TIMER, n, 1).clearContent();
  ws.getRange(FORSTE, TIMER).setFormula(formel(siste));
  SpreadsheetApp.flush();
  return n;
}

/** Klokkeslett som tekst eller tall -> tid. Tom celle gir tom. */
function tid(kol, siste) {
  var r = kol + FORSTE + ":" + kol + siste;
  return "IF(ISNUMBER(" + r + ")," + r +
         ',IFERROR(TIMEVALUE(SUBSTITUTE(' + r + '&"",".",":")),""))';
}

function formel(siste) {
  var c = "C" + FORSTE + ":C" + siste;
  var d = "D" + FORSTE + ":D" + siste;
  var e = "E" + FORSTE + ":E" + siste;
  return "=ARRAYFORMULA(IF((" + c + '="")+(' + d + '="")>0,"",' +
         "ROUND(MOD(" + tid("D", siste) + "-" + tid("C", siste) +
         ",1)*24-N(" + e + "),2)))";
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
