/**
 * formater_timelister.gs
 *
 * Formaterer alle 13 timelistene i ett kjor: farger, rammer, rosa helger,
 * frossen topprad, kolonnebredder, tallformat, navn i B2 og opprydding
 * av restrader under datablokken.
 *
 * SLIK BRUKER DU DEN:
 *   1. script.google.com  ->  Nytt prosjekt
 *   2. Slett alt som staar der, lim inn hele denne filen
 *   3. Velg "formaterAlle" oeverst og trykk Kjor
 *   4. Foerste gang: godkjenn tilgang (Avansert -> Gaa til prosjekt -> Tillat)
 *   5. Se resultatet i loggen (Vis -> Logger, eller Ctrl+Enter)
 *
 * Kan kjores paa nytt naar som helst uten aa oedelegge data.
 *
 * Til slutt, naar alt er testet: kjor overforEierskap() for aa gi Peter
 * eierskapet. Det kan ikke angres.
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
  ["Peter",    "1jraQI5P0cyP2b3hNsjAUYh0QBmSvfLMS5foQsZ4RN6I"],
  ["Ailin",    "1u5OKwN_twDrpGUX1h3DUZ-2NdXu3EsuS3gUTXa0Cnrk"],
  ["David",    "1yvDKPJlKOOsZRhM46C5LP4P2rdbbCJ05UnknzYRKS3w"]
];

var DASHBORD = "1L9J9rZ0DEOa_-H5AvolSrK92xVu1sBEGxVmt53Tan8U";

var FORSTE = 7;      // forste datarad
var SISTE  = 206;    // siste datarad

var NAVY  = "#1f3864";
var HEAD  = "#2e5c8a";
var SOFT  = "#edf2f8";
var HELG  = "#fbe4e4";
var YEL   = "#fff9d6";
var LINJE = "#c9d3e0";

function formaterAlle() {
  var logg = [];
  for (var i = 0; i < ARK.length; i++) {
    try {
      formaterEtt(ARK[i][1], ARK[i][0]);
      logg.push("OK   " + ARK[i][0]);
    } catch (e) {
      logg.push("FEIL " + ARK[i][0] + ": " + e.message);
    }
  }
  varsle("Formatering ferdig\n\n" + logg.join("\n"));
}

/**
 * Viser resultatet uansett hvordan scriptet kjores. getUi() finnes bare
 * i ark-bundne script - i et frittstaaende prosjekt kaster den, og det
 * ville ellers ha veltet hele kjoringen paa siste linje.
 */
function varsle(tekst) {
  Logger.log(tekst);
  try {
    SpreadsheetApp.getUi().alert(tekst);
  } catch (e) {
    // frittstaaende script: ingen UI, loggen holder
  }
}

function formaterEtt(id, navn) {
  var ss = SpreadsheetApp.openById(id);
  var ws = ss.getSheets()[0];
  var antall = SISTE - FORSTE + 1;

  ws.setName("Timeliste");
  ws.getRange("B2").setValue(navn);

  // tittelrad
  var tittel = ws.getRange("A1:F1");
  if (!tittel.isPartOfMerge()) {
    tittel.merge();
  }
  tittel.setValue("TIMELISTE - " + navn.toUpperCase())
    .setBackground(NAVY).setFontColor("#ffffff")
    .setFontSize(16).setFontWeight("bold")
    .setVerticalAlignment("middle");
  ws.setRowHeight(1, 34);

  // toppfelt
  ws.getRange("A2:F2").setFontWeight("bold");
  ws.getRange("B2").setBackground(YEL).setFontWeight("bold");
  ws.getRange("D2").setBackground(YEL).setNumberFormat("dd.mm.yyyy");
  ws.getRange("F2").setBackground(YEL).setNumberFormat("0.00");

  // noekkeltall
  ws.getRange("A3:F3").setFontWeight("bold");
  ws.getRange("B3").setBackground(SOFT).setFontSize(13)
    .setFontColor(NAVY).setNumberFormat("0.00");
  ws.getRange("D3").setBackground(SOFT).setFontSize(13)
    .setFontColor(NAVY).setNumberFormat("+0.00;-0.00;0.00");

  ws.getRange("A4").setFontStyle("italic").setFontColor("#60708a");

  // kolonneoverskrifter
  ws.getRange(6, 1, 1, 6)
    .setBackground(HEAD).setFontColor("#ffffff").setFontWeight("bold")
    .setHorizontalAlignment("center");
  ws.setRowHeight(6, 26);

  // datablokk
  ws.getRange(FORSTE, 1, antall, 6)
    .setBorder(true, true, true, true, true, true, LINJE,
               SpreadsheetApp.BorderStyle.SOLID);
  ws.getRange(FORSTE, 1, antall, 5).setHorizontalAlignment("center");
  ws.getRange(FORSTE, 1, antall, 1).setNumberFormat("dd.mm.yyyy");
  ws.getRange(FORSTE, 5, antall, 1).setNumberFormat("0.00");

  // Start og Slutt holdes som ren tekst. Timer-formelen parser dem med
  // REGEXEXTRACT nettopp fordi de er tekst - lar vi Sheets tolke dem som
  // tid, endres verdiene under panseret og parsingen slaar feil.
  ws.getRange(FORSTE, 3, antall, 2).setNumberFormat("@");

  // gule inndatafelt
  ws.getRange(FORSTE, 3, antall, 2).setBackground(YEL);
  ws.getRange(FORSTE, 6, antall, 1).setBackground("#ffffff");

  // rosa helger
  // WEEKDAY paa datoen i A, ikke tekstsammenlikning mot "lordag"/"sondag":
  // formler som sendes inn via Apps Script maa bruke komma som
  // argumentskille uansett at arket er norsk, og WEEKDAY slipper unna
  // baade det og spesialtegnene.
  var regel = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($A' + FORSTE + '<>"",WEEKDAY($A' + FORSTE + ',2)>5)')
    .setBackground(HELG)
    .setRanges([ws.getRange(FORSTE, 1, antall, 6)])
    .build();
  ws.setConditionalFormatRules([regel]);

  // restrader under datablokken. CSV-importen la igjen 07.00/15.00 paa
  // rader uten dato. De ligger utenfor E7:E206 og paavirker ikke summen,
  // men de ser ut som dager man skal fylle ut.
  var sisteRad = ws.getMaxRows();
  if (sisteRad > SISTE) {
    ws.getRange(SISTE + 1, 1, sisteRad - SISTE, ws.getMaxColumns())
      .clearContent().clearFormat();
  }

  // kolonnebredder og frossen topp
  var bredder = [95, 95, 75, 75, 75, 420];
  for (var c = 0; c < bredder.length; c++) {
    ws.setColumnWidth(c + 1, bredder[c]);
  }
  ws.setFrozenRows(6);

  beskyttFormler(ws, antall);

  SpreadsheetApp.flush();
}

/**
 * Dato, Ukedag og Timer er ARRAYFORMULA-er i toppcellen. Skriver noen i
 * en av dem, ryker hele kolonnen. Advarsel, ikke laas: den ansatte kan
 * fortsatt klikke seg videre, men faar spoersmaal foerst.
 */
function beskyttFormler(ws, antall) {
  var gamle = ws.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  for (var i = 0; i < gamle.length; i++) {
    if (gamle[i].getDescription() === "Formler") {
      gamle[i].remove();
    }
  }
  var omraader = [
    ws.getRange(3, 1, 1, 6),            // sum og +/-
    ws.getRange(FORSTE, 1, antall, 2),  // Dato + Ukedag
    ws.getRange(FORSTE, 5, antall, 1)   // Timer
  ];
  for (var j = 0; j < omraader.length; j++) {
    omraader[j].protect().setDescription("Formler").setWarningOnly(true);
  }
}

/**
 * SISTE STEG - kan ikke angres av deg selv.
 * Fyll inn Peters e-post og kjor. Overfoerer eierskap av alle 13
 * timelister + dashbordet. Kjor foerst naar deling og testing er ferdig.
 */
var PETER_EPOST = "";   // <- fyll inn foer du kjorer overforEierskap()

function overforEierskap() {
  if (!PETER_EPOST) {
    varsle("Sett PETER_EPOST oeverst i filen foerst.");
    return;
  }
  var logg = [];
  var alle = ARK.concat([["Dashbord", DASHBORD]]);
  for (var i = 0; i < alle.length; i++) {
    try {
      DriveApp.getFileById(alle[i][1]).setOwner(PETER_EPOST);
      logg.push("OK   " + alle[i][0]);
    } catch (e) {
      logg.push("FEIL " + alle[i][0] + ": " + e.message);
    }
  }
  varsle("Eierskap overfoert\n\n" + logg.join("\n"));
}
