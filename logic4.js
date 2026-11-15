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
 *
 * Productpagina's van ACI-artikelen (merk ACI + Model in de specificaties): onder "Toevoegen aan offertelijst"
 * komt een knop die de configurator in een venster opent met het type van het artikel vooraf gekozen
 * (alleen als dat type in data/typen.json staat). Het artikel gaat mee in de aanvraag.
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

  /* Plek van de configurator: dezelfde map als dit script (GitHub Pages) */
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";
  var KNOP = {
    nl: "Andere uitvoering? Stel uw kijkglas samen",
    de: "Andere Ausführung? Schauglas konfigurieren",
    en: "Other version? Configure your sight glass"
  };
  var SLUITEN = { nl: "Sluiten", de: "Schließen", en: "Close" };

  /* ACI-productpagina van de Logic4-webshop: merk ACI en een Model in de specificatietabel */
  function aciProduct() {
    if (!document.body || !document.body.classList.contains("page-product")) return null;
    var merk = "", model = "", code = "";
    Array.prototype.forEach.call(document.querySelectorAll("tr"), function (tr) {
      var c = tr.children;
      if (c.length < 2) return;
      var label = c[0].textContent.trim().toLowerCase(), waarde = c[1].textContent.trim();
      if (/^(brand|merk|marke)$/.test(label)) merk = waarde;
      else if (/^(model|modell)$/.test(label)) model = waarde;
      else if (/^(product code|productcode|artikelnummer|produktcode)$/.test(label)) code = waarde;
    });
    if (merk.toUpperCase() !== "ACI" || !model) return null;
    var h1 = document.querySelector("h1");
    return {
      type: "typ-" + model.toLowerCase().replace(/^typ(e)?\s*/, "").replace(/\s+/g, ""),
      model: model, code: code, naam: h1 ? h1.textContent.trim() : "", pagina: location.href.split("#")[0]
    };
  }

  function start() {
    if (document.documentElement.getAttribute("data-eb-kijkglas")) return;
    var doos = document.getElementById("ebora-kijkglas");
    var product = doos ? null : aciProduct();
    if (!doos && !product) return;
    document.documentElement.setAttribute("data-eb-kijkglas", "1");
    var bron = doos ? doos.getAttribute("data-src") : (SCRIPT_SRC ? new URL(".", SCRIPT_SRC).href : "");
    /* Alleen een echt adres (https, of lokaal voor tests); anders niets tonen op de openbare pagina */
    if (!bron || !/^(https:\/\/[^.\s]+\.[^\s]+|http:\/\/(127\.0\.0\.1|localhost)[:\/][^\s]*)$/.test(bron)) return;
    var basisUrl = new URL(bron);
    var bronUrl = new URL(bron);
    var taal = (doos && doos.getAttribute("data-taal")) || (document.documentElement.lang || "nl").slice(0, 2);
    if (!KNOP[taal]) taal = "en";
    bronUrl.searchParams.set("lang", taal);
    bronUrl.searchParams.set("ouder", location.origin);
    var formulierPagina = (doos && doos.getAttribute("data-formulier-pagina")) || "/contact";
    var frames = [];   /* alle configurator-iframes op deze pagina: { frame, inline } */

    function veld(doc, eind) {
      return doc.getElementById(eind) || doc.querySelector("[name$='$" + eind + "'], [id$='_" + eind + "']");
    }

    function maakFrame(extra) {
      var u = new URL(bronUrl.href);
      Object.keys(extra || {}).forEach(function (k) { if (extra[k]) u.searchParams.set(k, String(extra[k]).slice(0, 300)); });
      var f = document.createElement("iframe");
      f.src = u.href;
      f.title = "Kijkglas-configurator";
      f.style.cssText = "display:block;width:100%;border:0;background:#122d49";
      return f;
    }

    var smal = false, gemeld = 0, inlineFrame = null;
    function hoogte() {
      if (inlineFrame) inlineFrame.style.height = (smal && gemeld ? gemeld : Math.max(640, Math.min(920, window.innerHeight - 40))) + "px";
    }
    if (doos) {
      inlineFrame = maakFrame();
      inlineFrame.style.borderRadius = "12px";
      frames.push({ frame: inlineFrame, inline: true });
      hoogte();
      window.addEventListener("resize", hoogte);
      doos.appendChild(inlineFrame);
    }

    /* Productpagina: knop onder "Toevoegen aan offertelijst" die de configurator in een venster opent,
       met het type van dit artikel vooraf gekozen. Alleen als dat type in de configurator bestaat. */
    if (product) {
      fetch(new URL("data/typen.json", basisUrl).href, { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (typen) {
        if (!Array.isArray(typen) || typen.indexOf(product.type) < 0) return;
        var anker = document.querySelector(".btn-prodaanvraag");
        if (!anker) return;
        var knop = document.createElement("a");
        knop.href = "#";
        knop.className = "btn eb-kijkglas-knop";
        knop.textContent = KNOP[taal];
        knop.style.cssText = "display:block;width:100%;box-sizing:border-box;margin-top:8px;padding:10px 12px;text-align:center;border:2px solid #c64061;border-radius:4px;background:#fff;color:#c64061;font-weight:700;text-decoration:none;cursor:pointer";
        anker.parentNode.insertBefore(knop, anker.nextSibling);
        var scherm = null, vorigOverflow = "";
        function sluit() { if (scherm) { scherm.style.display = "none"; document.body.style.overflow = vorigOverflow; } }
        knop.addEventListener("click", function (ev) {
          ev.preventDefault();
          if (!scherm) {
            scherm = document.createElement("div");
            scherm.setAttribute("role", "dialog");
            scherm.setAttribute("aria-modal", "true");
            scherm.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(13,34,56,.65);display:flex;align-items:center;justify-content:center";
            var paneel = document.createElement("div");
            var klein = window.innerWidth <= 760;
            paneel.style.cssText = "position:relative;background:#122d49;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35);" +
              (klein ? "width:100vw;height:100vh;border-radius:0" : "width:min(1240px,96vw);height:min(900px,94vh);border-radius:12px");
            var dicht = document.createElement("button");
            dicht.type = "button";
            dicht.setAttribute("aria-label", SLUITEN[taal]);
            dicht.title = SLUITEN[taal];
            dicht.textContent = "×";
            dicht.style.cssText = "position:absolute;top:8px;right:10px;z-index:2;width:38px;height:38px;border:0;border-radius:50%;background:#fff;color:#122d49;font:700 24px/38px Arial,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)";
            dicht.addEventListener("click", sluit);
            scherm.addEventListener("click", function (e) { if (e.target === scherm) sluit(); });
            document.addEventListener("keydown", function (e) { if (e.key === "Escape") sluit(); });
            var f = maakFrame({ type: product.type, artikel: product.code, artikelnaam: product.naam, pagina: product.pagina });
            f.style.height = "100%";
            frames.push({ frame: f, inline: false, sluit: sluit });
            paneel.appendChild(f);
            paneel.appendChild(dicht);
            scherm.appendChild(paneel);
            document.body.appendChild(scherm);
          }
          vorigOverflow = document.body.style.overflow;
          document.body.style.overflow = "hidden";
          scherm.style.display = "flex";
        });
      }).catch(function () { /* configurator niet bereikbaar: geen knop */ });
    }

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

    /* Versturen via het contactformulier op een andere pagina van ebora.nl, in een onzichtbaar venster.
       Logic4 weigert een formulier dat te snel na het laden wordt verstuurd (verborgen veld hdPageLoad):
       daarom wordt /contact al geladen zodra de klant bij de laatste stap komt, en pas verstuurd als het
       formulier minstens MIN_WACHT geladen is. Met ?kijkglasdebug=1 is het venster zichtbaar. */
    var MIN_WACHT = 15000, MAX_OUD = 20 * 60000;
    var debug = /[?&]kijkglasdebug=1\b/.test(location.search);
    var voor = null, logvak = null, t0 = Date.now();
    function log(tekst) {
      if (!debug) return;
      try { console.log("[kijkglas]", tekst); } catch (e) { /* */ }
      if (!logvak) {
        logvak = document.createElement("pre");
        logvak.style.cssText = "position:fixed;left:10px;bottom:396px;width:520px;max-height:200px;overflow:auto;margin:0;padding:8px 10px;background:#111827;color:#a7f3d0;font:12px/1.4 Consolas,monospace;z-index:2147483647;white-space:pre-wrap;border:3px solid #cf222e;border-bottom:0";
        document.body.appendChild(logvak);
      }
      logvak.textContent += ((Date.now() - t0) / 1000).toFixed(1) + " s  " + tekst + String.fromCharCode(10);
      logvak.scrollTop = logvak.scrollHeight;
    }
    function voorbereid() {
      if (voor && Date.now() - voor.start < MAX_OUD) return voor;
      if (voor && voor.f.parentNode) voor.f.parentNode.removeChild(voor.f);
      var f = document.createElement("iframe");
      f.setAttribute("aria-hidden", "true");
      f.tabIndex = -1;
      f.style.cssText = debug
        ? "position:fixed;left:10px;bottom:10px;width:520px;height:380px;border:3px solid #cf222e;background:#fff;z-index:2147483647"
        : "position:absolute;left:-10000px;top:0;width:1000px;height:800px;border:0;visibility:hidden";
      var v = { f: f, start: Date.now(), klaarOp: 0 };
      f.addEventListener("load", function () {
        var dl = null; try { dl = f.contentDocument; } catch (e) { /* */ }
        log("venster geladen: " + (dl ? (dl.title || "(geen titel)") + " | formulier: " + (dl.getElementById ? !!veld(dl, VELDEN.naam) : "?") + " | 'verzonden' in tekst: " + /bericht is verzonden/i.test((dl.body && dl.body.innerText) || "") : "geen toegang"));
        if (!v.klaarOp) v.klaarOp = Date.now();
      });
      log("contactformulier laden: " + formulierPagina);
      f.src = formulierPagina;
      document.body.appendChild(f);
      voor = v;
      return v;
    }

    function viaContactpagina(d, klaar) {
      var v = voorbereid();
      voor = null;   /* elke aanvraag een eigen formulier */
      var f = v.f;
      var fase = "laden", tikken = 0, gedaan = false;
      function einde(ok, fout) {
        if (gedaan) return;
        gedaan = true;
        clearInterval(t);
        log("UITKOMST: " + (ok ? "gelukt" : "NIET gelukt: " + (fout || "")));
        klaar(ok, fout);
        if (!debug) setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1000);
      }
      function doc() { try { return f.contentDocument; } catch (e) { return null; } }
      var t = setInterval(function () {
        tikken++;
        var dc = doc();
        if (fase === "laden") {
          var klaarVoor = dc && dc.readyState === "complete" && veld(dc, VELDEN.naam) && v.klaarOp;
          if (klaarVoor && Date.now() - v.klaarOp >= MIN_WACHT) {
            var knop = vul(dc, d);
            if (!knop) return einde(false, "contactformulier niet compleet");
            var hd = dc.querySelector("[name$='hdPageLoad']");
            log("ingevuld, nu versturen (formulier " + Math.round((Date.now() - v.klaarOp) / 1000) + " s geladen; hdPageLoad=" + (hd ? hd.value : "?") + "; berichtlengte " + String(d.bericht || "").length + ")");
            /* Zelf versturen (een kunstmatige klik in het venster werd op ebora.nl niet verstuurd, 15-11):
               dezelfde velden als bij een klik, inclusief __VIEWSTATE/__EVENTVALIDATION/hdPageLoad en de knop. */
            fase = "fetch";
            clearInterval(t);
            var form = knop.form;
            var gegevens = new URLSearchParams();
            Array.prototype.forEach.call(form.elements, function (el) {
              if (!el.name || el.disabled) return;
              if ((el.type === "submit" || el.type === "button" || el.type === "image") && el !== knop) return;
              if ((el.type === "checkbox" || el.type === "radio") && !el.checked) return;
              if (el.tagName === "SELECT" && el.multiple) {
                Array.prototype.forEach.call(el.options, function (o) { if (o.selected) gegevens.append(el.name, o.value); });
                return;
              }
              gegevens.append(el.name, el.value);
            });
            var actie = form.getAttribute("action") ? new URL(form.getAttribute("action"), dc.location.href).href : dc.location.href;
            log("versturen naar " + actie + " (" + gegevens.toString().length + " tekens)");
            fetch(actie, {
              method: "POST", credentials: "same-origin", redirect: "follow",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: gegevens.toString()
            }).then(function (r) {
              return r.text().then(function (html) {
                log("antwoord Logic4: status " + r.status + (r.redirected ? " (doorverwezen naar " + r.url + ")" : "") + ", " + html.length + " tekens");
                beoordeel(r.status, html);
              });
            }).catch(function (e) {
              log("versturen mislukt: " + e);
              einde(false, "versturen mislukt");
            });
          } else if (tikken > 70) einde(false, "contactformulier niet bereikbaar");
          return;
        }
      }, 500);

      /* Antwoord van Logic4 beoordelen: alleen "gelukt" bij de melding "Het bericht is verzonden!" */
      function beoordeel(status, html) {
        var pd = new DOMParser().parseFromString(html, "text/html");
        var tekst = ((pd.title || "") + " " + ((pd.body && pd.body.textContent) || "")).replace(/\s+/g, " ");
        if (/bericht is verzonden|nachricht wurde (gesendet|versendet|verschickt)|message has been sent/i.test(tekst)) return einde(true);
        if (status === 403 || /attention required|you have been blocked|just a moment|beveiliging wordt geverifieerd|cloudflare/i.test(tekst))
          return einde(false, "geblokkeerd door de beveiliging van de website (status " + status + ")");
        if (status >= 400) return einde(false, "fout van de website (status " + status + ")");
        var samenvatting = pd.querySelector("[id*='validationSummary']");
        var melding = samenvatting && samenvatting.textContent.replace(/\s+/g, " ").trim();
        if (melding) log("melding van Logic4: " + melding.slice(0, 300));
        var naamNa = pd.getElementById(VELDEN.naam) || pd.querySelector("[name$='$" + VELDEN.naam + "']");
        log("formulier na versturen nog aanwezig: " + !!naamNa + (naamNa ? " (naam-veld: '" + (naamNa.getAttribute("value") || "") + "')" : ""));
        einde(false, melding ? "Logic4: " + melding.slice(0, 150) : "het formulier is niet verwerkt");
      }
    }

    window.addEventListener("message", function (ev) {
      if (ev.origin !== bronUrl.origin) return;
      var bijFrame = null;
      for (var i = 0; i < frames.length; i++) if (frames[i].frame.contentWindow === ev.source) bijFrame = frames[i];
      if (!bijFrame) return;
      var venster = bijFrame.frame.contentWindow;
      var d = ev.data || {};
      if (d.type === "ebora-kijkglas-hoogte") {
        if (bijFrame.inline) { smal = !!d.smal; gemeld = Math.max(400, Math.min(6000, Number(d.hoogte) || 0)); hoogte(); }
        return;
      }
      if (d.type === "ebora-kijkglas-laatste-stap") { voorbereid(); return; }
      if (d.type === "ebora-kijkglas-esc") { if (bijFrame.sluit) bijFrame.sluit(); return; }
      if (d.type !== "ebora-kijkglas-aanvraag") return;
      var antwoord = function (ok, fout) {
        venster.postMessage({ type: "ebora-kijkglas-antwoord", referentie: d.referentie, ok: ok, fout: fout || "" }, bronUrl.origin);
      };
      venster.postMessage({ type: "ebora-kijkglas-bezig", referentie: d.referentie }, bronUrl.origin);
      viaContactpagina(d, antwoord);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
