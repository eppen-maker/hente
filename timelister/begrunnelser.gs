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
 * Scriptet finner selv hvor navnene slutter: det leser nedover fra rad
 * 5 og stopper paa SUM-raden eller forste tomme rad. Kommer det flere
 * personer, utvider listen seg av seg selv, og SUM havner aldri i
 * nedtrekksmenyen.
 *
 * Nedtrekkslisten peker rett paa navnekolonnen i dashbordet, saa den
 * holder seg i takt uten at scriptet kjores paa nytt.
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

var FANE   = "Begrunnelser";
var FORSTE = 5;    // forste navnerad i dashbordet
var MAKS   = 100;  // leter etter slutten av navnelisten saa langt ned

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

    var siste = finnSiste(dash);
    if (siste < FORSTE) {
      varsle("STOPP  fant ingen navn i " + dnavn + " fra rad " + FORSTE +
             " og nedover.\nIngenting er endret.");
      return;
    }
    var navn = lesNavn(dash, siste);
    logg.push("Navnerader: " + FORSTE + "-" + siste +
              "  (" + navn.length + " personer)");
    logg.push("Navn: " + navn.join(", "));
    logg.push("Raden under (" + (siste + 1) + ") er: [" +
              dash.getRange(siste + 1, 1).getDisplayValue() + "]");

    var gammel = bok.getSheetByName(FANE);
    if (gammel) {
      bok.deleteSheet(gammel);
      logg.push("Gammel fane slettet, bygges paa nytt");
    }

    var ws = bok.insertSheet(FANE, 1);
    bygg(ws, dash, dnavn, navn, siste);
    SpreadsheetApp.flush();

    logg.push("Fanen '" + FANE + "' er laget");
    logg.push("Valgt person na: " + ws.getRange("B3").getDisplayValue());
    logg.push("Saldo: " + ws.getRange("C3").getDisplayValue());
    logg.push("Forste linje: [" + ws.getRange("A6").getDisplayValue() + "]");

  } catch (e) {
    logg.push("FEIL  " + e.message);
  }
  varsle(logg.join("\n"));
}

/**
 * Siste raden med et navn. Leser nedover fra FORSTE og stopper paa
 * SUM-raden eller forste tomme rad, slik at SUM aldri blir med.
 */
function finnSiste(dash) {
  var hoyde = Math.min(MAKS, dash.getMaxRows() - FORSTE + 1);
  if (hoyde < 1) return FORSTE - 1;

  var v = dash.getRange(FORSTE, 1, hoyde, 1).getDisplayValues();
  var siste = FORSTE - 1;
  for (var i = 0; i < v.length; i++) {
    var n = String(v[i][0]).trim();
    if (n === "" || n.toUpperCase() === "SUM") break;
    siste = FORSTE + i;
  }
  return siste;
}

/** Navnene slik de staar i dashbordet, i samme rekkefolge. */
function lesNavn(dash, siste) {
  var v = dash.getRange(FORSTE, 1, siste - FORSTE + 1, 1).getDisplayValues();
  var ut = [];
  for (var i = 0; i < v.length; i++) {
    var n = String(v[i][0]).trim();
    if (n !== "" && ut.indexOf(n) === -1) ut.push(n);
  }
  return ut;
}

function bygg(ws, dash, dnavn, navn, siste) {
  var d = "'" + dnavn.replace(/'/g, "''") + "'";
  var kolA = d + "!$A$" + FORSTE + ":$A$" + siste;
  var kolB = d + "!$B$" + FORSTE + ":$B$" + siste;
  var kolC = d + "!$C$" + FORSTE + ":$C$" + siste;

  /* Trimmer begge sider. Staar det mellomrom etter navnet i dashbordet,
     faar B3 det samme fra nedtrekkslisten - da maa begge trimmes for at
     de skal finne hverandre. */
  var treff = "MATCH(TRIM($B$3),ARRAYFORMULA(TRIM(" + kolA + ")),0)";

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
    .requireValueInRange(dash.getRange(FORSTE, 1, siste - FORSTE + 1, 1), true)
    .setAllowInvalid(false)
    .setHelpText("Velg hvem du vil se begrunnelsene til")
    .build();
  celle.setDataValidation(regel);

  ws.getRange("C3")
    .setFormula('=IFERROR("Timer +/-:   "&TEXT(INDEX(' + kolB + ',' + treff +
                '),"+0.00;-0.00;0.00"),"")')
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
    '=IFERROR(TRANSPOSE(SPLIT(INDEX(' + kolC + ',' + treff +
    '),CHAR(10))),"Ingen begrunnelser registrert")');

  var rader = 40;
  ws.getRange(6, 1, rader, 1)
    .setVerticalAlignment("middle").setWrap(true)
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
