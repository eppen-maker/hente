/**
 * deltid_dager.gs
 *
 * Kristine jobber 90 prosent. Normaltiden hennes er satt til 7,2 timer
 * (H2), men standarddagene i arket sto fortsatt 07.00-15.00, altsaa 8
 * timer. Da bygget hun opp 0,8 timer overtid hver eneste dag.
 *
 * Dette scriptet setter standarddagene til 07.00-14.12, som er 7 timer
 * og 12 minutter = 7,2 timer, og regner Timer-kolonnen paa nytt.
 *
 * Det rorer BARE dager som fortsatt staar paa standard:
 *   Start 07.00, Slutt 15.00, ingen fravaer, ingen mertid.
 * Dager hun har endret selv, eller fort fravaer eller mertid paa, blir
 * staaende som de er. Scriptet teller opp begge deler i loggen.
 *
 * SLIK BRUKER DU DEN:
 *   1. script.google.com -> samme prosjekt som for
 *   2. Slett alt, lim inn hele denne filen, trykk Lagre
 *   3. Velg "settStandarddag" i NEDTREKKSMENYEN ved siden av Kjor
 *   4. Trykk Kjor
 *   5. Kopier loggen tilbake til meg
 */

var MAPPE = "1F9pVf2eC_l7H7TIDAD47D9lUfKCN94uw";

var ANSATT    = "Kristine";
var NY_SLUTT  = "14.12";      // 7 timer 12 minutter etter 07.00
var GML_START = 7;            // standard start, i timer
var GML_SLUTT = 15;           // standard slutt, i timer

var OVERSKRIFT = 6;
var FORSTE     = 7;
var START      = 3;   // C
var SLUTT      = 4;   // D
var FRAVAER    = 5;   // E
var MERTID     = 6;   // F
var TIMER      = 7;   // G
var NORMALTID  = "H2";

function settStandarddag() {
  var logg = [];
  try {
    var fil = finnTimeliste(ANSATT);
    if (!fil) { varsle("FEIL  fant ingen TIMELISTE " + ANSATT); return; }

    var ws = SpreadsheetApp.openById(fil.getId()).getSheets()[0];
    logg.push("=== " + fil.getName() + " ===");
    logg.push("Normaltid (" + NORMALTID + "): " +
              ws.getRange(NORMALTID).getDisplayValue());
    logg.push("Timer +/- for: " + ws.getRange("D3").getDisplayValue());

    var siste = sisteDatarad(ws);
    if (siste < FORSTE) { varsle("FEIL  fant ingen datoer"); return; }
    var n = siste - FORSTE + 1;

    var omr = ws.getRange(FORSTE, START, n, MERTID - START + 1);
    var v = omr.getValues();

    var endret = 0, rort_ikke = 0, tomme = 0;
    for (var r = 0; r < n; r++) {
      var s = klokke(v[r][0]), sl = klokke(v[r][1]);

      if (s === null || sl === null) { tomme++; continue; }

      var standard = (s === GML_START) && (sl === GML_SLUTT) &&
                     (tall(v[r][2]) === 0) && (tall(v[r][3]) === 0);
      if (!standard) { rort_ikke++; continue; }

      v[r][1] = NY_SLUTT;
      endret++;
    }
    omr.setValues(v);
    SpreadsheetApp.flush();

    logg.push("Standarddager endret til 07.00-" + NY_SLUTT + ": " + endret);
    logg.push("Dager latt i fred (endret av henne selv): " + rort_ikke);
    logg.push("Tomme dager (helg og lignende): " + tomme);

    var antall = regnUt(ws);
    logg.push("Timer regnet ut paa nytt for " + antall + " dager");
    logg.push("Timer +/- etter: " + ws.getRange("D3").getDisplayValue());

    ws.getRange("A4").setValue(
      "Standard 07.00-" + NY_SLUTT + " (90 %). Endre kun dagene som " +
      "avviker. Skriv begrunnelse i siste kolonne.");
    logg.push("Teksten i A4 oppdatert");

  } catch (e) {
    logg.push("FEIL  " + e.message);
  }
  varsle(logg.join("\n"));
}

/** Regner ut hele Timer-kolonnen paa nytt. */
function regnUt(ws) {
  var siste = sisteDatarad(ws);
  var n = siste - FORSTE + 1;
  var inn = ws.getRange(FORSTE, START, n, MERTID - START + 1).getValues();
  var ut = [];
  for (var r = 0; r < n; r++) {
    ut.push([timer(inn[r][0], inn[r][1], inn[r][2], inn[r][3])]);
  }
  ws.getRange(FORSTE, TIMER, n, 1).setValues(ut);
  SpreadsheetApp.flush();
  return n;
}

function timer(start, slutt, fravaer, mertid) {
  var a = klokke(start), b = klokke(slutt);
  if (a === null || b === null) return "";
  var t = b - a;
  if (t < 0) t += 24;
  t -= tall(fravaer);
  t += tall(mertid);
  return Math.round(t * 100) / 100;
}

function klokke(v) {
  if (v === "" || v === null || v === undefined) return null;
  if (Object.prototype.toString.call(v) === "[object Date]") {
    return v.getHours() + v.getMinutes() / 60;
  }
  if (typeof v === "number") return v < 1 ? v * 24 : v;
  var m = String(v).match(/^\s*(\d{1,2})\s*[.:,]?\s*(\d{0,2})\s*$/);
  if (!m) return null;
  return Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0);
}

function tall(v) {
  if (typeof v === "number") return v;
  var n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function finnTimeliste(navn) {
  var filer = DriveApp.getFolderById(MAPPE).getFilesByType(MimeType.GOOGLE_SHEETS);
  while (filer.hasNext()) {
    var f = filer.next();
    if (f.getName() === "TIMELISTE " + navn) return f;
  }
  return null;
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
