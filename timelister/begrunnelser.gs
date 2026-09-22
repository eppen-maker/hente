/**
 * begrunnelser.gs
 *
 * Legger til en ny fane i dashbordet: "Begrunnelser".
 *
 * Oppe i fanen er det en nedtrekksmeny med alle navnene. Velger du
 * David, listes alle begrunnelsene hans opp nedover, en per rad, med
 * dato foran. Velger du Espen, bytter listen til hans. Ved siden av
 * navnet staar timesaldoen hans.
 *
 * Ingenting i det gamle dashbordet endres. Datafila roeres ikke.
 * Lenken til dashbordet er den samme som for.
 *
 * Scriptet kan kjores flere ganger. Finnes fanen alt, bygges den bare
 * opp paa nytt.
 *
 * SLIK BRUKER DU DEN:
 *   1. script.google.com -> samme prosjekt som for
 *   2. Slett alt, lim inn hele denne filen, trykk Lagre
 *   3. Velg "lagBegrunnelser" i NEDTREKKSMENYEN ved siden av Kjor
 *   4. Trykk Kjor
 *   5. Kopier loggen tilbake
 */

var DASHBORD = "1u0JMdaeJfvRHnR9eTnWr0DbrXp7MbaXl7-6yeMNdgZA";

var FANE    = "Begrunnelser";
var FORSTE  = 5;    // forste navnerad i dashbordet
var SISTE   = 18;   // siste navnerad (raden under er SUM)

var NAVY = "#1f3864";
var BAND = "#e8eff7";
var LINJ = "#c9d3e0";
var GUL  = "#fff4cc";

function lagBegrunnelser() {
  var logg = [];
  try {
    var bok = SpreadsheetApp.openById(DASHBORD);
    var dash = bok.getSheets()[0];
    var dnavn = dash.getName();
    logg.push("Dashbord: " + bok.getName());
    logg.push("Fane 1 heter: " + dnavn);

    var navn = lesNavn(dash);
    logg.push("Fant " + navn.length + " navn: " + navn.join(", "));
    if (navn.length === 0) {
      varsle("STOPP  fant ingen navn i " + dnavn + "!A" + FORSTE + ":A" + SISTE +
             "\nIngenting er endret.");
      return;
    }

    var gammel = bok.getSheetByName(FANE);
    if (gammel) {
      bok.deleteSheet(gammel);
      logg.push("Gammel fane slettet, bygges paa nytt");
    }

    var ws = bok.insertSheet(FANE, 1);
    bygg(ws, dnavn, navn);
    SpreadsheetApp.flush();

    logg.push("Fanen '" + FANE + "' er laget");
    logg.push("Valgt person na: " + ws.getRange("B3").getDisplayValue());
    logg.push("Forste linje: [" + ws.getRange("A6").getDisplayValue() + "]");

  } catch (e) {
    logg.push("FEIL  " + e.message);
  }
  varsle(logg.join("\n"));
}

/** Henter navnene slik de staar i dashbordet, uten tomme og uten SUM. */
function lesNavn(dash) {
  var v = dash.getRange(FORSTE, 1, SISTE - FORSTE + 1, 1).getDisplayValues();
  var ut = [];
  for (var i = 0; i < v.length; i++) {
    var n = String(v[i][0]).trim();
    if (n === "" || n.toUpperCase() === "SUM") continue;
    if (ut.indexOf(n) === -1) ut.push(n);
  }
  ut.sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
  return ut;
}

function bygg(ws, dnavn, navn) {
  var d = "'" + dnavn.replace(/'/g, "''") + "'";
  var kolA = d + "!$A$" + FORSTE + ":$A$" + SISTE;
  var kolB = d + "!$B$" + FORSTE + ":$B$" + SISTE;
  var kolC = d + "!$C$" + FORSTE + ":$C$" + SISTE;

  ws.setHiddenGridlines(true);
  ws.setColumnWidth(1, 700);
  ws.setColumnWidth(2, 150);
  ws.setColumnWidth(3, 260);

  /* tittellinje */
  ws.getRange("A1:C1").merge()
    .setValue("  BEGRUNNELSER  -  velg person")
    .setBackground(NAVY).setFontColor("#ffffff")
    .setFontSize(18).setFontWeight("bold")
    .setVerticalAlignment("middle");
  ws.setRowHeight(1, 40);
  ws.setRowHeight(2, 10);

  /* velgeren */
  ws.getRange("A3").setValue("Person:  ")
    .setFontWeight("bold").setFontSize(11)
    .setHorizontalAlignment("right").setVerticalAlignment("middle");

  var celle = ws.getRange("B3");
  celle.setValue(navn[0])
    .setBackground(GUL).setFontWeight("bold").setFontSize(12)
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBorder(true, true, true, true, false, false, LINJ,
               SpreadsheetApp.BorderStyle.SOLID);

  var regel = SpreadsheetApp.newDataValidation()
    .requireValueInList(navn, true)
    .setAllowInvalid(false)
    .setHelpText("Velg hvem du vil se begrunnelsene til")
    .build();
  celle.setDataValidation(regel);

  ws.getRange("C3")
    .setFormula('=IFERROR("Timer +/-:   "&TEXT(INDEX(' + kolB +
                ',MATCH($B$3,' + kolA + ',0)),"+0.00;-0.00;0.00"),"")')
    .setFontWeight("bold").setFontSize(11).setFontColor(NAVY)
    .setVerticalAlignment("middle");
  ws.setRowHeight(3, 32);
  ws.setRowHeight(4, 10);

  /* overskrift over listen */
  ws.getRange("A5:C5").merge()
    .setValue("  Dato og begrunnelse")
    .setBackground(NAVY).setFontColor("#ffffff")
    .setFontSize(11).setFontWeight("bold")
    .setVerticalAlignment("middle");
  ws.setRowHeight(5, 30);

  /* selve listen */
  ws.getRange("A6").setFormula(
    '=IFERROR(TRANSPOSE(SPLIT(INDEX(' + kolC + ',MATCH($B$3,' + kolA +
    ',0)),CHAR(10))),"Ingen begrunnelser registrert")');

  var rader = 40;
  var omr = ws.getRange(6, 1, rader, 1);
  omr.setVerticalAlignment("middle").setWrap(true)
     .setBorder(true, true, true, true, true, false, LINJ,
                SpreadsheetApp.BorderStyle.SOLID);
  for (var r = 6; r < 6 + rader; r++) {
    ws.setRowHeight(r, 26);
    if (r % 2 === 1) ws.getRange(r, 1).setBackground(BAND);
  }

  ws.setFrozenRows(5);
  ws.getRange("B3").activate();
}

function varsle(tekst) {
  Logger.log(tekst);
  try { SpreadsheetApp.getUi().alert(tekst); } catch (e) { /* frittstaaende */ }
}
