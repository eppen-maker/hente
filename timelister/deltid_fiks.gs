/**
 * deltid_fiks.gs
 *
 * Retter opp forrige kjoring. Den skrev teksten "14.12" inn i Slutt.
 * Google leste det som en dato, ikke som et klokkeslett, og Timer ble
 * feil. Denne skriver et EKTE klokkeslett i stedet: tallet 14,2/24 med
 * tidsformat, som vises som 14:12.
 *
 * Kan kjores flere ganger. Den ser paa hver dag og retter bare de som
 * trenger det:
 *   - Slutt viser "14.12"  (odelagt av forrige kjoring)
 *   - Slutt viser "15.00" eller "15:00"  (aldri konvertert)
 *   - Slutt er en dato som ikke stemmer med dagens egen dato
 * og bare naar Start er 07.00 og det ikke staar fravaer eller mertid.
 *
 * Dager Kristine har fort selv blir ikke rort. Normaltiden (H2 = 7,2)
 * blir ikke rort.
 *
 * SLIK BRUKER DU DEN:
 *   1. script.google.com -> samme prosjekt som for
 *   2. Slett alt, lim inn hele denne filen, trykk Lagre
 *   3. Velg "fiksSlutt" i NEDTREKKSMENYEN ved siden av Kjor
 *   4. Trykk Kjor
 *   5. Kopier loggen tilbake
 */

var MAPPE = "1F9pVf2eC_l7H7TIDAD47D9lUfKCN94uw";

var ANSATT   = "Kristine";
var NY_TIMER = 7.2;           // arbeidsdag i timer, 90 prosent av 8
var STARTKL  = 7;             // standard start, i timer

var FORSTE  = 7;
var DATO    = 1;   // A
var START   = 3;   // C
var SLUTT   = 4;   // D
var FRAVAER = 5;   // E
var MERTID  = 6;   // F
var TIMER   = 7;   // G

function fiksSlutt() {
  var logg = [];
  try {
    var fil = finnTimeliste(ANSATT);
    if (!fil) { varsle("FEIL  fant ingen TIMELISTE " + ANSATT); return; }

    var ws = SpreadsheetApp.openById(fil.getId()).getSheets()[0];
    logg.push("=== " + fil.getName() + " ===");
    logg.push("Normaltid (H2): " + ws.getRange("H2").getDisplayValue());
    logg.push("Timer +/- for:  " + ws.getRange("D3").getDisplayValue());

    var siste = sisteDatarad(ws);
    if (siste < FORSTE) { varsle("FEIL  fant ingen datoer"); return; }
    var n = siste - FORSTE + 1;

    var dato = ws.getRange(FORSTE, DATO, n, 1).getValues();
    var blokk = ws.getRange(FORSTE, START, n, MERTID - START + 1);
    var verdi = blokk.getValues();
    var vist = blokk.getDisplayValues();

    var sluttKol = ws.getRange(FORSTE, SLUTT, n, 1);
    var ut = sluttKol.getValues();

    var nyVerdi = (STARTKL + NY_TIMER) / 24;   // 14,2 timer som brok av et dogn
    var fikset = 0, alt_ok = 0, hoppet = 0, tomme = 0;

    for (var r = 0; r < n; r++) {
      var s = klokke(verdi[r][0]);
      var sl = klokke(verdi[r][1]);

      if (s === null || sl === null) { tomme++; continue; }

      var fri = (tall(verdi[r][2]) === 0) && (tall(verdi[r][3]) === 0);
      var standardStart = (s === STARTKL);

      if (!fri || !standardStart) { hoppet++; continue; }

      if (Math.abs(sl - s - NY_TIMER) < 0.001) { alt_ok++; continue; }

      var d = String(vist[r][1]).trim();
      var odelagt = (d === "14.12" || d === "15.00" || d === "15:00" ||
                     feilDato(verdi[r][1], dato[r][0]));
      if (!odelagt) { hoppet++; continue; }

      ut[r][0] = nyVerdi;
      fikset++;
    }

    sluttKol.setValues(ut);
    sluttKol.setNumberFormat("HH:mm");
    SpreadsheetApp.flush();

    logg.push("Rettet til ekte klokkeslett 14:12: " + fikset);
    logg.push("Var allerede riktige:              " + alt_ok);
    logg.push("Hoppet over (fort av henne selv):  " + hoppet);
    logg.push("Tomme dager (helg og lignende):    " + tomme);

    var antall = regnUt(ws);
    logg.push("Timer regnet ut paa nytt for " + antall + " dager");
    logg.push("Timer +/- etter: " + ws.getRange("D3").getDisplayValue());
    logg.push("Kontroll rad 9 (skal vise 7,2): " +
              ws.getRange(9, TIMER).getDisplayValue() +
              "   slutt: " + ws.getRange(9, SLUTT).getDisplayValue());

  } catch (e) {
    logg.push("FEIL  " + e.message);
  }
  varsle(logg.join("\n"));
}

/** Sant hvis slutt er en dato som ikke hoerer til dagens egen dato. */
function feilDato(slutt, dagensDato) {
  if (Object.prototype.toString.call(slutt) !== "[object Date]") return false;
  if (Object.prototype.toString.call(dagensDato) !== "[object Date]") return true;
  return slutt.getFullYear() !== dagensDato.getFullYear() ||
         slutt.getMonth() !== dagensDato.getMonth() ||
         slutt.getDate() !== dagensDato.getDate();
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
