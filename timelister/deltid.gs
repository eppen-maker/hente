/**
 * deltid.gs
 *
 * Setter normaltid per ansatt. Kristine jobber 90 prosent, altsaa
 * 7,2 timer per dag i stedet for 8.
 *
 * Arket har en celle merket "Normaltid" i toppen. Scriptet finner den
 * selv, skriver inn riktig tall, og rapporterer hva som sto der for og
 * etter - inkludert formlene for "Sum timer" og "Timer +/-", slik at vi
 * ser om arket faktisk regner ut fra den cellen.
 *
 * Finner den ikke cellen entydig, endrer den ingenting og sier ifra.
 *
 * SLIK BRUKER DU DEN:
 *   1. script.google.com -> samme prosjekt som for
 *   2. Slett alt, lim inn hele denne filen, trykk Lagre
 *   3. Velg "settDeltid" i NEDTREKKSMENYEN ved siden av Kjor
 *   4. Trykk Kjor
 *   5. Kopier hele loggen tilbake til meg
 */

var MAPPE = "1F9pVf2eC_l7H7TIDAD47D9lUfKCN94uw";

/** Full dag i timer. */
var FULL_DAG = 8;

/** Navn i filtittelen -> stillingsprosent. Alle som ikke staar her er 100. */
var DELTID = {
  "Kristine": 0.9
};

function settDeltid() {
  var logg = [];

  for (var navn in DELTID) {
    var andel = DELTID[navn];
    var timer = FULL_DAG * andel;

    try {
      var fil = finnTimeliste(navn);
      if (!fil) { logg.push("FEIL  fant ingen TIMELISTE " + navn); continue; }

      var ws = SpreadsheetApp.openById(fil.getId()).getSheets()[0];

      logg.push("=== " + fil.getName() + " ===");
      logg.push(dumpTopp(ws));
      logg.push("Sum timer  formel: " + ws.getRange("B3").getFormula() +
                "   verdi: " + ws.getRange("B3").getDisplayValue());
      logg.push("Timer +/-  formel: " + ws.getRange("D3").getFormula() +
                "   verdi: " + ws.getRange("D3").getDisplayValue());

      var celle = finnNormaltidCelle(ws);
      if (!celle) {
        logg.push("STOPP  fant ikke normaltidscellen entydig - ingenting endret");
        continue;
      }

      logg.push("Normaltid staar i " + celle.getA1Notation() +
                ", verdi for: " + celle.getDisplayValue());
      celle.setValue(timer);
      SpreadsheetApp.flush();
      logg.push("Normaltid satt til " + timer +
                " (" + Math.round(andel * 100) + " prosent)");
      logg.push("Timer +/- etter: " + ws.getRange("D3").getDisplayValue());

    } catch (e) {
      logg.push("FEIL  " + navn + ": " + e.message);
    }
  }
  varsle(logg.join("\n"));
}

/** Skriver ut hele toppen av arket, verdier og formler. */
function dumpTopp(ws) {
  var r = ws.getRange(1, 1, 6, 10);
  var v = r.getDisplayValues();
  var f = r.getFormulas();
  var ut = [];
  for (var i = 0; i < v.length; i++) {
    for (var j = 0; j < v[i].length; j++) {
      if (v[i][j] === "" && f[i][j] === "") continue;
      ut.push("  " + kolonne(j + 1) + (i + 1) + " = [" + v[i][j] + "]" +
              (f[i][j] ? "  formel: " + f[i][j] : ""));
    }
  }
  return ut.join("\n");
}

/**
 * Finner cellen som holder normaltiden: et tall mellom 1 og 24 som ligger
 * inntil en celle merket "Normaltid". Returnerer null hvis den ikke finner
 * noyaktig én kandidat.
 */
function finnNormaltidCelle(ws) {
  var r = ws.getRange(1, 1, 6, 10);
  var v = r.getValues();
  var treff = [];

  for (var i = 0; i < v.length; i++) {
    for (var j = 0; j < v[i].length; j++) {
      if (String(v[i][j]).toLowerCase().indexOf("normaltid") === -1) continue;

      for (var di = -1; di <= 1; di++) {
        for (var dj = -2; dj <= 2; dj++) {
          if (di === 0 && dj === 0) continue;
          var a = i + di, b = j + dj;
          if (a < 0 || b < 0 || a >= v.length || b >= v[0].length) continue;
          var x = v[a][b];
          if (typeof x === "number" && x > 0 && x <= 24) {
            treff.push(ws.getRange(a + 1, b + 1));
          }
        }
      }
    }
  }
  if (treff.length === 0) return null;

  var forste = treff[0].getA1Notation();
  for (var k = 1; k < treff.length; k++) {
    if (treff[k].getA1Notation() !== forste) return null;
  }
  return treff[0];
}

function finnTimeliste(navn) {
  var filer = DriveApp.getFolderById(MAPPE).getFilesByType(MimeType.GOOGLE_SHEETS);
  while (filer.hasNext()) {
    var f = filer.next();
    if (f.getName() === "TIMELISTE " + navn) return f;
  }
  return null;
}

function kolonne(n) {
  var s = "";
  while (n > 0) {
    var rest = (n - 1) % 26;
    s = String.fromCharCode(65 + rest) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function varsle(tekst) {
  Logger.log(tekst);
  try { SpreadsheetApp.getUi().alert(tekst); } catch (e) { /* frittstaaende */ }
}
