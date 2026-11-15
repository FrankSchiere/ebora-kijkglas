/* Kijkglas-configurator (Ebora) op basis van de configuratiegegevens van ACI Industriearmaturen.
 *
 * De keuzelogica volgt die van ACI's eigen configurator (config-logic.js / script.js op
 * konfigurator.aci24.com), zodat precies dezelfde combinaties mogelijk zijn:
 *  - een optie is zichtbaar als haar visibleWhen-regels kloppen met de eerdere keuzes;
 *  - voor elke al gekozen eerdere stap MOET de optie een regel hebben (anders verborgen);
 *  - een optie is alleen kiesbaar als er daarna nog minstens één producttype mogelijk is;
 *  - een stap wordt overgeslagen als alle nog mogelijke typen die stap op "__SKIP__" hebben.
 *
 * Drietalig (NL/DE/EN): Duits en Engels komen uit ACI's gegevens, Nederlands uit onze vertaaltabel.
 */
(function () {
  "use strict";

  const S = window.KIJKGLAS || {};
  let config = null;
  let tabel = {};
  let correcties = {};  // {de: {bron: tekst}, en: {...}} — fouten in ACI's eigen teksten
  let keuzes = {};      // stapsleutel -> optie-object
  let huidig = 0;       // index in config.steps
  let vastType = null;
  let bestelcodes = {}; // ACI-bestelcode per type (uit de ACI-databladen): segmenten vast of uit een stap  // ?type=typ-318 (vanaf een productpagina): alleen opties die bij dit type passen
  const URLP = new URLSearchParams(location.search);
  const ARTIKEL = {     // productpagina waar de klant vandaan kwam (gaat mee in de aanvraag)
    code: (URLP.get("artikel") || "").slice(0, 60), naam: (URLP.get("artikelnaam") || "").slice(0, 200),
    pagina: (URLP.get("pagina") || "").slice(0, 300),
  };

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, tekst) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tekst != null) e.textContent = tekst;
    return e;
  };

  // ── Taal ────────────────────────────────────────────────────────────────────────────────────────
  const TALEN = { nl: "Nederlands", de: "Deutsch", en: "English" };
  const UI = {
    nl: {
      paginatitel: "Kijkglas-configurator — Ebora", titel: "Kijkglas-configurator", distributeur: "Distributeur van", sub: "Stel uw kijkglas op maat samen", alleTypen: "← Alle kijkglazen bekijken",
      titelType: "Configuratie voor {t}", laatsteStap: "Uw configuratie afronden", vorige: "← Vorige stap",
      aanzichten: ["Vooraanzicht", "Bovenaanzicht", "Perspectief"], afspelen: "Autoplay", stop: "Stop",
      taal: "Taal", opnieuw: "Opnieuw beginnen", mailOns: "Vragen? Mail ons",
      zoek: "Optie zoeken…", geenResultaat: "Geen opties gevonden.",
      geenOpties: "Met deze keuzes is er geen standaarduitvoering. Wij denken graag mee over een oplossing op maat.",
      bel: "Bel", ofMail: "of mail", mail: "Mail",
      uwConfig: "Uw configuratie", code: "ACI-bestelcode", codeControle: "ter controle", codeOpen: "wordt bij de offerte bepaald", prijs: "Prijs:", prijsAanvraag: "Wordt op aanvraag berekend",
      prijsNoot: "De prijs ontvangt u in de vorm van een persoonlijke, kosteloze offerte van ons.",
      aanvraagTitel: "Aanvraag versturen",
      aanvraagIntro: "Verstuur nu uw aanvraag en ontvang snel een persoonlijke, kosteloze en vrijblijvende offerte van ons.",
      aanhef: "Aanhef", aanhefOpties: ["Dhr.", "Mevr.", "Anders"], kies: "Maak een keuze",
      voornaam: "Voornaam", achternaam: "Achternaam", bedrijf: "Bedrijf", land: "Land", landPh: "bijv. Nederland",
      email: "E-mail", emailPh: "naam@bedrijf.nl", telefoon: "Telefoon", telPh: "+31 6 12345678", aantal: "Aantal",
      bericht: "Bericht", berichtPh: "Medium, toepassing, gewenste levertijd…",
      akkoord: ["Ik heb de ", "privacyverklaring", " gelezen en ga akkoord met de verwerking van mijn gegevens (naam, e-mail, telefoon) door Ebora en fabrikant ACI Industriearmaturen GmbH (die een kopie van mijn aanvraag ontvangt) voor het behandelen van mijn aanvraag. Ik ken mijn rechten (inzage, verwijdering, bezwaar) volgens art. 15–22 AVG."],
      knop: "Gratis offerte aanvragen", bezig: "Bezig met versturen…", mislukt: "Versturen is niet gelukt",
      bedankt: "Bedankt voor uw aanvraag!", bedanktTekst: "Wij hebben uw aanvraag ontvangen (referentie {r}). U ontvangt zo snel mogelijk een offerte van ons.",
      offlineTitel: "Tijdelijk niet beschikbaar", offlineTekst: "De kijkglas-configurator wordt bijgewerkt. Wij helpen u graag persoonlijk verder.",
      voet: "Productgegevens: ACI Industriearmaturen GmbH",
    },
    de: {
      paginatitel: "Schauglas-Konfigurator — Ebora", titel: "Schauglas-Konfigurator", distributeur: "Vertriebspartner von", sub: "Konfigurieren Sie Ihr individuelles Schauglas nach Maß", alleTypen: "← Alle Schaugläser anzeigen",
      titelType: "Konfiguration für {t}", laatsteStap: "Ihre Konfiguration abschließen", vorige: "← Zurück",
      aanzichten: ["Frontansicht", "Draufsicht", "Perspektive"], afspelen: "Autoplay", stop: "Stop",
      taal: "Sprache", opnieuw: "Neu starten", mailOns: "Fragen? Schreiben Sie uns",
      zoek: "Option suchen…", geenResultaat: "Keine Optionen gefunden.",
      geenOpties: "Für diese Auswahl gibt es keine Standardausführung. Gerne finden wir gemeinsam mit Ihnen eine individuelle Lösung.",
      bel: "Rufen Sie an:", ofMail: "oder schreiben Sie an", mail: "Schreiben Sie an",
      uwConfig: "Ihre Konfiguration", code: "ACI-Bestellcode", codeControle: "zur Kontrolle", codeOpen: "wird im Angebot festgelegt", prijs: "Preis:", prijsAanvraag: "Wird nach Anfrage kalkuliert",
      prijsNoot: "Den Endpreis erhalten Sie in Form eines individuellen und kostenlosen Angebots von uns.",
      aanvraagTitel: "Anfrage senden",
      aanvraagIntro: "Senden Sie jetzt Ihre Anfrage und erhalten Sie zeitnah ein individuelles, kostenloses und unverbindliches Angebot von uns.",
      aanhef: "Anrede", aanhefOpties: ["Herr", "Frau", "Divers"], kies: "Bitte wählen",
      voornaam: "Vorname", achternaam: "Nachname", bedrijf: "Firma", land: "Land", landPh: "z. B. Deutschland",
      email: "E-Mail", emailPh: "name@firma.de", telefoon: "Telefon", telPh: "+49 123 456789", aantal: "Menge",
      bericht: "Nachricht", berichtPh: "Medium, Anwendung, gewünschte Lieferzeit…",
      akkoord: ["Ich habe die ", "Datenschutzerklärung", " gelesen und stimme der Verarbeitung meiner Daten (Name, E-Mail, Telefon) durch Ebora und den Hersteller ACI Industriearmaturen GmbH (der eine Kopie meiner Anfrage erhält) zur Bearbeitung meiner Anfrage zu. Mir sind meine Betroffenenrechte (Auskunft, Löschung, Widerspruch) gemäß Art. 15–22 DSGVO bekannt."],
      knop: "Kostenloses Angebot anfordern", bezig: "Wird gesendet…", mislukt: "Senden fehlgeschlagen",
      bedankt: "Vielen Dank für Ihre Anfrage!", bedanktTekst: "Wir haben Ihre Anfrage erhalten (Referenz {r}). Sie erhalten schnellstmöglich ein Angebot von uns.",
      offlineTitel: "Vorübergehend nicht verfügbar", offlineTekst: "Der Schauglas-Konfigurator wird aktualisiert. Gerne helfen wir Ihnen persönlich weiter.",
      voet: "Produktdaten: ACI Industriearmaturen GmbH",
    },
    en: {
      paginatitel: "Sight glass configurator — Ebora", titel: "Sight glass configurator", distributeur: "Distributor of", sub: "Configure your custom sight glass", alleTypen: "← View all sight glasses",
      titelType: "Configuration for {t}", laatsteStap: "Complete your configuration", vorige: "← Back",
      aanzichten: ["Front view", "Top view", "Perspective"], afspelen: "Autoplay", stop: "Stop",
      taal: "Language", opnieuw: "Start over", mailOns: "Questions? Email us",
      zoek: "Search option…", geenResultaat: "No options found.",
      geenOpties: "There is no standard version for this selection. We are happy to work out a custom solution with you.",
      bel: "Call", ofMail: "or email", mail: "Email",
      uwConfig: "Your configuration", code: "ACI order code", codeControle: "for verification", codeOpen: "determined in the quotation", prijs: "Price:", prijsAanvraag: "Calculated on request",
      prijsNoot: "You will receive the final price as a personal, free quotation from us.",
      aanvraagTitel: "Send request",
      aanvraagIntro: "Send your request now and promptly receive a personal, free and non-binding quotation from us.",
      aanhef: "Salutation", aanhefOpties: ["Mr", "Ms", "Other"], kies: "Please select",
      voornaam: "First name", achternaam: "Last name", bedrijf: "Company", land: "Country", landPh: "e.g. Netherlands",
      email: "Email", emailPh: "name@company.com", telefoon: "Phone", telPh: "+31 6 12345678", aantal: "Quantity",
      bericht: "Message", berichtPh: "Medium, application, required delivery time…",
      akkoord: ["I have read the ", "privacy policy", " and agree to Ebora and the manufacturer ACI Industriearmaturen GmbH (which receives a copy of my request) processing my data (name, email, phone) to handle my request. I am aware of my rights (access, erasure, objection) under Art. 15–22 GDPR."],
      knop: "Request free quotation", bezig: "Sending…", mislukt: "Sending failed",
      bedankt: "Thank you for your request!", bedanktTekst: "We have received your request (reference {r}). You will receive a quotation from us as soon as possible.",
      offlineTitel: "Temporarily unavailable", offlineTekst: "The sight glass configurator is being updated. We are happy to help you personally.",
      voet: "Product data: ACI Industriearmaturen GmbH",
    },
  };

  function begintaal() {
    const uitUrl = new URLSearchParams(location.search).get("lang");
    if (TALEN[uitUrl]) return uitUrl;
    try { const b = localStorage.getItem("kijkglas_taal"); if (TALEN[b]) return b; } catch (e) { /* geen opslag */ }
    const nav = (navigator.language || "nl").slice(0, 2).toLowerCase();
    return TALEN[nav] ? nav : "nl";
  }
  let taal = begintaal();

  function t(sleutel, vars) {
    let s = (UI[taal] && UI[taal][sleutel]) ?? UI.nl[sleutel];
    if (typeof s === "string" && vars) Object.keys(vars).forEach((k) => { s = s.replace("{" + k + "}", vars[k]); });
    return s;
  }

  // ── Vertalen van ACI-teksten ───────────────────────────────────────────────────────────────────
  // NL: zelfde regels als vertaal() in aci_kijkglas_sync.py — bij wijzigen beide aanpassen.
  const PATRONEN = [
    [/^bis (.+) bar$/, "tot $1 bar"],
    [/^bis (.+) °C$/, "tot $1 °C"],
    [/^Baulänge (.+)$/, "Inbouwlengte $1"],
    [/^Typ (.+)$/, "Type $1"],
    [/^Entspricht PS max\. (.+)$/, "Komt overeen met PS max. $1"],
    [/^max\. Temperatur (.+)$/, "max. temperatuur $1"],
  ];
  const ONVERTAALBAAR = /^(DN|PN|Class|G|NPS|NPT|Ø|EPDM|FKM|NBR|PTFE|KLINGERSIL|novaflon|Metaglas)(?![\p{L}\p{N}_])/u;
  const norm = (s) => String(s || "").split(/\s+/).filter(Boolean).join(" ");

  // EN: ACI's eigen Engelse veld, behalve waar dat aantoonbaar fout is (zie correcties en dit patroon:
  // bij "Baulänge … mm" staat in ACI's gegevens "Neue Option" als Engelse naam).
  const PATRONEN_EN = [[/^Baulänge (.+)$/, "Overall length $1"]];
  const heeft = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  // i18n = ACI's {de, en}-veld; vrij = ACI's losse veld (title/name). ACI's eigen Duitse weergave gebruikt
  // het losse veld (bv. "Flanschanschluss EN 1092-1" terwijl name_i18n.de alleen "Flansch" is), dus dat is
  // onze bron — ook als sleutel voor de NL-tabel en de correcties (zelfde als bron_de() in aci_kijkglas_sync.py).
  function vertaal(i18n, vrij) {
    i18n = i18n || {};
    const bron = norm(vrij || i18n.de);
    if (!bron) return "";
    const corr = correcties[taal] || {};
    if (taal !== "nl" && heeft(corr, bron)) return corr[bron];
    if (taal === "de") return bron;
    if (taal === "en") {
      for (const [p, v] of PATRONEN_EN) if (p.test(bron)) return bron.replace(p, v);
      return norm(i18n.en) || bron;
    }
    if (heeft(tabel, bron)) return tabel[bron];
    for (const [p, v] of PATRONEN) if (p.test(bron)) return bron.replace(p, v);
    if (ONVERTAALBAAR.test(bron)) return bron;
    // nog niet vertaald: Engels (gecorrigeerd waar nodig), anders Duits
    return (correcties.en && correcties.en[bron]) || norm(i18n.en) || bron;
  }

  // ── Keuzelogica (overgenomen van ACI) ───────────────────────────────────────────────────────────
  const stapVolgorde = () => config.steps.map((s) => s.key);
  const stapMet = (key) => config.steps.find((s) => s.key === key) || null;
  const heeftRegels = (o) => o && o.visibleWhen && typeof o.visibleWhen === "object"
    && !Array.isArray(o.visibleWhen) && Object.keys(o.visibleWhen).length > 0;
  const gekozenId = (x) => (x && typeof x === "object" ? x.id : (typeof x === "string" ? x : null));

  function typePool(sel) {
    const t = stapMet("type");
    if (!t || !t.options) return [];
    const cat = sel.category ? sel.category.id : null;
    const pool = cat && Array.isArray(t.options[cat]) ? t.options[cat] : Object.values(t.options).filter(Array.isArray).flat();
    return vastType ? pool.filter((x) => x.id === vastType) : pool;
  }

  // Bij een vast type: stappen met maar één mogelijke keuze vooraf invullen, beginnen bij de eerste echte keuze
  function vulVooraf() {
    if (!vastType) return;
    for (let i = 0; i < config.steps.length; i++) {
      const s = config.steps[i];
      if (s.isFinal) { huidig = i; return; }
      if (overslaan(s.key)) continue;
      const opts = optiesVoor(s);
      if (opts.length === 1) { keuzes[s.key] = opts[0]; continue; }
      huidig = i;
      return;
    }
  }

  function vastTypeNaam() {
    if (!vastType) return "";
    const t = stapMet("type");
    const o = Object.values((t && t.options) || {}).filter(Array.isArray).flat().find((x) => x.id === vastType);
    return o ? vertaal(o.name_i18n, o.name) : "";
  }

  function klopt(optie, sel, strikt, voorStap) {
    if (!heeftRegels(optie)) return true;
    const volgorde = stapVolgorde();
    const voorIdx = voorStap ? volgorde.indexOf(voorStap) : -1;
    return Object.keys(optie.visibleWhen).every((regel) => {
      const toegestaan = Array.isArray(optie.visibleWhen[regel]) ? optie.visibleWhen[regel] : [];
      if (!toegestaan.length || toegestaan.includes("__SKIP__")) return true;
      const gekozen = sel[regel];
      if (!strikt && !gekozen) return true;
      if (!gekozen && voorIdx >= 0) {
        const regelIdx = volgorde.indexOf(regel);
        if (regelIdx >= 0 && regelIdx > voorIdx) return true;
      }
      if (!gekozen && overslaan(regel, voorStap)) return true;
      const id = gekozenId(gekozen);
      return Boolean(id && toegestaan.includes(id));
    });
  }

  function haalbaar(optie, stap) {
    if (stap.key === "type") return true;
    const idx = config.steps.findIndex((s) => s.key === stap.key);
    const test = {};
    config.steps.forEach((s, i) => { if (i < idx && keuzes[s.key]) test[s.key] = keuzes[s.key]; });
    test[stap.key] = optie;
    return typePool(test).some((t) => klopt(t, test, false, stap.key));
  }

  // ── Extra stappen van Ebora (wisser, uitvoering, mantel): opties per type uit de ACI-databladen ──
  let bcExtra = {}, bcCatalogus = {};
  const extraOptieCache = {};
  function extraOpties(key) {
    const typeId = keuzes.type ? keuzes.type.id : vastType;
    const ids = ((typeId && bcExtra[typeId]) || {})[key] || [];
    return ids.filter((id) => {
      const c = bcCatalogus[id];
      if (!c) return false;
      return Object.entries(c.alleen_bij || {}).every(([st, mag]) => keuzes[st] && mag.includes(keuzes[st].id));
    }).map((id) => {
      if (!extraOptieCache[id]) {
        const c = bcCatalogus[id];
        extraOptieCache[id] = { id, name: c.de, name_i18n: { de: c.de, en: c.en } };
      }
      return extraOptieCache[id];
    });
  }

  function overslaan(stapKey, bezig) {
    if (!stapKey || stapKey === "type") return false;
    const st = stapMet(stapKey);
    if (st && st.isExtra) return extraOpties(stapKey).length <= 1;
    const pool = typePool(keuzes).filter((t) => klopt(t, keuzes, false, bezig || null));
    if (!pool.length) return false;
    return pool.every((t) => t.visibleWhen && Array.isArray(t.visibleWhen[stapKey])
      && t.visibleWhen[stapKey].includes("__SKIP__"));
  }

  function optiesVoor(stap) {
    if (stap.isExtra) return extraOpties(stap.key);
    let lijst;
    if (Array.isArray(stap.options)) lijst = stap.options;
    else {
      const cat = keuzes.category ? keuzes.category.id : null;
      if (!cat || !stap.options || !Array.isArray(stap.options[cat])) return [];
      lijst = stap.options[cat];
    }
    if (stap.key === "type" && vastType) lijst = lijst.filter((o) => o.id === vastType);
    const volgorde = stapVolgorde();
    const idx = volgorde.indexOf(stap.key);
    const verleden = volgorde.slice(0, Math.max(idx, 0)).filter((k) => keuzes[k]);
    return lijst.filter((o) => {
      if (heeftRegels(o) && !klopt(o, keuzes, true, stap.key)) return false;
      const regels = (o && o.visibleWhen && typeof o.visibleWhen === "object") ? o.visibleWhen : {};
      for (const k of verleden) {
        const r = regels[k];
        if (Array.isArray(r) && r.includes("__SKIP__")) continue;
        if (!r && overslaan(k, stap.key)) continue;
        if (!Array.isArray(r) || !r.length) return false;
      }
      return haalbaar(o, stap);
    });
  }

  function wisNa(key) {
    const i = config.steps.findIndex((s) => s.key === key);
    for (let j = i + 1; j < config.steps.length; j++) {
      if (!config.steps[j].isFinal) delete keuzes[config.steps[j].key];
    }
  }

  // Volgende stap die getoond moet worden (overgeslagen stappen overspringen)
  function volgendeVanaf(i) {
    while (i < config.steps.length - 1 && overslaan(config.steps[i].key)) i++;
    return i;
  }


  // ── Weergave (opbouw zoals ACI: stap-iconen, lijstkaarten, zwevend productbeeld) ─────────────────
  const afb = (pad) => (pad && pad.startsWith("/") ? (S.afbeeldingBasis || "") + pad : null);
  const svg = (inhoud) => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.innerHTML = inhoud;
    return s;
  };

  // Enkele iconen geeft ACI als Lucide-naam i.p.v. als bestand; die tekenen we zelf.
  const LUCIDE = {
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    circle: '<circle cx="12" cy="12" r="10"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  };
  function icoon(naam) {
    const pad = afb(naam);
    if (pad) { const i = el("img"); i.src = pad; i.alt = ""; return i; }
    return svg(LUCIDE[naam] || LUCIDE.circle);
  }

  let aanzicht = 0;
  let heldSleutel = "";
  let heldPaden = [];
  let diashow = null;

  function kies(stap, optie) {
    const vorige = keuzes[stap.key];
    keuzes[stap.key] = optie;
    if (!vorige || vorige.id !== optie.id) wisNa(stap.key);
    huidig = volgendeVanaf(Math.min(huidig + 1, config.steps.length - 1));
    const held = $("held");
    held.classList.add("puls");
    setTimeout(() => held.classList.remove("puls"), 300);
    document.querySelectorAll("#opties .kaart").forEach((k) => k.classList.toggle("gekozen", k.dataset.id === optie.id));
    setTimeout(teken, 250);   // even het vinkje laten zien, net als bij ACI
  }

  function tekenStappen() {
    const nav = $("stappen");
    nav.textContent = "";
    let bereikbaar = true;
    config.steps.forEach((s, i) => {
      const overgeslagen = !s.isFinal && !keuzes[s.key] && overslaan(s.key);
      const b = el("button", "stapblok" + (i === huidig ? " actief" : "") + (keuzes[s.key] ? " klaar" : "")
        + (overgeslagen ? " overgeslagen" : ""));
      b.type = "button";
      b.title = vertaal(s.title_i18n, s.title) + (keuzes[s.key] ? ": " + vertaal(keuzes[s.key].name_i18n, keuzes[s.key].name) : "");
      b.setAttribute("aria-label", b.title);
      b.append(icoon(s.icon));
      b.disabled = !bereikbaar || overgeslagen;
      if (s.isExtra && overgeslagen) b.hidden = true;   // extra stap die bij dit type niet bestaat: niet tonen
      b.addEventListener("click", () => { huidig = i; teken(); });
      nav.append(b);
      if (!s.isFinal && !keuzes[s.key] && !overgeslagen) bereikbaar = false;
    });
    const actief = nav.children[huidig];
    if (actief) actief.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function optieKaart(stap, o) {
    const kaart = el("button", "kaart" + (keuzes[stap.key] && keuzes[stap.key].id === o.id ? " gekozen" : ""));
    kaart.type = "button";
    kaart.dataset.id = o.id;
    const foto = afb((o.images || [])[0]);
    if (foto) {
      const m = el("div", "media");
      const i = el("img"); i.src = foto; i.alt = ""; i.loading = "lazy";
      m.append(i);
      kaart.append(m);
    } else {
      const m = el("div", "icoon");
      m.append(icoon((o.icon && o.icon.startsWith("/")) ? o.icon : (stap.optionIconDefault || o.icon || stap.icon)));
      kaart.append(m);
    }
    const tekst = el("div", "details");
    tekst.append(el("div", "naam", vertaal(o.name_i18n, o.name)));
    const oms = vertaal(o.description_i18n);
    if (oms) tekst.append(el("div", "oms", oms));
    const tip = vertaal(o.tip_i18n) || vertaal(o.hint_i18n);
    if (tip) tekst.append(el("div", "tip", tip));
    kaart.append(tekst);
    kaart.addEventListener("click", () => kies(stap, o));
    // Zoals ACI: bij aanwijzen van een type (of categorie) het grote productbeeld als voorbeeld tonen
    if (foto && (stap.key === "type" || stap.key === "category")) {
      kaart.addEventListener("mouseenter", () => toonVoorbeeld(foto));
      kaart.addEventListener("mouseleave", stopVoorbeeld);
    }
    return kaart;
  }

  function toonVoorbeeld(src) {
    const held = $("held");
    stopVoorbeeld();
    const img = el("img", "voorbeeld-img");
    img.src = src; img.alt = "";
    held.append(img);
    held.classList.add("voorbeeld");
  }

  function stopVoorbeeld() {
    const held = $("held");
    held.classList.remove("voorbeeld");
    held.querySelectorAll(".voorbeeld-img").forEach((i) => i.remove());
  }

  const ZOEK_VANAF = 11;   // zelfde drempel als ACI
  function zoekveld(doos) {
    const w = el("div", "zoek");
    const i = el("input");
    i.type = "search";
    i.placeholder = t("zoek");
    i.setAttribute("aria-label", t("zoek"));
    const geen = el("div", "geen-resultaat", t("geenResultaat"));
    geen.hidden = true;
    i.addEventListener("input", () => {
      const q = i.value.trim().toLowerCase();
      let zichtbaar = 0;
      doos.querySelectorAll(".kaart").forEach((k) => {
        const ok = !q || k.textContent.toLowerCase().includes(q);
        k.hidden = !ok;
        if (ok) zichtbaar++;
      });
      doos.querySelectorAll(".groep").forEach((g) => {
        let n = g.nextElementSibling, iets = false;
        while (n && !n.classList.contains("groep")) { if (n.classList.contains("kaart") && !n.hidden) iets = true; n = n.nextElementSibling; }
        g.hidden = !iets;
      });
      geen.hidden = zichtbaar > 0;
    });
    w.append(svg(LUCIDE.search), i);
    return [w, geen];
  }

  function tekenOpties(stap) {
    const doos = $("opties");
    doos.textContent = "";
    doos.className = "opties" + (stap.optionLayout === "grid-2" ? " raster-2" : "");
    const lijst = optiesVoor(stap);
    if (!lijst.length) {
      const leeg = el("div", "melding");
      leeg.append(el("p", null, t("geenOpties")), contactRegel());
      doos.append(leeg);
      return;
    }
    const groepen = new Map();
    lijst.forEach((o) => {
      const g = o.group ? vertaal({ de: o.group }) : "";
      if (!groepen.has(g)) groepen.set(g, []);
      groepen.get(g).push(o);
    });
    let geen = null;
    if (lijst.length >= ZOEK_VANAF) {
      const [zoek, melding] = zoekveld(doos);
      doos.append(zoek);
      geen = melding;
    }
    groepen.forEach((opts, g) => {
      if (g && groepen.size > 1) doos.append(el("div", "groep", g));
      opts.forEach((o) => doos.append(optieKaart(stap, o)));
    });
    if (geen) doos.append(geen);
  }

  function contactRegel() {
    const p = el("p", "contact");
    const email = S.contactEmail || "info@ebora.nl";
    if (S.contactTelefoon) {
      const a = el("a", null, S.contactTelefoon);
      a.href = "tel:" + S.contactTelefoon.replace(/[^+\d]/g, "");
      p.append(t("bel") + " ", a, " " + t("ofMail") + " ");
    } else p.append(t("mail") + " ");
    const m = el("a", null, email);
    m.href = "mailto:" + email;
    p.append(m);
    return p;
  }

  // ── Laatste stap: zoals ACI een kaart "Uw configuratie" naast een kaart "Aanvraag versturen" ──────
  function groep(label, invoer, verplicht) {
    const g = el("div", "form-groep");
    const l = el("label", null, label + (verplicht ? " *" : ""));
    l.htmlFor = invoer.id;
    invoer.required = !!verplicht;
    g.append(l, invoer);
    return g;
  }

  function invoer(naam, type, placeholder) {
    const i = el(type === "textarea" ? "textarea" : "input", "form-invoer");
    if (type !== "textarea") i.type = type;
    i.name = naam;
    i.id = "f-" + naam;
    if (placeholder) i.placeholder = placeholder;
    return i;
  }

  function keuzelijst(naam, opties) {
    const s = el("select", "form-invoer form-select");
    s.name = naam;
    s.id = "f-" + naam;
    const leeg = el("option", null, t("kies"));
    leeg.value = ""; leeg.disabled = true; leeg.selected = true;
    s.append(leeg);
    opties.forEach((o) => { const x = el("option", null, o); x.value = o; s.append(x); });
    return s;
  }

  // ── ACI-bestelcode: groeit per stap mee; null als het type (nog) geen codetabel heeft ──────────
  function bestelcode() {
    const typeId = keuzes.type ? keuzes.type.id : vastType;
    const segs = typeId && bestelcodes[typeId];
    if (!segs) return null;
    let compleet = true, onbekend = false;
    const delen = segs.map((sg) => {
      if (sg.waarde != null) return { tekst: sg.waarde, staat: "vast" };
      const regel = (sg.regels || []).find((r) => Object.entries(r.als).every(([st, id]) => keuzes[st] && keuzes[st].id === id));
      if (regel) return { tekst: regel.waarde, staat: "gekozen" };
      const k = keuzes[sg.stap];
      if (!k && sg.standaard != null && (!stapMet(sg.stap) || overslaan(sg.stap))) return { tekst: sg.standaard, staat: "vast" };
      if (!k) { compleet = false; return { tekst: sg.plek || "_", staat: "open" }; }
      const w = sg.map[k.id];
      if (w == null) { compleet = false; onbekend = true; return { tekst: "?", staat: "onbekend" }; }
      return { tekst: w, staat: "gekozen" };
    });
    return { delen, compleet, onbekend, tekst: delen.map((d) => d.tekst).join("-") };
  }

  function tekenBestelcode() {
    const doos = $("bestelcode");
    if (!doos) return;
    const bc = bestelcode();
    doos.hidden = !bc;
    if (!bc) return;
    doos.textContent = "";
    const code = el("span", "bestelcode-code");
    bc.delen.forEach((d, i) => {
      if (i) code.append(el("span", "bc-streep", "-"));
      code.append(el("span", "bc-" + d.staat, d.tekst));
    });
    doos.append(el("span", "bestelcode-label", t("code")), code,
      el("span", "bestelcode-noot", bc.onbekend ? t("codeOpen") : t("codeControle")));
  }

  function samenvattingKaart() {
    const kaart = el("div", "samenvatting-kaart");
    kaart.append(el("h3", null, t("uwConfig")));
    const lijst = el("ul", "samenvatting-lijst");
    config.steps.forEach((s) => {
      if (!keuzes[s.key]) return;
      const li = el("li", "samenvatting-item");
      li.append(el("span", "samenvatting-label", vertaal(s.title_i18n, s.title)),
        el("span", "samenvatting-waarde", vertaal(keuzes[s.key].name_i18n, keuzes[s.key].name)));
      lijst.append(li);
    });
    const bc = bestelcode();
    if (bc) {
      const li = el("li", "samenvatting-item");
      li.append(el("span", "samenvatting-label", t("code") + " (" + t("codeControle") + ")"),
        el("span", "samenvatting-waarde bestelcode-waarde", bc.compleet ? bc.tekst : t("codeOpen")));
      lijst.append(li);
    }
    const prijs = el("div", "prijs-totaal");
    prijs.append(el("span", "prijs-label", t("prijs")), el("span", "prijs-bedrag", t("prijsAanvraag")));
    kaart.append(lijst, prijs, el("p", "prijs-noot", t("prijsNoot")));
    return kaart;
  }

  function tekenAanvraag() {
    const doos = $("opties");
    doos.textContent = "";
    doos.className = "laatste-stap";

    const kaart = el("div", "aanvraag-kaart");
    kaart.append(el("h3", null, t("aanvraagTitel")), el("p", null, t("aanvraagIntro")));

    const f = el("form", "aanvraag-form");
    const namen = el("div", "form-rij");
    namen.append(groep(t("voornaam"), invoer("voornaam", "text"), true), groep(t("achternaam"), invoer("achternaam", "text"), true));
    const telAantal = el("div", "form-rij");
    const aantal = invoer("aantal", "number");
    aantal.min = "1"; aantal.value = "1";
    telAantal.append(groep(t("telefoon"), invoer("telefoon", "tel", t("telPh")), false), groep(t("aantal"), aantal, true));

    const akkoord = el("div", "form-akkoord");
    const vink = el("input");
    vink.type = "checkbox"; vink.name = "akkoord"; vink.id = "f-akkoord"; vink.required = true; vink.value = "ja";
    const tekst = el("label");
    tekst.htmlFor = "f-akkoord";
    const [voor, link, na] = t("akkoord");
    tekst.append(voor);
    if (S.privacyUrl) {
      const a = el("a", null, link);
      a.href = S.privacyUrl; a.target = "_blank"; a.rel = "noopener noreferrer";
      tekst.append(a);
    } else tekst.append(link);
    tekst.append(na);
    akkoord.append(vink, tekst);

    const knop = el("button", "knop-aanvraag");
    knop.type = "submit";
    knop.append(t("knop"), svg(LUCIDE.mail));
    const uitkomst = el("p", "uitkomst");

    f.append(
      groep(t("aanhef"), keuzelijst("aanhef", t("aanhefOpties")), true),
      namen,
      groep(t("bedrijf"), invoer("bedrijf", "text"), true),
      groep(t("land"), invoer("land", "text", t("landPh")), true),
      groep(t("email"), invoer("email", "email", t("emailPh")), true),
      telAantal,
      groep(t("bericht"), invoer("toelichting", "textarea", t("berichtPh")), false),
      akkoord, knop, uitkomst);

    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      knop.disabled = true;
      uitkomst.textContent = "";
      const contact = Object.fromEntries(new FormData(f).entries());
      const keuzeIds = {};
      Object.keys(keuzes).forEach((k) => { keuzeIds[k] = keuzes[k].id; });
      try {
        let d;
        if (S.aanvraagVia === "ouderpagina") {
          d = await viaOuderpagina(contact);
        } else {
          const r = await fetch(S.aanvraagUrl, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keuzes: keuzeIds, contact, taal }),
          });
          d = await r.json();
          if (!r.ok || !d.ok) throw new Error(d.fout || r.statusText);
        }
        const klaar = el("div", "aanvraag-klaar");
        klaar.append(el("div", "klaar-vink"), el("h4", null, t("bedankt")), el("p", null, t("bedanktTekst", { r: d.referentie })));
        f.replaceWith(klaar);
      } catch (e) {
        knop.textContent = ""; knop.append(t("knop"), svg(LUCIDE.mail));
        uitkomst.textContent = t("mislukt") + " (" + e.message + "). ";
        uitkomst.append(contactRegel());
        knop.disabled = false;
      }
    });
    kaart.append(f);
    doos.append(samenvattingKaart(), kaart);
    // Ouderpagina (ebora.nl) laat het contactformulier alvast laden (Logic4 weigert te snel verstuurde formulieren)
    if (S.aanvraagVia === "ouderpagina" && window.parent !== window) {
      const ouder = new URLSearchParams(location.search).get("ouder") || "";
      if ((S.ouderOrigins || []).includes(ouder)) window.parent.postMessage({ type: "ebora-kijkglas-laatste-stap" }, ouder);
    }
  }

  // ── Aanvraag via het Logic4-contactformulier van de pagina eromheen (iframe op ebora.nl) ────────
  // De configurator stuurt de aanvraag als bericht naar de ouderpagina; het laadscript daar
  // (aci_kijkglas_logic4_laden.js) vult het Logic4-formulier en verstuurt het.
  function inTaal(lang, i18n, vrij) {
    const oud = taal;
    taal = lang;
    try { return vertaal(i18n, vrij); } finally { taal = oud; }
  }

  function aanvraagTekst(c, referentie) {
    const regels = ["Kijkglas-configurator — aanvraag " + referentie, ""];
    config.steps.forEach((s) => {
      const o = keuzes[s.key];
      if (!o) return;
      const nl = inTaal("nl", o.name_i18n, o.name), de = inTaal("de", o.name_i18n, o.name);
      regels.push(inTaal("nl", s.title_i18n, s.title) + ": " + nl + (de !== nl ? "  |  ACI: " + de : "") + "  [" + o.id + "]");
    });
    const bc = bestelcode();
    if (bc) regels.push("", "ACI-bestelcode (ter controle): " + (bc.compleet ? bc.tekst : bc.tekst + "  (niet compleet: bij offerte bepalen)"));
    if (ARTIKEL.code || ARTIKEL.pagina) {
      regels.push("", "Vanaf artikel: " + [ARTIKEL.code, ARTIKEL.naam].filter(Boolean).join(" — "));
      if (ARTIKEL.pagina) regels.push(ARTIKEL.pagina);
    }
    regels.push("", "Aantal: " + (c.aantal || "1"),
      "Aanhef: " + (c.aanhef || "-"), "Naam: " + [c.voornaam, c.achternaam].filter(Boolean).join(" "),
      "Land: " + (c.land || "-"), "Taal klant: " + taal.toUpperCase(),
      "Privacy-akkoord (Ebora + kopie ACI): " + (c.akkoord === "ja" ? "ja" : "nee"));
    if (c.toelichting) regels.push("", "Bericht van de klant:", c.toelichting);
    return regels.join("\n");
  }

  function viaOuderpagina(c) {
    const nu = new Date(), p = (n) => String(n).padStart(2, "0");
    const referentie = "KG-" + nu.getFullYear() + p(nu.getMonth() + 1) + p(nu.getDate()) + "-" + p(nu.getHours()) + p(nu.getMinutes()) + p(nu.getSeconds());
    if (!keuzes.type) return Promise.reject(new Error("configuratie is niet compleet"));
    if (window.parent === window) return Promise.reject(new Error("geen Logic4-pagina gevonden"));
    // Persoonsgegevens alleen naar een vooraf toegestane pagina (S.ouderOrigins), nooit naar "*"
    const doel = new URLSearchParams(location.search).get("ouder") || "";
    if (!(S.ouderOrigins || []).includes(doel)) return Promise.reject(new Error("pagina niet toegestaan: " + (doel || "onbekend")));
    return new Promise((klaar, fout) => {
      let wacht;
      const wachtOp = (ms) => { clearTimeout(wacht); wacht = setTimeout(() => { window.removeEventListener("message", ontvang); fout(new Error("geen antwoord van de pagina")); }, ms); };
      wachtOp(5000);
      function ontvang(ev) {
        if (ev.origin !== doel || ev.source !== window.parent) return;
        const m = ev.data || {};
        if (m.referentie !== referentie) return;
        if (m.type === "ebora-kijkglas-bezig") {  // contactformulier wordt op de achtergrond verstuurd
          const k = document.querySelector(".knop-aanvraag");
          if (k) { k.textContent = t("bezig"); }
          return wachtOp(45000);
        }
        if (m.type !== "ebora-kijkglas-antwoord") return;
        clearTimeout(wacht);
        window.removeEventListener("message", ontvang);
        if (m.ok) klaar({ ok: true, referentie }); else fout(new Error(m.fout || "formulier niet gevonden"));
      }
      window.addEventListener("message", ontvang);
      window.parent.postMessage({
        type: "ebora-kijkglas-aanvraag", referentie, taal,
        naam: [c.voornaam, c.achternaam].filter(Boolean).join(" "), bedrijf: c.bedrijf || "",
        email: c.email || "", telefoon: c.telefoon || "", land: c.land || "",
        bericht: aanvraagTekst(c, referentie),
      }, doel);
    });
  }

  // Hoogte doorgeven aan de ouderpagina (op smalle schermen groeit de configurator mee met de inhoud)
  if (window.parent !== window) {
    // Escape in de configurator: venster op de productpagina sluiten (de toets komt anders niet bij de pagina)
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") window.parent.postMessage({ type: "ebora-kijkglas-esc" }, "*");  // geen persoonsgegevens
    });
    const meld = () => window.parent.postMessage({ type: "ebora-kijkglas-hoogte",
      hoogte: document.documentElement.scrollHeight, smal: window.innerWidth <= 760 }, "*");  // geen persoonsgegevens
    try { new ResizeObserver(meld).observe(document.body); } catch (e) { /* oude browser */ }
    window.addEventListener("load", meld);
  }

  // ── Groot productbeeld, aanzichten en slideshow (zoals ACI: voor-/boven-/perspectief, 3 s) ───────
  function toonAanzicht(i) {
    if (!heldPaden.length) return;
    aanzicht = (i + heldPaden.length) % heldPaden.length;
    $("held").querySelectorAll("img:not(.voorbeeld-img)").forEach((img, j) => img.classList.toggle("actief", j === aanzicht));
    $("aanzichten").querySelectorAll(".zijknop").forEach((b, j) => b.classList.toggle("actief", j === aanzicht && j < heldPaden.length));
  }

  function zetDiashow(aan) {
    if (heldPaden.length <= 1) aan = false;
    clearInterval(diashow);
    diashow = aan ? setInterval(() => toonAanzicht(aanzicht + 1), 3000) : null;
    $("afspelen").hidden = aan;
    $("stoppen").hidden = !aan;
    $("afspelen").disabled = heldPaden.length <= 1;
  }

  function tekenHeld() {
    const vast = vastType && !keuzes.type
      ? Object.values((stapMet("type") || {}).options || {}).filter(Array.isArray).flat().find((x) => x.id === vastType) : null;
    const bron = keuzes.type || vast || keuzes.category;
    heldPaden = bron ? (bron.images || []).filter(Boolean).slice(0, 3) : [];
    const sleutel = heldPaden.join("|");
    const held = $("held");
    if (sleutel !== heldSleutel) {
      heldSleutel = sleutel;
      aanzicht = 0;
      held.textContent = "";
      heldPaden.forEach((p, i) => {
        const img = el("img", i === 0 ? "actief" : "");
        img.src = afb(p); img.alt = "";
        held.append(img);
      });
      if (diashow && heldPaden.length <= 1) zetDiashow(false);
    }
    stopVoorbeeld();
    const knoppen = $("aanzichten");
    knoppen.textContent = "";
    t("aanzichten").forEach((naam, i) => {
      const b = el("button", "zijknop" + (heldPaden.length && i === aanzicht ? " actief" : ""));
      b.type = "button";
      b.disabled = i >= heldPaden.length;
      b.setAttribute("aria-label", naam);
      b.append(icoon("camera"), el("span", "zijlabel", naam));
      b.addEventListener("click", () => { zetDiashow(false); toonAanzicht(i); });
      knoppen.append(b);
    });
    $("afspelen").disabled = heldPaden.length <= 1;
  }

  // ── Taal wisselen ───────────────────────────────────────────────────────────────────────────────
  function vasteTeksten() {
    document.documentElement.lang = taal;
    document.title = t("paginatitel");
    document.querySelectorAll("[data-t]").forEach((e) => { e.textContent = t(e.dataset.t); });
    document.querySelectorAll("[data-t-label]").forEach((e) => { e.setAttribute("aria-label", t(e.dataset.tLabel)); });
    $("taal-code").textContent = taal.toUpperCase();
    $("taal-menu").querySelectorAll("button").forEach((b) => b.classList.toggle("actief", b.dataset.taal === taal));
  }

  function zetTaal(nieuw) {
    if (!TALEN[nieuw]) return;
    taal = nieuw;
    try { localStorage.setItem("kijkglas_taal", taal); } catch (e) { /* geen opslag */ }
    vasteTeksten();
    if (config) teken();
  }

  function taalMenu() {
    const menu = $("taal-menu");
    Object.entries(TALEN).forEach(([code, naam]) => {
      const b = el("button");
      b.type = "button";
      b.dataset.taal = code;
      b.append(el("span", "taal-code", code.toUpperCase()), el("span", null, naam));
      b.addEventListener("click", () => { zetTaal(code); menu.hidden = true; $("taal-knop").setAttribute("aria-expanded", "false"); });
      menu.append(b);
    });
    $("taal-knop").addEventListener("click", (ev) => {
      ev.stopPropagation();
      menu.hidden = !menu.hidden;
      $("taal-knop").setAttribute("aria-expanded", String(!menu.hidden));
    });
    document.addEventListener("click", (ev) => { if (!menu.contains(ev.target)) menu.hidden = true; });
  }

  function teken() {
    const stap = config.steps[huidig];
    tekenStappen();
    tekenBestelcode();
    const type = keuzes.type ? vertaal(keuzes.type.name_i18n, keuzes.type.name) : "";
    const titelType = type || (vastType ? vastTypeNaam() : "");
    $("kop-titel").textContent = (stap.isFinal || vastType) && titelType ? t("titelType", { t: titelType }) : t("titel");
    $("alle-typen").hidden = !vastType;
    $("stap-titel").textContent = stap.isFinal ? t("laatsteStap") : `${huidig + 1}. ${vertaal(stap.title_i18n, stap.title)}`;
    $("terug").hidden = huidig === 0;
    if (stap.isFinal) tekenAanvraag(); else tekenOpties(stap);
    tekenHeld();
  }

  function vorige() {
    let i = huidig - 1;
    while (i > 0 && !keuzes[config.steps[i].key] && overslaan(config.steps[i].key)) i--;
    huidig = Math.max(0, i);
    teken();
  }

  function toonOffline() {
    $("offline").hidden = false;
    $("app").hidden = true;
    $("offline-contact").textContent = "";
    $("offline-contact").append(contactRegel());
  }

  async function start() {
    if (S.contactEmail) $("zij-mail").href = "mailto:" + S.contactEmail;
    taalMenu();
    vasteTeksten();
    $("afspelen").addEventListener("click", () => zetDiashow(true));
    $("stoppen").addEventListener("click", () => zetDiashow(false));
    try {
      if (S.statusUrl) {
        const st = await (await fetch(S.statusUrl, { cache: "no-store" })).json();
        if (!st.online) return toonOffline();
      }
      const json = (url) => (url ? fetch(url, { cache: "no-store" }).then((r) => r.json()).catch(() => ({})) : {});
      const [c, v, k, bc] = await Promise.all([
        fetch(S.dataUrl, { cache: "no-store" }).then((r) => r.json()),
        json(S.vertalingenUrl),
        json(S.correctiesUrl),
        json(S.bestelcodesUrl),
      ]);
      bestelcodes = (bc && bc.typen) || {};
      bcExtra = (bc && bc.extra) || {};
      bcCatalogus = (bc && bc.catalogus) || {};
      // extra stappen vóór de laatste stap invoegen, met Nederlandse namen in de vertaaltabel
      const laatste = c.steps.findIndex((x) => x.isFinal);
      const extraStappen = ((bc && bc.volgorde_extra) || []).filter((k) => bc.stappen && bc.stappen[k]).map((k) => {
        const d = bc.stappen[k];
        return { key: k, title: d.de, title_i18n: { de: d.de, en: d.en }, icon: d.icon, isExtra: true, options: [] };
      });
      if (extraStappen.length) c.steps.splice(laatste < 0 ? c.steps.length : laatste, 0, ...extraStappen);
      const nlErbij = (de, nl) => { if (de && nl && !(v && Object.prototype.hasOwnProperty.call(v, de))) (v || {})[de] = nl; };
      Object.values((bc && bc.stappen) || {}).forEach((d) => nlErbij(d.de, d.nl));
      Object.values(bcCatalogus).forEach((d) => nlErbij(d.de, d.nl));
      config = c;
      tabel = v || {};
      correcties = k || {};
      if (!config || !Array.isArray(config.steps)) return toonOffline();
    } catch (e) {
      return toonOffline();
    }
    $("app").hidden = false;
    $("terug").addEventListener("click", vorige);
    $("opnieuw").addEventListener("click", () => { keuzes = {}; huidig = 0; zetDiashow(false); vulVooraf(); teken(); });
    $("alle-typen").addEventListener("click", () => { vastType = null; keuzes = {}; huidig = 0; zetDiashow(false); teken(); });
    const gevraagd = (URLP.get("type") || "").toLowerCase();
    const typeStap = stapMet("type");
    if (gevraagd && typeStap && Object.values(typeStap.options || {}).filter(Array.isArray).flat().some((x) => x.id === gevraagd)) {
      vastType = gevraagd;
      vulVooraf();
    }
    teken();
  }

  start();
})();
