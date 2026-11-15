/* Ebora kijkglas-configurator in een Logic4-pagina (ebora.nl).
 *
 * Plaatsing:
 *  1. Contentpagina (bijv. /merken/aci.html), op de plek waar de configurator moet komen:
 *       <div id="ebora-kijkglas" data-src="https://<plek van de configurator>/"></div>
 *     Optioneel: data-taal="de" (anders de taal van de pagina),
 *                data-formulier-pagina="/contact" (pagina met het Logic4-contactformulier; dit is de standaard).
 *  2. Deze code in het scriptveld van Logic4, binnen een script-tag.
 *     (Nooit de letterlijke sluit-tag van een script in dit commentaar zetten: die breekt de pagina.)
 *     Logic4 zet de code op één regel: daarom geen regelcommentaar met twee schuine strepen gebruiken,
 *     alleen blokcommentaar, en elke opdracht met een puntkomma afsluiten.
 *     Doet niets op pagina's zonder het blok "ebora-kijkglas", en niets zolang data-src geen echt adres is.
 *
 * Werking: de configurator (in een iframe) stuurt bij "Offerte aanvragen" een bericht naar deze pagina.
 * Dit script controleert dat het bericht uit dat iframe komt, laadt het Logic4-contactformulier (/contact,
 * zelfde domein) onzichtbaar, vult het in en verstuurt het. Logic4 mailt de aanvraag zoals elk contactformulier.
 * Pas als Logic4 het formulier verwerkt heeft, krijgt de configurator "gelukt" terug.
 * Staat het contactformulier op de pagina zelf, dan wordt dat gebruikt (de pagina herlaadt dan).
 */
(function () {
  "use strict";
  var VELDEN = { naam: "txtNaam", bedrijf: "txtBedrijfsnaam", email: "txtEmail", telefoon: "txtTelNr", land: "drpdwnCountry", bericht: "txtOpmerkingen", knop: "btnSend" };
  var BEDANKT = {
    nl: "Uw aanvraag is verstuurd (referentie {r}). U ontvangt zo snel mogelijk een offerte van ons.",
    de: "Ihre Anfrage wurde gesendet (Referenz {r}). Sie erhalten schnellstmöglich ein Angebot von uns.",
    en: "Your request has been sent (reference {r}). You will receive a quotation from us as soon as possible."
  };
  /* Landnamen zoals klanten ze typen -> tekst in de Logic4-landenlijst (Nederlands) */
  var LANDEN = {
    "nederland": "Nederland", "niederlande": "Nederland", "netherlands": "Nederland", "the netherlands": "Nederland", "holland": "Nederland", "nl": "Nederland",
    "duitsland": "Duitsland", "deutschland": "Duitsland", "germany": "Duitsland", "de": "Duitsland",
    "belgie": "België", "belgië": "België", "belgien": "België", "belgium": "België", "belgique": "België", "be": "België",
    "oostenrijk": "Oostenrijk", "österreich": "Oostenrijk", "oesterreich": "Oostenrijk", "austria": "Oostenrijk", "at": "Oostenrijk",
    "zwitserland": "Zwitserland", "schweiz": "Zwitserland", "switzerland": "Zwitserland", "suisse": "Zwitserland", "ch": "Zwitserland",
    "luxemburg": "Luxemburg", "luxembourg": "Luxemburg", "lu": "Luxemburg",
    "frankrijk": "Frankrijk", "frankreich": "Frankrijk", "france": "Frankrijk", "fr": "Frankrijk",
    "denemarken": "Denemarken", "dänemark": "Denemarken", "daenemark": "Denemarken", "denmark": "Denemarken", "dk": "Denemarken",
    "polen": "Polen", "poland": "Polen", "pl": "Polen",
    "verenigd koninkrijk": "Verenigd Koninkrijk", "united kingdom": "Verenigd Koninkrijk", "uk": "Verenigd Koninkrijk", "großbritannien": "Verenigd Koninkrijk", "england": "Verenigd Koninkrijk"
  };

  function start() {
    var doos = document.getElementById("ebora-kijkglas");
    if (!doos || doos.getAttribute("data-gestart")) return;
    doos.setAttribute("data-gestart", "1");
    var bron = doos.getAttribute("data-src");
    /* Alleen een echt adres (https, of lokaal voor tests); anders niets tonen op de openbare pagina */
    if (!bron || !/^(https:\/\/[^.\s]+\.[^\s]+|http:\/\/(127\.0\.0\.1|localhost)[:\/][^\s]*)$/.test(bron)) return;
    var bronUrl = new URL(bron);
    var taal = doos.getAttribute("data-taal") || (document.documentElement.lang || "nl").slice(0, 2);
    bronUrl.searchParams.set("lang", taal);
    bronUrl.searchParams.set("ouder", location.origin);
    var formulierPagina = doos.getAttribute("data-formulier-pagina") || "/contact";

    function veld(doc, eind) {
      return doc.getElementById(eind) || doc.querySelector("[name$='$" + eind + "'], [id$='_" + eind + "']");
    }

    /* Melding na het versturen via een formulier op deze pagina zelf (de pagina herlaadt dan) */
    try {
      var verzonden = JSON.parse(sessionStorage.getItem("ebora-kijkglas-verzonden") || "null");
      if (verzonden) {
        sessionStorage.removeItem("ebora-kijkglas-verzonden");
        var m = document.createElement("div");
        m.setAttribute("role", "status");
        m.style.cssText = "margin:0 0 16px;padding:14px 18px;border-radius:10px;background:#ecfdf5;border:1px solid #10b981;color:#065f46;font-weight:600";
        m.textContent = (BEDANKT[verzonden.taal] || BEDANKT.nl).replace("{r}", verzonden.referentie);
        doos.parentNode.insertBefore(m, doos);
      }
    } catch (e) { /* geen sessionStorage */ }

    var frame = document.createElement("iframe");
    frame.src = bronUrl.href;
    frame.title = "Kijkglas-configurator";
    frame.style.cssText = "display:block;width:100%;border:0;border-radius:12px;background:#162330";
    var smal = false, gemeld = 0;
    function hoogte() {
      frame.style.height = (smal && gemeld ? gemeld : Math.max(640, Math.min(920, window.innerHeight - 40))) + "px";
    }
    hoogte();
    window.addEventListener("resize", hoogte);
    doos.appendChild(frame);

    function zet(el, waarde) {
      if (!el) return;
      el.value = waarde;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    function kiesLand(sel, land) {
      if (!sel || !land || !sel.options) return false;
      var l = land.trim().toLowerCase();
      var doel = (LANDEN[l] || land).trim().toLowerCase();
      for (var i = 0; i < sel.options.length; i++) {
        var o = sel.options[i];
        if (o.text.trim().toLowerCase() === doel || o.text.trim().toLowerCase() === l) { zet(sel, o.value); return true; }
      }
      return false;
    }
    function vul(doc, d) {
      var knopEl = veld(doc, VELDEN.knop), naamEl = veld(doc, VELDEN.naam), mailEl = veld(doc, VELDEN.email), berichtEl = veld(doc, VELDEN.bericht);
      if (!knopEl || !naamEl || !mailEl || !berichtEl) return null;
      zet(naamEl, String(d.naam || "").slice(0, 200));
      zet(veld(doc, VELDEN.bedrijf), String(d.bedrijf || "").slice(0, 200));
      zet(mailEl, String(d.email || "").slice(0, 200));
      zet(veld(doc, VELDEN.telefoon), String(d.telefoon || "").slice(0, 50));
      kiesLand(veld(doc, VELDEN.land), String(d.land || ""));
      zet(berichtEl, String(d.bericht || "").slice(0, 4000));
      return knopEl;
    }

    /* Versturen via het contactformulier op een andere pagina van ebora.nl, in een onzichtbaar venster */
    function viaContactpagina(d, klaar) {
      var f = document.createElement("iframe");
      f.setAttribute("aria-hidden", "true");
      f.tabIndex = -1;
      f.style.cssText = "position:absolute;left:-10000px;top:0;width:1000px;height:800px;border:0;visibility:hidden";
      var fase = "laden", tikken = 0, gedaan = false;
      function einde(ok, fout) {
        if (gedaan) return;
        gedaan = true;
        clearInterval(t);
        klaar(ok, fout);
        setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1000);
      }
      function doc() { try { return f.contentDocument; } catch (e) { return null; } }
      var t = setInterval(function () {
        tikken++;
        var dc = doc();
        if (fase === "laden") {
          if (dc && dc.readyState === "complete" && veld(dc, VELDEN.naam)) {
            var knop = vul(dc, d);
            if (!knop) return einde(false, "contactformulier niet compleet");
            fase = "versturen";
            dc.documentElement.setAttribute("data-eb-verstuurd", "1");
            knop.click();
            tikken = 0;
          } else if (tikken > 40) einde(false, "contactformulier niet bereikbaar");
          return;
        }
        /* fase versturen: wacht tot Logic4 de pagina na het versturen opnieuw heeft geladen */
        if (dc && dc.readyState === "complete" && !dc.documentElement.getAttribute("data-eb-verstuurd")) {
          /* Alleen "gelukt" als het echt de Logic4-pagina is (geen 403/blokkade van de beveiliging ervoor)
             en Logic4 het formulier niet met onze gegevens terugzet (= niet geaccepteerd). */
          var titel = (dc.title || "") + " " + ((dc.body && dc.body.innerText) || "").slice(0, 600);
          if (/attention required|you have been blocked|sorry, you have been blocked|just a moment|even geduld|beveiliging wordt geverifieerd|forbidden|error 403|access denied|toegang geweigerd|cloudflare/i.test(titel))
            return einde(false, "geblokkeerd door de beveiliging van de website");
          if (!dc.querySelector("[id^='ContentPlaceHolder1'], [name^='ctl00$ContentPlaceHolder1']"))
            return einde(false, "onverwachte pagina na versturen");
          var fouten = dc.querySelectorAll("[id*='validationSummary'], .validation-summary-errors, [id*='Validator']");
          for (var i = 0; i < fouten.length; i++) {
            if (fouten[i].offsetParent !== null && fouten[i].textContent.trim()) return einde(false, "Logic4: " + fouten[i].textContent.trim().slice(0, 150));
          }
          /* Logic4 toont na verzenden "Het bericht is verzonden!" en verbergt het formulier (gezien 15-11) */
          var tekstNa = (dc.body && dc.body.innerText) || "";
          if (/bericht is verzonden|nachricht wurde (gesendet|versendet|verschickt)|message has been sent/i.test(tekstNa)) return einde(true);
          var naamNa = veld(dc, VELDEN.naam);
          if (naamNa && naamNa.offsetParent !== null)
            return einde(false, "het formulier is niet verwerkt");
          return einde(true);
        }
        var oud = doc();
        var zichtbaar = oud && Array.prototype.some.call(oud.querySelectorAll("[id*='Validator'], [id*='validationSummary']"), function (v) { return v.offsetParent !== null && v.textContent.trim(); });
        if (zichtbaar && tikken >= 4) einde(false, "het formulier is niet geaccepteerd");
        else if (tikken > 60) einde(false, "geen antwoord van het contactformulier");
      }, 500);
      f.src = formulierPagina;
      document.body.appendChild(f);
    }

    window.addEventListener("message", function (ev) {
      if (ev.source !== frame.contentWindow || ev.origin !== bronUrl.origin) return;
      var d = ev.data || {};
      if (d.type === "ebora-kijkglas-hoogte") {
        smal = !!d.smal; gemeld = Math.max(400, Math.min(6000, Number(d.hoogte) || 0));
        hoogte();
        return;
      }
      if (d.type !== "ebora-kijkglas-aanvraag") return;
      var antwoord = function (ok, fout) {
        frame.contentWindow.postMessage({ type: "ebora-kijkglas-antwoord", referentie: d.referentie, ok: ok, fout: fout || "" }, bronUrl.origin);
      };
      /* Formulier op deze pagina zelf? Dan dat gebruiken. */
      if (veld(document, VELDEN.naam) && veld(document, VELDEN.knop)) {
        var knopHier = vul(document, d);
        if (!knopHier) return antwoord(false, "contactformulier niet compleet");
        try { sessionStorage.setItem("ebora-kijkglas-verzonden", JSON.stringify({ referentie: d.referentie, taal: d.taal })); } catch (e) { /* geen opslag */ }
        antwoord(true);
        setTimeout(function () { knopHier.click(); }, 400);
        return;
      }
      frame.contentWindow.postMessage({ type: "ebora-kijkglas-bezig", referentie: d.referentie }, bronUrl.origin);
      viaContactpagina(d, antwoord);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
