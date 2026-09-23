/**
 * mertid.gs
 *
 * To endringer i alle timelistene:
 *   1. Kolonne E heter naa "Fravaer" (ikke "Borte")
 *   2. Ny kolonne F: "Mertid"
 *
 * Timer regnes etter dette som:
 *   (Slutt - Start) - Fravaer + Mertid
 *
 * Fravaer trekker fra, Mertid legger til.
 *
 * Kolonnene blir:
 *   A Dato | B Ukedag | C Start | D Slutt | E Fravaer | F Mertid |
 *   G Timer | H Kommentar / begrunnelse
 *
 * Scriptet kan kjores flere ganger. Har et ark allerede faatt Mertid,
 * settes bare tallene opp paa nytt - det lages ikke en kolonne til.
 *
 * SLIK BRUKER DU DEN:
 *   1. script.google.com -> samme prosjekt som for
 *   2. Slett alt, lim inn hele denne filen, trykk Lagre
 *   3. Velg "settOpp" i NEDTREKKSMENYEN ved siden av Kjor
 *      (staar det "myFunction" der, skjer ingenting)
 *   4. Trykk Kjor. Godkjenn tilgang hvis den spor.
 *
 * Kjores en gang. Etter det oppdaterer Timer seg av seg selv.
 */

var MAPPE     = "1F9pVf2eC_l7H7TIDAD47D9lUfKCN94uw";

var OVERSKRIFT = 6;   // rad med kolonnenavn
var FORSTE     = 7;   // foerste datarad

var START   = 3;   // C
var SLUTT   = 4;   // D
var FRAVAER = 5;   // E
var MERTID  = 6;   // F  (ny)
var TIMER   = 7;   // G  (flyttet ett hakk)

function settOpp() {
  var filer = timelister();
  var logg = [];

  fjernGamleUtlosere();

  for (var i = 0; i < filer.length; i++) {
    var navn = filer[i].getName();
    try {
      var id = filer[i].getId();
      var ws = SpreadsheetApp.openById(id).getSheets()[0];

      var nytt = leggTilMertid(ws);
      ws.getRange(OVERSKRIFT, FRAVAER).setValue("Fravær");
      var n = regnUt(ws);

      ScriptApp.newTrigger("veddEndring").forSpreadsheet(id).onEdit().create();
      logg.push("OK   " + navn + "  (" + n + " dager" +
                (nytt ? ", ny kolonne" : ", hadde den fra for") + ")");
    } catch (e) {
      logg.push("FEIL " + navn + ": " + e.message);
    }
  }
  varsle(logg.join("\n") +
         "\n\nFravaer trekker fra, Mertid legger til. Timer regnes ut " +
         "paa nytt med en gang noen endrer en av dem.");
}

/**
 * Setter inn Mertid-kolonnen hvis den ikke finnes alt.
 * Returnerer true hvis den ble laget.
 */
function leggTilMertid(ws) {
  if (String(ws.getRange(OVERSKRIFT, MERTID).getValue()).trim() === "Mertid") {
    return false;
  }
  ws.insertColumnAfter(FRAVAER);

  var fra = ws.getRange(OVERSKRIFT, FRAVAER);
  fra.copyTo(ws.getRange(OVERSKRIFT, MERTID), { formatOnly: true });
  ws.setColumnWidth(MERTID, ws.getColumnWidth(FRAVAER));

  var siste = sisteDatarad(ws);
  if (siste >= FORSTE) {
    var n = siste - FORSTE + 1;
    ws.getRange(FORSTE, FRAVAER, n, 1)
      .copyTo(ws.getRange(FORSTE, MERTID, n, 1), { formatOnly: true });
  }
  ws.getRange(OVERSKRIFT, MERTID).setValue("Mertid");
  return true;
}

/** Regner ut hele Timer-kolonnen paa nytt. */
function regnUt(ws) {
  var siste = sisteDatarad(ws);
  if (siste < FORSTE) throw new Error("fant ingen datoer");
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

/** Oppdaterer raden som ble endret. Kjores automatisk. */
function veddEndring(e) {
  if (!e || !e.range) return;
  var kol = e.range.getColumn();
  if (kol < START || kol > MERTID) return;

  var ws = e.range.getSheet();
  if (ws.getIndex() !== 1) return;

  var fra = Math.max(e.range.getRow(), FORSTE);
  var til = e.range.getLastRow();
  for (var r = fra; r <= til; r++) {
    var v = ws.getRange(r, START, 1, MERTID - START + 1).getValues()[0];
    ws.getRange(r, TIMER).setValue(timer(v[0], v[1], v[2], v[3]));
  }
}

/**
 * Timer for en dag. Tom Start eller Slutt gir tom celle.
 * Klokkeslett kan staa som "07.00", "07:00", 7 eller ekte tidsverdi.
 * Slutt for Start regnes som nattevakt.
 */
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
