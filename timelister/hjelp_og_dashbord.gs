/**
 * hjelp_og_dashbord.gs
 *
 * Kirurgisk paabygg paa de gjenopprettede timelistene. Den rorer IKKE
 * synlig innhold eller formatering i arkene:
 *
 *   1. legger inn tre skjulte hjelpekolonner (G, H, I) i hver timeliste
 *      G = avvik pr dag, H = lopende saldo, I1/I2 = "relevant" begrunnelse
 *      (bare tekst etter siste gang saldoen var nullet ut)
 *   2. gjor D3 ("Timer +/-") gronn ved plusstimer og rod ved minustimer
 *   3. bygger dashbordet paa nytt slik at det peker paa DISSE arkene,
 *      sortert med minustimer overst
 *
 * SLIK BRUKER DU DEN:
 *   1. script.google.com -> Nytt prosjekt
 *   2. Slett alt, lim inn hele denne filen
 *   3. Velg "kjorAlt" oeverst og trykk Kjor
 *   4. Foerste gang: godkjenn tilgang (Avansert -> Gaa til prosjekt -> Tillat)
 *   5. Aapne dashbordet og trykk "Tillat tilgang" paa hver rute som ber om det
 *
 * Kan kjores paa nytt saa mange ganger du vil.
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
  ["David",    "1hNqAP5G66PXbL1jyF3iZNDBcs3CK5mDi-UdN5YuUj1c"]
];

var DASHBORD   = "1CxZU5XEgyiUotfwbZEWUlsB3ISAse9D2L-KtkLxJ32M";
var NORMALTID  = 8;
var FORSTE     = 7;     // foerste datarad i timelistene
var SALDO      = "D3";  // "Timer +/-" i dagens oppsett

var NAVY = "#1f3864";
var HEAD = "#2e5c8a";
var SOFT = "#edf2f8";
var GRON = "#d6f0dd";
var GRONT = "#0b6b32";
var ROD  = "#fadbd8";
var RODT = "#a32218";

function kjorAlt() {
  var logg = [];
  for (var i = 0; i < ARK.length; i++) {
    try {
      byggHjelp(ARK[i][1]);
      logg.push("OK   " + ARK[i][0]);
    } catch (e) {
      logg.push("FEIL " + ARK[i][0] + ": " + e.message);
    }
  }
  try {
    byggDashbord();
    logg.push("OK   dashbord");
  } catch (e) {
    logg.push("FEIL dashbord: " + e.message);
  }
  varsle(logg.join("\n"));
}

/* ---------- timelistene ---------- */

function byggHjelp(id) {
  var ws = SpreadsheetApp.openById(id).getSheets()[0];
  var siste = sisteDatarad(ws);
  if (siste < FORSTE) throw new Error("fant ingen datoer");

  var n = siste - FORSTE + 1;

  // G: avvik pr dag. Tom E (helg/fri) teller som null avvik.
  ws.getRange("G" + FORSTE).setFormula(
    '=ARRAYFORMULA(IF(A' + FORSTE + ":A" + siste + '="","",' +
    "IF(E" + FORSTE + ":E" + siste + '="",0,E' + FORSTE + ":E" + siste +
    "-" + NORMALTID + ")))");

  // H: lopende saldo. H6 = 0 som startpunkt.
  ws.getRange("H" + (FORSTE - 1)).setValue(0);
  var h = [];
  for (var r = 0; r < n; r++) {
    h.push(["=H" + (FORSTE + r - 1) + "+N(G" + (FORSTE + r) + ")"]);
  }
  ws.getRange(FORSTE, 8, n, 1).setFormulas(h);

  // I1: siste rad der saldoen var nullet ut. I2: begrunnelser etter den.
  ws.getRange("I1").setFormula(
    "=IFERROR(MAX(FILTER(ROW(H" + FORSTE + ":H" + siste + ")," +
    "H" + FORSTE + ":H" + siste + "=0))," + (FORSTE - 1) + ")");
  ws.getRange("I2").setFormula(
    '=TEXTJOIN(CHAR(10),TRUE,ARRAYFORMULA(IF((ROW(A' + FORSTE + ":A" + siste +
    ")>$I$1)*(F" + FORSTE + ":F" + siste + '<>""),' +
    'TEXT(A' + FORSTE + ":A" + siste + ',"dd.mm")&" "&' +
    'TEXT(G' + FORSTE + ":G" + siste + ',"+0.00;-0.00;0.00")&"t  "&' +
    "F" + FORSTE + ":F" + siste + ',"")))');

  ws.hideColumns(7, 3);
  fargD3(ws);
  SpreadsheetApp.flush();
}

function sisteDatarad(ws) {
  var verdier = ws.getRange(FORSTE, 1, ws.getMaxRows() - FORSTE + 1, 1).getValues();
  for (var i = verdier.length - 1; i >= 0; i--) {
    if (verdier[i][0] !== "" && verdier[i][0] !== null) return FORSTE + i;
  }
  return FORSTE - 1;
}

/** Gronn ved plusstimer, rod ved minustimer. Rorer ingen andre regler. */
function fargD3(ws) {
  var omr = [ws.getRange(SALDO)];
  var regler = ws.getConditionalFormatRules().filter(function (r) {
    return r.getRanges().every(function (o) {
      return o.getA1Notation() !== SALDO;
    });
  });
  regler.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setBackground(GRON).setFontColor(GRONT).setBold(true)
    .setRanges(omr).build());
  regler.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0)
    .setBackground(ROD).setFontColor(RODT).setBold(true)
    .setRanges(omr).build());
  ws.setConditionalFormatRules(regler);
}

/* ---------- dashbordet ---------- */

function byggDashbord() {
  var ss = SpreadsheetApp.openById(DASHBORD);
  var ws = ss.getSheets()[0];
  ws.clear();
  ws.clearConditionalFormatRules();
  ws.setName("Dashbord");

  ws.getRange("A1:C1").merge().setValue("DASHBORD  -  TIMER +/-")
    .setBackground(NAVY).setFontColor("#ffffff").setFontSize(16)
    .setFontWeight("bold").setHorizontalAlignment("center");
  ws.getRange("A2:C2").merge()
    .setValue("Minustimer overst. Gronn = timer til gode, rod = timer som skyldes.")
    .setBackground(SOFT).setFontColor(NAVY).setHorizontalAlignment("center");

  ws.getRange("A4:C4").setValues([["Navn", "Timer +/-", "Begrunnelse"]])
    .setBackground(HEAD).setFontColor("#ffffff").setFontWeight("bold");

  // Skjult hjelpeblokk i F:H, en rad pr person.
  var hjelp = [];
  for (var i = 0; i < ARK.length; i++) {
    var navn = ARK[i][0];
    var id = ARK[i][1];
    var arknavn = SpreadsheetApp.openById(id).getSheets()[0].getName();
    hjelp.push([
      navn,
      '=IFERROR(N(IMPORTRANGE("' + id + '","' + arknavn + '!' + SALDO + '")),"")',
      '=IFERROR(IMPORTRANGE("' + id + '","' + arknavn + '!I2"),"")'
    ]);
  }
  ws.getRange(5, 6, hjelp.length, 3).setValues(hjelp);

  var n = ARK.length;
  ws.getRange("A5").setFormula("=SORT(F5:H" + (4 + n) + ",2,TRUE)");

  ws.getRange("A" + (5 + n)).setValue("SUM").setFontWeight("bold");
  ws.getRange("B" + (5 + n)).setFormula("=SUM(B5:B" + (4 + n) + ")")
    .setFontWeight("bold");

  ws.getRange("B5:B" + (5 + n)).setNumberFormat("+0.00;-0.00;0.00")
    .setHorizontalAlignment("center");
  ws.getRange("A5:C" + (5 + n)).setBorder(true, true, true, true, true, true,
    "#c9d3e0", SpreadsheetApp.BorderStyle.SOLID);
  ws.getRange("C5:C" + (4 + n)).setWrap(true).setVerticalAlignment("top");

  var omr = [ws.getRange("B5:B" + (5 + n))];
  ws.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0)
      .setBackground(GRON).setFontColor(GRONT).setBold(true)
      .setRanges(omr).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0)
      .setBackground(ROD).setFontColor(RODT).setBold(true)
      .setRanges(omr).build()
  ]);

  ws.setColumnWidth(1, 150);
  ws.setColumnWidth(2, 110);
  ws.setColumnWidth(3, 520);
  ws.hideColumns(4, 5);
  ws.setFrozenRows(4);
  SpreadsheetApp.flush();
}

function varsle(tekst) {
  Logger.log(tekst);
  try { SpreadsheetApp.getUi().alert(tekst); } catch (e) { /* frittstaaende script */ }
}
