/**
 * formater_timelister.gs
 *
 * Bygger om alle timelistene til malen fra Timeliste_Espen.xlsx:
 * pausekolonne, 7,5 t normaltid, hele aaret 01.09.2026-01.09.2027, og
 * noekkeltallene "Arbeidstimer totalt", "Denne maaneden", "Grunnlag" og
 * "Timer +/-". Bygger ogsaa om dashbordet og godkjenningsarket, og deler
 * alt med de ansatte.
 *
 * Arkene skrives om paa plass. Fil-ID-ene er derfor uendret, og
 * IMPORTRANGE-ene i dashbordet peker fortsatt riktig.
 *
 * SLIK BRUKER DU DEN:
 *   1. script.google.com  ->  Nytt prosjekt
 *   2. Slett alt som staar der, lim inn hele denne filen
 *   3. Fyll inn e-postadressene i EPOST-tabellen under
 *   4. Velg "settOppAlt" oeverst og trykk Kjor
 *   5. Foerste gang: godkjenn tilgang (Avansert -> Gaa til prosjekt -> Tillat)
 *   6. Se resultatet i loggen (Ctrl+Enter)
 *
 * ADVARSEL: byggOmAlle() toemmer arkene foer den bygger dem opp igjen.
 * Kjor den ikke etter at de ansatte har begynt aa foere timer - da
 * sletter du det de har skrevet. Formatering og deling kan kjores fritt.
 *
 * Peter foerer ikke timer selv. Han staar bare som redaktoer paa de andres
 * lister og paa dashbordet.
 *
 * Til slutt, naar alt er testet: overforEierskap() gir Peter eierskapet.
 * Det kan ikke angres av deg selv, saa den er med vilje ikke en del av
 * settOppAlt().
 */

var ARK = [
  ["Malin",    "1jkjB0hMdyQ7SroUQsFMqhS6ZMC8wcXaVjc8Ckm4tNrU"],
  ["Even",     "131S_Q0_ZqntMbSTcpQzORYpiNZtfd6rmJkgfrd1FVGc"],
  ["Sverre",   "1gYgleo4KwhSLzgv8GXIqKLgY7lA6Ys2My1lvtEzyVo0"],
  ["Elias",    "1EH_RbKtJ1_mmHmQ-YhLD9r9JG55dHvy2OYCpgNoN0_k"],
  ["Liliane",  "1q-_RYTX9O9njdbGwZxYV8EO6VjMAaT_LDOHZ9hRCqKY"],
  ["Marlene",  "1crQwlbGfrI5NIrGWi-FNdVZonJboYxgKeYIecaQNh7I"],
  ["Kristine", "1WWMSQMpNx13qlVx1hCtgGOoxkj2nNO1nE6tOFjwlOLw"],
  ["Paul",     "1XCHaIcpFKjZql6M65IJXbNlBGrSxgC_6-mmnBIkOtlo"],
  ["Glenn",    "1gIMD6qubvqCcopfXfNEPbdC9EcZK1U-YhL4GUe1qEW4"],
  ["Espen",    "1-A6XMtVjLuCXIav6WbjJddUdWiik9qrYCYdSgGgC_Tw"],
  ["Ailin",    "1u5OKwN_twDrpGUX1h3DUZ-2NdXu3EsuS3gUTXa0Cnrk"],
  ["David",    "1yvDKPJlKOOsZRhM46C5LP4P2rdbbCJ05UnknzYRKS3w"]
];

var DASHBORD = "1L9J9rZ0DEOa_-H5AvolSrK92xVu1sBEGxVmt53Tan8U";
var HJELPEARK = "Data";   // skjult ark i dashbordet, kilde for SORT()
var GODKJENN = "1LFJyyoNzbf5O3VOAxJFOs0vVNRHrtPhbeHsXXNRAepg";

/**
 * FYLL INN HER. Navnene maa staa akkurat som i ARK over.
 * Peter har ingen egen timeliste, men adressen hans brukes til aa gi ham
 * redaktoertilgang paa alle de andre og paa dashbordet.
 */
var EPOST = {
  "Malin":    "",
  "Even":     "",
  "Sverre":   "",
  "Elias":    "",
  "Liliane":  "",
  "Marlene":  "",
  "Kristine": "",
  "Paul":     "",
  "Glenn":    "",
  "Espen":    "",
  "Ailin":    "",
  "David":    "",
  "Peter":    ""
};

// Malen. Endrer du noe her, endres alle arkene ved neste kjoring.
var START_AAR  = 2026;
var START_MND  = 9;      // september
var START_DAG  = 1;
var DAGER      = 366;    // 01.09.2026 t.o.m. 01.09.2027
var NORMALTID  = 7.5;
var PAUSE_MIN  = 30;
var STD_START  = "07:00";
var STD_SLUTT  = "15:00";

var FORSTE = 7;                      // foerste datarad
var SISTE  = FORSTE + DAGER - 1;     // 372
var KOL    = 10;                     // A-H synlig, I-J skjult regneplass

var NAVY  = "#1f3864";
var HEAD  = "#2e5c8a";
var SOFT  = "#edf2f8";
var HELG  = "#fbe4e4";
var YEL   = "#fff9d6";
var LINJE = "#c9d3e0";

function settOppAlt() {
  byggOmAlle();
  byggDashbord();
  byggGodkjenn();
  delAlle();
}

function byggOmAlle() {
  var logg = [];
  for (var i = 0; i < ARK.length; i++) {
    try {
      byggOmEtt(ARK[i][1], ARK[i][0]);
      logg.push("OK   " + ARK[i][0]);
    } catch (e) {
      logg.push("FEIL " + ARK[i][0] + ": " + e.message);
    }
  }
  varsle("Timelister bygget\n\n" + logg.join("\n"));
}

/**
 * Viser resultatet uansett hvordan scriptet kjores. getUi() finnes bare i
 * ark-bundne script - i et frittstaaende prosjekt kaster den, og ville
 * ellers ha veltet kjoringen paa siste linje.
 */
function varsle(tekst) {
  Logger.log(tekst);
  try {
    SpreadsheetApp.getUi().alert(tekst);
  } catch (e) {
    // frittstaaende script: ingen UI, loggen holder
  }
}

function byggOmEtt(id, navn) {
  var ss = SpreadsheetApp.openById(id);
  var ws = ss.getSheets()[0];

  ws.setName("Timeliste");
  settStoerrelse(ws, SISTE, KOL);
  ws.clear();
  ws.clearConditionalFormatRules();
  fjernBeskyttelse(ws);
  if (ws.getFrozenRows() > 0) {
    ws.setFrozenRows(0);
  }

  // rad 1: tittel
  ws.getRange(1, 1, 1, 8).merge()
    .setValue("TIMELISTE – " + navn.toUpperCase())
    .setBackground(NAVY).setFontColor("#ffffff")
    .setFontSize(16).setFontWeight("bold")
    .setVerticalAlignment("middle");
  ws.setRowHeight(1, 34);

  // rad 2: navn, startdato, normaltid
  ws.getRange(2, 1, 1, 6).setValues([[
    "Navn:", navn,
    "Startdato:", new Date(START_AAR, START_MND - 1, START_DAG),
    "Normaltid pr. dag:", NORMALTID
  ]]);
  ws.getRange("A2:H2").setFontWeight("bold");
  ws.getRange("B2").setBackground(YEL);
  ws.getRange("D2").setBackground(YEL).setNumberFormat("dd.mm.yyyy");
  ws.getRange("F2").setBackground(YEL).setNumberFormat("0.00");

  // rad 3: noekkeltall. Bare avviket - timetallet er ikke interessant.
  ws.getRange(3, 1, 1, 4).setValues([[
    "Timer +/- totalt",
    "=ROUND(SUM(F" + FORSTE + ":F" + SISTE + "),2)",
    "Denne \u006d\u00e5neden",
    "=ROUND(SUMIFS(F" + FORSTE + ":F" + SISTE +
      ",A" + FORSTE + ":A" + SISTE + ',">="&EOMONTH(TODAY(),-1)+1' +
      ",A" + FORSTE + ":A" + SISTE + ',"<="&EOMONTH(TODAY(),0)),2)'
  ]]);
  ws.getRange("A3:D3").setFontWeight("bold").setFontSize(12);
  ws.getRange("B3").setBackground(SOFT).setFontColor(NAVY).setFontSize(14)
    .setNumberFormat("+0.00;-0.00;0.00");
  ws.getRange("D3").setBackground(SOFT).setFontColor(NAVY)
    .setNumberFormat("+0.00;-0.00;0.00");

  // rad 4: hjelpetekst
  ws.getRange(4, 1, 1, 8).merge()
    .setValue("Standard " + STD_START + "-" + STD_SLUTT + " med " + PAUSE_MIN +
              " min pause. Endre kun dagene som avviker. Skriv begrunnelse, " +
              "og \u006e\u00e5r du regner med \u00e5 jobbe det inn igjen.")
    .setFontStyle("italic").setFontColor("#60708a");

  // rad 6: kolonneoverskrifter
  ws.getRange(6, 1, 1, 8).setValues([[
    "Dato", "Ukedag", "Start", "Slutt", "Pause (min)",
    "Avvik (+/-)", "Begrunnelse", "N\u00e5r jobbes det inn?"
  ]]);
  ws.getRange(6, 1, 1, 8)
    .setBackground(HEAD).setFontColor("#ffffff").setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setWrap(true);
  ws.setRowHeight(6, 28);

  skrivFormler(ws);
  skrivRegneplass(ws);
  skrivStandarddager(ws);
  formater(ws);
  beskyttFormler(ws);

  SpreadsheetApp.flush();
}

/**
 * Formlene settes med komma som argumentskille. Apps Script tolker alltid
 * formler som amerikansk locale, uansett at arket selv er norsk - med
 * semikolon blir de avvist.
 */
function skrivFormler(ws) {
  // Dato: en sammenhengende serie fra startdatoen i D2.
  ws.getRange(FORSTE, 1).setFormula(
    "=$D$2+SEQUENCE(" + DAGER + ",1,0)");

  // Ukedag: norsk navn. WEEKDAY(...,2) gir mandag=1.
  ws.getRange(FORSTE, 2).setFormula(
    '=ARRAYFORMULA(IF(A' + FORSTE + ":A" + SISTE + '="","",' +
    "CHOOSE(WEEKDAY(A" + FORSTE + ":A" + SISTE + ",2)," +
    '"mandag","tirsdag","onsdag","torsdag","fredag",' +
    '"lørdag","søndag")))');

  // Avvik mot normaltid. Klokkeslettene ligger som tekst, ikke som
  // tidsverdier - enkel subtraksjon gir #VALUE!. Derfor parses time og
  // minutt med REGEXEXTRACT, noe som ogsaa taaler 07.00, 07:00 og 7.
  // MOD(...,24) haandterer nattevakt over midnatt. Saa trekkes pausen fra,
  // og til slutt normaltiden: det er avviket som skal staa i kolonnen,
  // ikke timetallet.
  var c = "C" + FORSTE + ":C" + SISTE;
  var d = "D" + FORSTE + ":D" + SISTE;
  var e = "E" + FORSTE + ":E" + SISTE;
  ws.getRange(FORSTE, 6).setFormula(
    "=ARRAYFORMULA(IF((" + c + '="")+(' + d + '="")>0,"",' +
    "ROUND(MOD(" +
      klokke(d) + "-" + klokke(c) +
    ",24)-IF(" + e + '="",0,' + e + ")/60-$F$2,2)))");
}

/**
 * Skjult regneplass i I og J.
 *
 * I = loepende saldo nedover. Hver gang den treffer 0, er alt fram dit
 * gjort opp: minustimene er jobbet inn igjen, og grunnene til dem er ikke
 * lenger noe Peter trenger aa se. J2 og J3 plukker derfor bare ut tekstene
 * som ligger ETTER siste nullpunkt.
 *
 * Saldoen regnes her, i den ansattes eget ark, og ikke i dashbordet.
 * En kumulativ sum over IMPORTRANGE ville blitt kvadratisk - 366 rader i
 * kvadrat, ganger 12 ansatte. Her er den lineaer, og dashbordet henter
 * bare de to ferdige cellene.
 */
function skrivRegneplass(ws) {
  var saldo = [];
  for (var k = 0; k < DAGER; k++) {
    var r = FORSTE + k;
    saldo.push([k === 0
      ? '=IF(F' + r + '="",0,F' + r + ')'
      : "=I" + (r - 1) + '+IF(F' + r + '="",0,F' + r + ")"]);
  }
  ws.getRange(FORSTE, 9, DAGER, 1).setFormulas(saldo);

  // Siste rad der saldoen sto i null. Ingen nullpunkt betyr at ingenting er
  // gjort opp, og da gjelder alt fra foerste datarad.
  ws.getRange(1, 10).setFormula(
    "=IFERROR(MAX(FILTER(ROW($I$" + FORSTE + ":$I$" + SISTE +
    "),$I$" + FORSTE + ":$I$" + SISTE + "=0))," + (FORSTE - 1) + ")");
  ws.getRange(2, 10).setFormula(relevantTekst("G"));
  ws.getRange(3, 10).setFormula(relevantTekst("H"));
}

/** Tekstene fra dagene etter siste nullpunkt, en linje per dag. */
function relevantTekst(kolonne) {
  var k = kolonne + FORSTE + ":" + kolonne + SISTE;
  return "=TEXTJOIN(CHAR(10),TRUE,ARRAYFORMULA(IF((ROW(A" + FORSTE + ":A" +
         SISTE + ")>$J$1)*(" + k + '<>""),TEXT(A' + FORSTE + ":A" + SISTE +
         ',"dd.mm")&" "&TEXT(F' + FORSTE + ":F" + SISTE +
         ',"+0.00;-0.00;0.00")&"t  "&' + k + ',"")))';
}

/** Timer + minutter som desimaltall, fra tekst som "07:00" eller "7". */
function klokke(omr) {
  return "(IFERROR(VALUE(REGEXEXTRACT(TO_TEXT(" + omr + '),"(\\d{1,2})")),0)' +
         "+IFERROR(VALUE(REGEXEXTRACT(TO_TEXT(" + omr +
         '),"\\d{1,2}[.:](\\d{2})")),0)/60)';
}

/**
 * Start, Slutt og Pause fylles ut paa hverdager og staar tomt i helger.
 * Skrives som faste verdier, ikke formler - den ansatte skal kunne endre
 * enkeltdager uten aa oedelegge noe.
 */
function skrivStandarddager(ws) {
  var rader = [];
  var d = new Date(START_AAR, START_MND - 1, START_DAG);
  for (var i = 0; i < DAGER; i++) {
    var ukedag = d.getDay();               // 0 = soendag, 6 = loerdag
    var helg = (ukedag === 0 || ukedag === 6);
    rader.push(helg ? ["", "", ""] : [STD_START, STD_SLUTT, PAUSE_MIN]);
    d.setDate(d.getDate() + 1);
  }
  // Tekstformat foer verdiene skrives, ellers gjor Sheets "07:00" om til
  // en tidsverdi og REGEXEXTRACT-parsingen slaar feil.
  ws.getRange(FORSTE, 3, DAGER, 2).setNumberFormat("@");
  ws.getRange(FORSTE, 5, DAGER, 1).setNumberFormat("0");
  ws.getRange(FORSTE, 3, DAGER, 3).setValues(rader);
}

function formater(ws) {
  ws.getRange(FORSTE, 1, DAGER, 8)
    .setBorder(true, true, true, true, true, true, LINJE,
               SpreadsheetApp.BorderStyle.SOLID);
  ws.getRange(FORSTE, 1, DAGER, 6).setHorizontalAlignment("center");
  ws.getRange(FORSTE, 1, DAGER, 1).setNumberFormat("dd.mm.yyyy");
  // Tom celle naar dagen gaar opp, slik at bare avvikene fanger oyet.
  ws.getRange(FORSTE, 6, DAGER, 1).setNumberFormat('+0.00;-0.00;""')
    .setFontWeight("bold");

  // gule inndatafelt: Start, Slutt, Pause, Begrunnelse, Naar jobbes inn
  ws.getRange(FORSTE, 3, DAGER, 3).setBackground(YEL);
  ws.getRange(FORSTE, 7, DAGER, 2).setBackground(YEL).setWrap(true)
    .setVerticalAlignment("top");

  striper(ws, ws.getRange(FORSTE, 1, DAGER, 8));

  // Reglene gjelder i rekkefolge, og forste treff vinner paa samme
  // egenskap. Avviksfargene staar derfor foerst: de dekker bare kolonne F,
  // mens helgeregelen dekker hele raden og ellers ville ha overstyrt dem.
  var avvikOmr = [ws.getRange(FORSTE, 6, DAGER, 1)];
  var minus = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0)
    .setBackground("#fce8e6").setFontColor("#b3261e")
    .setRanges(avvikOmr).build();
  var pluss = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0)
    .setBackground("#e6f4ea").setFontColor("#137333")
    .setRanges(avvikOmr).build();

  // rosa helger. WEEKDAY paa datoen i A, ikke tekstsammenlikning mot
  // "loerdag"/"soendag": formler som sendes inn via Apps Script maa bruke
  // komma, og WEEKDAY slipper unna baade det og spesialtegnene.
  var helg = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($A' + FORSTE + '<>"",WEEKDAY($A' + FORSTE +
                          ",2)>5)")
    .setBackground(HELG)
    .setRanges([ws.getRange(FORSTE, 1, DAGER, 8)])
    .build();

  ws.setConditionalFormatRules([minus, pluss, helg]);

  var bredder = [95, 95, 70, 70, 90, 95, 330, 230];
  for (var c = 0; c < bredder.length; c++) {
    ws.setColumnWidth(c + 1, bredder[c]);
  }
  ws.hideColumns(9, 2);
  ws.setFrozenRows(6);
}

/**
 * Vekselvis hvite og lyseblaa rader, slik at oyet foelger raden bortover.
 * Gamle striper maa fjernes foerst, ellers stables de oppaa hverandre
 * naar scriptet kjores paa nytt.
 */
function striper(ws, omraade) {
  var gamle = ws.getBandings();
  for (var i = 0; i < gamle.length; i++) {
    gamle[i].remove();
  }
  omraade.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
    .setFirstRowColor("#ffffff")
    .setSecondRowColor(SOFT)
    .setFooterRowColor(null);
}

function beskyttFormler(ws) {
  fjernBeskyttelse(ws);
  var omraader = [
    ws.getRange(3, 1, 1, 4),             // noekkeltall
    ws.getRange(FORSTE, 1, DAGER, 2),    // Dato + Ukedag
    ws.getRange(FORSTE, 6, DAGER, 1)     // Avvik
  ];
  for (var i = 0; i < omraader.length; i++) {
    omraader[i].protect().setDescription("Formler").setWarningOnly(true);
  }
}

function fjernBeskyttelse(ws) {
  var gamle = ws.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  for (var i = 0; i < gamle.length; i++) {
    if (gamle[i].getDescription() === "Formler") {
      gamle[i].remove();
    }
  }
}

/** Sorger for at arket har noeyaktig de radene og kolonnene vi trenger. */
function settStoerrelse(ws, rader, kolonner) {
  if (ws.getMaxRows() < rader) {
    ws.insertRowsAfter(ws.getMaxRows(), rader - ws.getMaxRows());
  } else if (ws.getMaxRows() > rader) {
    ws.deleteRows(rader + 1, ws.getMaxRows() - rader);
  }
  if (ws.getMaxColumns() < kolonner) {
    ws.insertColumnsAfter(ws.getMaxColumns(), kolonner - ws.getMaxColumns());
  } else if (ws.getMaxColumns() > kolonner) {
    ws.deleteColumns(kolonner + 1, ws.getMaxColumns() - kolonner);
  }
}

/**
 * Dashbordet: en rad per ansatt, hentet med IMPORTRANGE. Peter trenger tre
 * ting - hvor mange plusstimer eller minustimer den ansatte ligger paa,
 * hvorfor, og naar det tenkes jobbet inn igjen. Selve timetallet staar
 * bevisst ikke her.
 *
 * Radene sorteres stigende paa avvik, saa de som skylder timer havner
 * oeverst. Sorteringen maa vaere levende, siden verdiene kommer fra
 * IMPORTRANGE og endrer seg av seg selv. Derfor ligger selve formlene i et
 * skjult hjelpeark, og dashbordet viser en SORT() over det. Sorterte man
 * radene direkte, ville rekkefolgen fryse paa verdiene slik de var da
 * scriptet kjorte.
 *
 * IFERROR rundt IMPORTRANGE skjuler #REF!, og da forsvinner ogsaa Googles
 * "Tillat tilgang"-knapp. Derfor finnes godkjenningsarket, som gjor den
 * samme koblingen uten IFERROR slik at knappen dukker opp.
 */
function byggDashbord() {
  var ss = SpreadsheetApp.openById(DASHBORD);
  // Paa navn, ikke posisjon: insertSheet kan legge hjelpearket foerst, og
  // da ville getSheets()[0] truffet feil ark ved neste kjoring.
  var ws = ss.getSheetByName("Dashbord") || ss.getSheets()[0];
  var rader = ARK.length;

  ws.setName("Dashbord");
  skrivHjelpeark(ss, rader);

  settStoerrelse(ws, 4 + rader + 1, 4);
  ws.clear();
  fjernBeskyttelse(ws);

  ws.getRange(1, 1, 1, 4).merge()
    .setValue("DASHBORD \u2013 TIMER +/-")
    .setBackground(NAVY).setFontColor("#ffffff")
    .setFontSize(16).setFontWeight("bold")
    .setVerticalAlignment("middle");
  ws.setRowHeight(1, 34);

  ws.getRange(2, 1, 1, 4).merge()
    .setValue("Sortert med minustimer oeverst. Plusstall er timer til gode, "
              + "minustall er timer som skyldes. Oppdateres av seg selv.")
    .setFontStyle("italic").setFontColor("#60708a");

  ws.getRange(4, 1, 1, 4).setValues([[
    "Navn", "Timer +/-", "Begrunnelse", "N\u00e5r jobbes det inn?"
  ]]);
  ws.getRange(4, 1, 1, 4)
    .setBackground(NAVY).setFontColor("#ffffff").setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  ws.setRowHeight(4, 28);

  // Stigende sortering paa kolonne 2: mest negativ foerst.
  ws.getRange(5, 1).setFormula(
    "=SORT(" + HJELPEARK + "!A2:D" + (1 + rader) + ",2,TRUE)");

  var sumRad = 5 + rader;
  ws.getRange(sumRad, 1, 1, 2).setValues([[
    "SUM", "=ROUND(SUM(B5:B" + (sumRad - 1) + "),2)"
  ]]);
  ws.getRange(sumRad, 1, 1, 4).setFontWeight("bold").setBackground(SOFT);

  ws.getRange(5, 1, rader, 1).setFontWeight("bold");
  ws.getRange(5, 2, rader + 1, 1)
    .setNumberFormat("+0.00;-0.00;0.00").setFontSize(12).setFontWeight("bold")
    .setHorizontalAlignment("center");
  ws.getRange(5, 3, rader, 2).setWrap(true).setVerticalAlignment("top");
  ws.getRange(4, 1, rader + 2, 4)
    .setBorder(true, true, true, true, true, true, LINJE,
               SpreadsheetApp.BorderStyle.SOLID);

  striper(ws, ws.getRange(5, 1, rader, 4));

  var tall = [ws.getRange(5, 2, rader, 1)];
  ws.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(0)
      .setBackground("#fce8e6").setFontColor("#b3261e")
      .setRanges(tall).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(0)
      .setBackground("#e6f4ea").setFontColor("#137333")
      .setRanges(tall).build()
  ]);

  ws.setColumnWidth(1, 130);
  ws.setColumnWidth(2, 110);
  ws.setColumnWidth(3, 430);
  ws.setColumnWidth(4, 300);
  ws.setFrozenRows(4);

  SpreadsheetApp.flush();
  varsle("Dashbord bygget med " + rader + " ansatte.");
}

/** Hjelpearket som SORT() leser fra. Skjules, det er ikke til aa se paa. */
function skrivHjelpeark(ss, rader) {
  var hj = ss.getSheetByName(HJELPEARK);
  if (!hj) {
    hj = ss.insertSheet(HJELPEARK);
  }
  hj.clear();
  hj.getRange(1, 1, 1, 4).setValues([[
    "Navn", "Avvik", "Begrunnelse", "N\u00e5r"
  ]]);
  var verdier = [];
  for (var i = 0; i < rader; i++) {
    var id = ARK[i][1];
    verdier.push([
      ARK[i][0],
      avvikFormel(id),
      tekstFormel(id, "J2"),
      tekstFormel(id, "J3")
    ]);
  }
  hj.getRange(2, 1, rader, 4).setValues(verdier);
  ss.setActiveSheet(hj);
  ss.moveActiveSheet(ss.getNumSheets());
  hj.hideSheet();
}

/** Summen av alle daglige avvik. Kolonne F er allerede avvik, ikke timer. */
function avvikFormel(id) {
  var f = omr(id, "F");
  // Blank, ikke 0, hvis koblingen er brutt. En 0 leses som "ingen avvik"
  // og skjuler at noe er galt. Blank sorterer dessuten nederst, saa den
  // synes. SUM under ignorerer tekst.
  return '=IFERROR(ROUND(SUM(' + f + '),2),"")';
}

/**
 * Henter den ferdig utregnede teksten fra timelisten. Timelisten har
 * allerede luket bort alt som er gjort opp - se skrivRegneplass().
 *
 * Gaar saldoen i null, er J2 og J3 tomme av seg selv, og raden staar blank.
 * Det er den samme regelen, bare regnet ett sted i stedet for tolv.
 */
function tekstFormel(id, celle) {
  return '=IFERROR(IMPORTRANGE("' + id + '","Timeliste!' + celle + '"),"")';
}

function omr(id, kolonne) {
  return 'IMPORTRANGE("' + id + '","Timeliste!' + kolonne + FORSTE +
         ":" + kolonne + SISTE + '")';
}

/**
 * Godkjenningsarket. Bare en naken IMPORTRANGE per ansatt, uten IFERROR,
 * slik at Google faktisk viser "Tillat tilgang"-knappen. Uten dette steget
 * blir dashbordet staaende tomt.
 */
function byggGodkjenn() {
  var ss = SpreadsheetApp.openById(GODKJENN);
  var ws = ss.getSheets()[0];
  var rader = ARK.length;

  ws.setName("Godkjenn");
  settStoerrelse(ws, 3 + rader, 2);
  ws.clear();

  ws.getRange(1, 1, 1, 2).merge()
    .setValue("GODKJENN TILGANG FØRST")
    .setBackground(NAVY).setFontColor("#ffffff")
    .setFontSize(16).setFontWeight("bold");
  ws.setRowHeight(1, 34);

  ws.getRange(2, 1, 1, 2).merge()
    .setValue("Trykk \"Tillat tilgang\" paa hver rad under. Deretter " +
              "virker dashbordet.")
    .setFontStyle("italic").setFontColor("#60708a");

  var verdier = [];
  for (var i = 0; i < rader; i++) {
    verdier.push([
      ARK[i][0],
      '=IMPORTRANGE("' + ARK[i][1] + '","Timeliste!A1")'
    ]);
  }
  ws.getRange(4, 1, rader, 2).setValues(verdier);
  ws.getRange(4, 1, rader, 1).setFontWeight("bold");
  ws.setColumnWidth(1, 130);
  ws.setColumnWidth(2, 320);

  SpreadsheetApp.flush();
}

/**
 * Deler hver timeliste med den ansatte og med Peter, og dashbordet +
 * godkjenningsarket med Peter og Espen. Ingen "alle med lenken".
 *
 * addEditor sender ikke varsel-e-post. De ansatte finner listene under
 * "Delt med meg", men faar ingen beskjed - si fra til dem selv.
 */
function delAlle() {
  var mangler = [];
  for (var navn in EPOST) {
    if (!EPOST[navn]) {
      mangler.push(navn);
    }
  }
  if (mangler.length) {
    varsle("Deling hoppet over.\n\nMangler e-post for: " + mangler.join(", ") +
           "\n\nFyll inn EPOST-tabellen oeverst og kjor delAlle() paa nytt.");
    return;
  }

  var logg = [];
  var peter = EPOST["Peter"];
  var espen = EPOST["Espen"];

  for (var i = 0; i < ARK.length; i++) {
    var navn = ARK[i][0];
    var fil = DriveApp.getFileById(ARK[i][1]);
    delEn(fil, EPOST[navn], "TIMELISTE " + navn, logg);
    delEn(fil, peter, "TIMELISTE " + navn + " (Peter)", logg);
  }

  var dash = DriveApp.getFileById(DASHBORD);
  delEn(dash, peter, "DASHBORD (Peter)", logg);
  delEn(dash, espen, "DASHBORD (Espen)", logg);

  var godkjenn = DriveApp.getFileById(GODKJENN);
  delEn(godkjenn, peter, "GODKJENN (Peter)", logg);
  delEn(godkjenn, espen, "GODKJENN (Espen)", logg);

  varsle("Deling ferdig\n\n" + logg.join("\n"));
}

function delEn(fil, epost, hva, logg) {
  try {
    var eier = fil.getOwner();
    if (eier && eier.getEmail().toLowerCase() === epost.toLowerCase()) {
      logg.push("-    " + hva + ": eier allerede filen");
      return;
    }
    fil.addEditor(epost);
    logg.push("OK   " + hva + " -> " + epost);
  } catch (e) {
    logg.push("FEIL " + hva + " -> " + epost + ": " + e.message);
  }
}

/**
 * SISTE STEG - kan ikke angres av deg selv.
 * Kjor foerst naar alt er testet og du har sett at arkene ser riktige ut.
 */
function overforEierskap() {
  var peter = EPOST["Peter"];
  if (!peter) {
    varsle("Fyll inn Peters e-post i EPOST-tabellen foerst.");
    return;
  }
  var logg = [];
  var alle = ARK.concat([
    ["Dashbord", DASHBORD],
    ["Godkjenningsark", GODKJENN]
  ]);
  for (var i = 0; i < alle.length; i++) {
    try {
      DriveApp.getFileById(alle[i][1]).setOwner(peter);
      logg.push("OK   " + alle[i][0]);
    } catch (e) {
      logg.push("FEIL " + alle[i][0] + ": " + e.message);
    }
  }
  varsle("Eierskap overfoert\n\n" + logg.join("\n"));
}
