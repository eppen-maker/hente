/**
 * timeliste_verktoy.gs
 *
 * Vedlikehold av timelistene. Scriptet finner arkene selv ved aa lete i
 * mappa etter filer som heter "TIMELISTE ...", saa det trenger ingen
 * liste over fil-ID-er og det tar med seg nye kolleger automatisk.
 *
 * FUNKSJONER (velg en av dem i nedtrekksmenyen for du trykker Kjor):
 *
 *   fiksTimer      Setter Timer-formelen i alle timelistene. Regner ut
 *                  timene fra Start og Slutt og trekker fra Borte.
 *
 *   leggTilBorte   Setter inn kolonne E "Borte" i de arkene som mangler
 *                  den. Kjor fiksTimer etterpa.
 *
 *   nyKollega      Lager en ny timeliste til en ny ansatt, som en kopi
 *                  av MAL_ID nedenfor. Skriv navnet i NYTT_NAVN forst.
 *
 * Alle tre kan kjores om igjen uten aa gjore skade.
 */

var MAPPE = "1F9pVf2eC_l7H7TIDAD47D9lUfKCN94uw";
var MAL_ID = "182fMopVKF1KhFQO1tpCa1o-mhC-S6NxjMq6qDlUffPw";  // Malin
var NYTT_NAVN = "";        // f.eks. "Ingrid" - brukes bare av nyKollega

var HEADER = 6;   // raden med kolonneoverskriftene
var FORSTE = 7;   // foerste datarad
var BORTE  = 5;   // kolonne E
var TIMER  = 6;   // kolonne F

/* ---------- finn arkene ---------- */

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

/* ---------- Timer-formelen ---------- */

function fiksTimer() {
  var filer = timelister();
  var logg = [];
  for (var i = 0; i < filer.length; i++) {
    try {
      var ws = SpreadsheetApp.openById(filer[i].getId()).getSheets()[0];
      var siste = sisteDatarad(ws);
      if (siste < FORSTE) throw new Error("fant ingen datoer");
      ws.getRange(FORSTE, TIMER, siste - FORSTE + 1, 1).clearContent();
      logg.push(skrivFormel(ws, siste) + "   " + filer[i].getName());
    } catch (e) {
      logg.push("FEIL " + filer[i].getName() + ": " + e.message);
    }
  }
  varsle(logg.join("\n"));
}

/**
 * Setter formelen og sjekker at arket faktisk godtok den.
 *
 * setFormula sender strengen videre som den staar, og et ark med norsk
 * lokalitet vil ha semikolon mellom argumentene. Vi kan ikke vite hvilken
 * variant arket krever, saa vi prover komma, ser etter i cella, og bytter
 * til semikolon hvis det ble feil.
 */
function skrivFormel(ws, siste) {
  var celle = ws.getRange(FORSTE, TIMER);
  var skilletegn = [",", ";"];
  for (var i = 0; i < skilletegn.length; i++) {
    celle.setFormula(timerFormel(siste, skilletegn[i]));
    SpreadsheetApp.flush();
    if (String(celle.getDisplayValue()).indexOf("#") !== 0) {
      return i === 0 ? "OK  " : "OK  (semikolon)";
    }
  }
  return "FEIL  arket avviste begge skilletegn";
}

/**
 * Klokkeslett kan staa som tekst ("07.00", "07:00") eller som ekte
 * tidsverdi. Begge deler gjores om til timer siden midnatt.
 */
function klokke(kol, siste, s) {
  var r = kol + FORSTE + ":" + kol + siste;
  return "IF(ISNUMBER(" + r + ")" + s + r + "*24" + s +
         "VALUE(LEFT(" + r + s + "2))+VALUE(RIGHT(" + r + s + "2))/60)";
}

function timerFormel(siste, s) {
  s = s || ",";
  var c = "C" + FORSTE + ":C" + siste;
  var d = "D" + FORSTE + ":D" + siste;
  var e = "E" + FORSTE + ":E" + siste;
  return "=ARRAYFORMULA(IF((" + c + '="")+(' + d + '="")>0' + s + '""' + s +
         "ROUND(MOD(" + klokke("D", siste, s) + "-" + klokke("C", siste, s) +
         s + "24)-N(" + e + ")" + s + "2)))";
}

/* ---------- Borte-kolonnen ---------- */

function leggTilBorte() {
  var filer = timelister();
  var logg = [];
  for (var i = 0; i < filer.length; i++) {
    try {
      var ws = SpreadsheetApp.openById(filer[i].getId()).getSheets()[0];
      if (String(ws.getRange(HEADER, BORTE).getValue()).toLowerCase() === "borte") {
        logg.push("hadde den fra for   " + filer[i].getName());
        continue;
      }
      var siste = sisteDatarad(ws);
      ws.insertColumnBefore(BORTE);
      ws.getRange(HEADER, BORTE + 1)
        .copyTo(ws.getRange(HEADER, BORTE), { formatOnly: true });
      ws.getRange(HEADER, BORTE).setValue("Borte");
      ws.getRange(FORSTE, BORTE + 1, siste - FORSTE + 1, 1)
        .copyTo(ws.getRange(FORSTE, BORTE, siste - FORSTE + 1, 1),
                { formatOnly: true });
      ws.setColumnWidth(BORTE, 70);
      SpreadsheetApp.flush();
      logg.push("satt inn            " + filer[i].getName());
    } catch (e) {
      logg.push("FEIL " + filer[i].getName() + ": " + e.message);
    }
  }
  varsle(logg.join("\n") + "\n\nKjor fiksTimer etterpa.");
}

/* ---------- ny ansatt ---------- */

function nyKollega() {
  if (!NYTT_NAVN) {
    varsle("Skriv navnet i NYTT_NAVN oeverst i scriptet forst.");
    return;
  }
  var mappe = DriveApp.getFolderById(MAPPE);
  var navn = "TIMELISTE " + NYTT_NAVN;
  var ny = DriveApp.getFileById(MAL_ID).makeCopy(navn, mappe);
  var ws = SpreadsheetApp.openById(ny.getId()).getSheets()[0];

  var siste = sisteDatarad(ws);
  ws.getRange(FORSTE, 3, siste - FORSTE + 1, 1).clearContent();   // Start
  ws.getRange(FORSTE, 4, siste - FORSTE + 1, 1).clearContent();   // Slutt
  ws.getRange(FORSTE, 5, siste - FORSTE + 1, 1).clearContent();   // Borte
  ws.getRange(FORSTE, 7, siste - FORSTE + 1, 1).clearContent();   // Kommentar
  skrivFormel(ws, siste);

  varsle(navn + " er laget.\n\nFil-ID:\n" + ny.getId() +
         "\n\nGi denne ID-en til Claude, saa kommer personen inn i dashbordet.");
}

/* ---------- felles ---------- */

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
