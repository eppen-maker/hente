/**
 * registrering.gs
 *
 * Fyller ut Timer-kolonnen i timelistene, og holder den oppdatert
 * etterpaa.
 *
 * Her er det ingen formler. Formler har feilet fire ganger i dag fordi
 * de ma skrives paa arkets eget sprak, og vi treffer ikke. Scriptet
 * regner derfor ut timene i JavaScript og skriver inn tallet.
 *
 * Det setter ogsaa opp en utloser per timeliste, slik at Timer regnes ut
 * paa nytt med en gang noen endrer Start, Slutt eller Borte. Det skjer av
 * seg selv - ingen trenger aa kjore noe igjen.
 *
 * SLIK BRUKER DU DEN:
 *   1. script.google.com -> samme prosjekt som for
 *   2. Slett alt, lim inn hele denne filen, trykk Lagre
 *   3. Velg "settOpp" i nedtrekksmenyen ved siden av Kjor
 *   4. Trykk Kjor. Godkjenn tilgang hvis den spor.
 *
 * Kjores en gang. Etter det gaar det automatisk.
 */

var MAPPE     = "1F9pVf2eC_l7H7TIDAD47D9lUfKCN94uw";
var NORMALTID = 8;

var FORSTE = 7;   // foerste datarad
var START  = 3;   // C
var SLUTT  = 4;   // D
var BORTE  = 5;   // E
var TIMER  = 6;   // F

function settOpp() {
  var filer = timelister();
  var logg = [];

  fjernGamleUtlosere();

  for (var i = 0; i < filer.length; i++) {
    try {
      var id = filer[i].getId();
      var n = regnUt(SpreadsheetApp.openById(id).getSheets()[0]);
      ScriptApp.newTrigger("veddEndring").forSpreadsheet(id).onEdit().create();
      logg.push("OK   " + filer[i].getName() + "  (" + n + " dager)");
    } catch (e) {
      logg.push("FEIL " + filer[i].getName() + ": " + e.message);
    }
  }
  varsle(logg.join("\n") +
         "\n\nTimer oppdaterer seg naa av seg selv naar noen endrer " +
         "Start, Slutt eller Borte.");
}

/** Regner ut hele Timer-kolonnen paa nytt. */
function regnUt(ws) {
  var siste = sisteDatarad(ws);
  if (siste < FORSTE) throw new Error("fant ingen datoer");
  var n = siste - FORSTE + 1;

  var inn = ws.getRange(FORSTE, START, n, BORTE - START + 1).getValues();
  var ut = [];
  for (var r = 0; r < n; r++) {
    ut.push([timer(inn[r][0], inn[r][1], inn[r][2])]);
  }
  ws.getRange(FORSTE, TIMER, n, 1).setValues(ut);
  SpreadsheetApp.flush();
  return n;
}

/** Oppdaterer raden som ble endret. Kjores automatisk. */
function veddEndring(e) {
  if (!e || !e.range) return;
  var kol = e.range.getColumn();
  if (kol < START || kol > BORTE) return;

  var ws = e.range.getSheet();
  if (ws.getIndex() !== 1) return;

  var fra = Math.max(e.range.getRow(), FORSTE);
  var til = e.range.getLastRow();
  for (var r = fra; r <= til; r++) {
    var v = ws.getRange(r, START, 1, BORTE - START + 1).getValues()[0];
    ws.getRange(r, TIMER).setValue(timer(v[0], v[1], v[2]));
  }
}

/**
 * Timer for en dag. Tom Start eller Slutt gir tom celle.
 * Klokkeslett kan staa som "07.00", "07:00", 7 eller ekte tidsverdi.
 * Slutt for Start regnes som nattevakt.
 */
function timer(start, slutt, borte) {
  var a = klokke(start), b = klokke(slutt);
  if (a === null || b === null) return "";
  var t = b - a;
  if (t < 0) t += 24;
  t -= tall(borte);
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

/* ---------- felles ---------- */

function timelister() {
  var filer = DriveApp.getFolderById(MAPPE).getFilesByType(MimeType.GOOGLE_SHEETS);
  var ut = [];
  while (filer.hasNext()) {
    var f = filer.next();
    if (f.getName().indexOf("TIMELISTE ") === 0) ut.push(f);
  }
  ut.sort(function (a, b) { return a.getName() < b.getName() ? -1 : 1; });
  return ut;
}

function fjernGamleUtlosere() {
  var t = ScriptApp.getProjectTriggers();
  for (var i = 0; i < t.length; i++) {
    if (t[i].getHandlerFunction() === "veddEndring") ScriptApp.deleteTrigger(t[i]);
  }
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
