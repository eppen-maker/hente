/**
 * deling.gs
 *
 * Laaser delingen og gir riktige folk tilgang.
 *
 * I dag ligger alt paa "alle med lenken kan redigere". Det betyr at
 * hvem som helst som faar en lenke kan aapne og endre alle timelistene.
 * Dette scriptet slaar det av og setter navngitt tilgang i stedet:
 *
 *   TIMELISTE <navn>   -> den ansatte selv (kan redigere)
 *                         Peter (kan redigere)
 *   TIMELISTE Paul     -> laases, men deles ikke. Han starter senere.
 *   DASHBORD Peter     -> Peter (kan lese)
 *   DATA dashbord      -> ingen andre. Det er ren teknikk, og
 *                         dashbordet henter tallene selv.
 *
 * Mappa settes ogsaa til privat. Uten det arver filene lenkedelingen
 * fra mappa, uansett hva som staar paa hver enkelt fil.
 *
 * Ingen mister noe de har skrevet. Det er kun tilgang som endres.
 *
 * SLIK BRUKER DU DEN:
 *   1. Bekreft at Peters adresse er riktig
 *   2. script.google.com -> samme prosjekt som for
 *   3. Slett alt, lim inn hele denne filen, trykk Lagre
 *   4. Velg "forhandsvis" i NEDTREKKSMENYEN ved siden av Kjor,
 *      trykk Kjor, og les gjennom listen. Ingenting endres.
 *   5. Naar listen ser riktig ut: velg "delUt" i samme meny og kjor.
 *
 * forhandsvis() kan kjores saa mange ganger du vil.
 */

var MAPPE  = "1F9pVf2eC_l7H7TIDAD47D9lUfKCN94uw";
var SENERE = "SENERE";

/** Peter - leder. Faar lese dashbordet og redigere alle timelistene. */
var PETER = "peter.kjellby@gmail.com";   // MAA bekreftes for delUt kjores

/**
 * Navnet i filtittelen -> e-postadressen til den ansatte.
 * SENERE betyr: laas arket, men ikke del det med noen enda.
 */
var FOLK = {
  "Sverre":   "sverrebratland@gmail.com",
  "Kristine": "krissa_moll@hotmail.com",
  "Malin":    "Malinlsyvertsen@gmail.com",
  "Elias":    "elias.kjostvedt@gmail.com",
  "Marlene":  "m.waaland@hotmail.com",
  "Glenn":    "glenn.roksland@gmail.com",
  "Even":     "even-kaarmo@hotmail.no",
  "David":    "dprenning20@gmail.com",
  "Liliane":  "Lilianelh@icloud.com",
  "Ailin":    "ailin-ramsland@hotmail.no",
  "Espen":    "espensensen@gmail.com",
  "Paul":     SENERE,   // starter om en maaned - skal ikke deles enda
  "Thomas":   "thomas.thoresen98@gmail.com",
  "Vera":     "Vovv_10@hotmail.com"
};

/* ------------------------------------------------------------------ */

/** Viser hva som vil skje. Endrer ingenting. */
function forhandsvis() {
  varsle(planlegg(false));
}

/** Gjor det. */
function delUt() {
  varsle(planlegg(true));
}

function planlegg(ekte) {
  var logg = [];
  var mangler = [];

  if (!gyldig(PETER)) mangler.push("Peter");

  var mappe = DriveApp.getFolderById(MAPPE);
  var filer = mappe.getFiles();
  var timelister = [], dashbord = null, data = null;

  while (filer.hasNext()) {
    var f = filer.next();
    var n = f.getName();
    if (n.indexOf("TIMELISTE ") === 0) timelister.push(f);
    else if (n.indexOf("DASHBORD Peter") === 0) dashbord = f;
    else if (n.indexOf("DATA dashbord") === 0) data = f;
  }
  timelister.sort(function (a, b) { return a.getName() < b.getName() ? -1 : 1; });

  for (var i = 0; i < timelister.length; i++) {
    var navn = timelister[i].getName().substring("TIMELISTE ".length).trim();
    var adr = FOLK[navn];
    if (adr !== SENERE && !gyldig(adr)) mangler.push(navn);
  }

  if (mangler.length) {
    return "STOPP - mangler e-post for: " + mangler.join(", ") +
           "\n\nFyll inn adressene overst i scriptet og kjor paa nytt. " +
           "Ingenting er endret.";
  }

  logg.push(ekte ? "DELER UT:" : "FORHANDSVISNING - ingenting endres:");
  logg.push("");

  logg.push(steg(ekte, "Mappe: " + mappe.getName(), function () {
    mappe.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  }, "settes til privat"));

  for (var j = 0; j < timelister.length; j++) {
    var fil = timelister[j];
    var eier = FOLK[fil.getName().substring("TIMELISTE ".length).trim()];

    if (eier === SENERE) {
      logg.push(steg(ekte, fil.getName(), (function (f) {
        return function () {
          f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
        };
      })(fil), "privat, IKKE delt med noen enda"));
      continue;
    }

    logg.push(steg(ekte, fil.getName(), (function (f, e) {
      return function () {
        f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
        f.addEditor(e);
        f.addEditor(PETER);
      };
    })(fil, eier), "privat + " + eier + " og Peter kan redigere"));
  }

  if (dashbord) {
    logg.push(steg(ekte, dashbord.getName(), function () {
      dashbord.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      dashbord.addViewer(PETER);
    }, "privat + Peter kan lese"));
  } else {
    logg.push("MANGLER  fant ingen DASHBORD Peter");
  }

  if (data) {
    logg.push(steg(ekte, data.getName(), function () {
      data.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    }, "privat, bare du"));
  } else {
    logg.push("MANGLER  fant ingen DATA dashbord");
  }

  if (ekte) {
    logg.push("");
    logg.push("Ferdig. Alle far e-post fra Google med lenke til sitt eget ark.");
  }
  return logg.join("\n");
}

/** Kjorer ett steg, eller beskriver det bare. */
function steg(ekte, navn, handling, beskrivelse) {
  if (!ekte) return "      " + navn + "  ->  " + beskrivelse;
  try {
    handling();
    return "OK    " + navn + "  ->  " + beskrivelse;
  } catch (e) {
    return "FEIL  " + navn + ": " + e.message;
  }
}

function gyldig(e) {
  return typeof e === "string" && e.indexOf("@") > 0 && e.indexOf(" ") === -1;
}

function varsle(tekst) {
  Logger.log(tekst);
  try { SpreadsheetApp.getUi().alert(tekst); } catch (e) { /* frittstaaende */ }
}
