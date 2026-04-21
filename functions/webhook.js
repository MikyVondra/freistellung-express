const OWNER_EMAIL = 'mira.jaros7@seznam.cz';

const FIELD_LABELS = {
  Jmeno: 'Jmeno a prijmeni', Narozeni: 'Datum narozeni', Statni: 'Statni prislusnost',
  Telefon: 'Telefon', Email: 'E-mail', Ulice: 'Ulice a cislo', Mesto: 'Mesto',
  PSC: 'PSC', Stat: 'Stat', Firma: 'Firma / OSVC', Typ_podnikani: 'Typ podnikani',
  Obor: 'Obor', DIC: 'DIC', Steuernummer: 'Steuernummer', Ma_Freistellung: 'Ma Freistellung',
  Pracuje_v_DE_od: 'Pracuje v DE od', Delka_prace: 'Delka prace', Misto_prace: 'Misto prace',
  Zakazky: 'Zakazky', VYBRANA_SLUZBA: 'Vybrana sluzba', Jazyk: 'Jazyk',
};

const ORDER = [
  'VYBRANA_SLUZBA','Jmeno','Narozeni','Statni','Telefon','Email',
  'Ulice','Mesto','PSC','Stat','Firma','Typ_podnikani','Obor','DIC','Steuernummer',
  'Ma_Freistellung','Pracuje_v_DE_od','Delka_prace','Misto_prace','Zakazky','Jazyk',
];

function buildOwnerEmail(session) {
  const meta = session.metadata || {};
  const name = meta['Jmeno'] || session.customer_details?.name || 'neznamy';
  const svc  = meta['VYBRANA_SLUZBA'] || '';

  const ordered = ORDER
    .filter(k => meta[k])
    .map(k => `<tr>
      <td style="padding:7px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;width:200px;white-space:nowrap">${FIELD_LABELS[k] || k}</td>
      <td style="padding:7px 12px;border:1px solid #e5e7eb">${meta[k]}</td>
    </tr>`).join('');

  const extra = Object.entries(meta)
    .filter(([k]) => !ORDER.includes(k))
    .map(([k, v]) => `<tr>
      <td style="padding:7px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;width:200px">${k}</td>
      <td style="padding:7px 12px;border:1px solid #e5e7eb">${v}</td>
    </tr>`).join('');

  return {
    to: OWNER_EMAIL,
    subject: `Zaplaceno -- ${name} (${svc})`,
    html: `<h2 style="color:#1B3A6B">Nova zaplacena objednavka</h2>
      <p style="color:#6b7280;margin-bottom:16px">Platba potvrzena Stripe. Zakaznik obdrzel potvrzovaci email.</p>
      <table style="border-collapse:collapse;width:100%;max-width:600px">${ordered}${extra}</table>
      <p style="margin-top:16px;color:#6b7280;font-size:13px">
        Prilohy (zivnostensky list, smlouva) zakaznik nahral pri vyplnovani formulate.
        Pokud je potrebujes, kontaktuj zakaznika na emailu vyse.
      </p>`,
  };
}

const CUSTOMER_TRANSLATIONS = {
  cs: {
    subject: 'Platba přijata — Freistellung Express',
    heading: 'Platba přijata',
    greeting: (name) => `Dobrý den, <strong style="color:#111827">${name}</strong>.`,
    intro: 'Vaše objednávka byla úspěšně zaplacena. Nyní se pustíme do práce.',
    svcLabel: 'Objednaná služba',
    svcDesc: { 'Podani': 'Připravíme a odešleme žádost o Freistellung na Finanzamt.', 'Kompletni vyrizeni': 'Podání žádosti + komunikace s úřadem až do schválení.', 'Komplet se Steuernummer': 'Podáme žádost o Steuernummer i Freistellung za vás.' },
    nextLabel: 'Co se děje dál?',
    step1t: 'Zkontrolujeme vaše podklady', step1d: 'Do 24 hodin vás případně kontaktujeme, pokud budeme potřebovat doplnit informace.',
    step2t: 'Podáme žádost na Finanzamt', step2d: 'Vše vyřídíme elektronicky přímo s německým finančním úřadem.',
    step3t: 'Dostanete Freistellung', step3d: 'Průměrná doba vyřízení je 4–8 týdnů. O výsledku vás budeme informovat.',
    contact: 'Máte-li dotazy, napište na',
    auto: 'Tento email byl odeslán automaticky.',
    lang: 'cs',
  },
  sk: {
    subject: 'Platba prijatá — Freistellung Express',
    heading: 'Platba prijatá',
    greeting: (name) => `Dobrý deň, <strong style="color:#111827">${name}</strong>.`,
    intro: 'Vaša objednávka bola úspešne zaplatená. Teraz sa pustíme do práce.',
    svcLabel: 'Objednaná služba',
    svcDesc: { 'Podani': 'Pripravíme a odošleme žiadosť o Freistellung na Finanzamt.', 'Kompletni vyrizeni': 'Podanie žiadosti + komunikácia s úradom až do schválenia.', 'Komplet se Steuernummer': 'Podáme žiadosť o Steuernummer aj Freistellung za vás.' },
    nextLabel: 'Čo sa deje ďalej?',
    step1t: 'Skontrolujeme vaše podklady', step1d: 'Do 24 hodín vás prípadne kontaktujeme, ak budeme potrebovať doplniť informácie.',
    step2t: 'Podáme žiadosť na Finanzamt', step2d: 'Všetko vybavíme elektronicky priamo s nemeckým finančným úradom.',
    step3t: 'Dostanete Freistellung', step3d: 'Priemerná doba vybavenia je 4–8 týždňov. O výsledku vás budeme informovať.',
    contact: 'Ak máte otázky, napíšte na',
    auto: 'Tento email bol odoslaný automaticky.',
    lang: 'sk',
  },
  pl: {
    subject: 'Płatność przyjęta — Freistellung Express',
    heading: 'Płatność przyjęta',
    greeting: (name) => `Dzień dobry, <strong style="color:#111827">${name}</strong>.`,
    intro: 'Twoje zamówienie zostało pomyślnie opłacone. Teraz zabieramy się do pracy.',
    svcLabel: 'Zamówiona usługa',
    svcDesc: { 'Podani': 'Przygotujemy i złożymy wniosek o Freistellung do Finanzamt.', 'Kompletni vyrizeni': 'Złożenie wniosku + pełna komunikacja z urzędem do zatwierdzenia.', 'Komplet se Steuernummer': 'Złożymy wniosek o Steuernummer i Freistellung za Ciebie.' },
    nextLabel: 'Co dalej?',
    step1t: 'Sprawdzimy Twoje dokumenty', step1d: 'W ciągu 24 godzin skontaktujemy się z Tobą, jeśli będziemy potrzebować dodatkowych informacji.',
    step2t: 'Złożymy wniosek do Finanzamt', step2d: 'Wszystko załatwimy elektronicznie bezpośrednio z niemieckim urzędem skarbowym.',
    step3t: 'Otrzymasz Freistellung', step3d: 'Średni czas rozpatrzenia to 4–8 tygodni. Poinformujemy Cię o wyniku.',
    contact: 'W razie pytań napisz na',
    auto: 'Ta wiadomość została wysłana automatycznie.',
    lang: 'pl',
  },
  en: {
    subject: 'Payment received — Freistellung Express',
    heading: 'Payment received',
    greeting: (name) => `Dear <strong style="color:#111827">${name}</strong>,`,
    intro: 'Your order has been successfully paid. We are now getting to work.',
    svcLabel: 'Ordered service',
    svcDesc: { 'Podani': 'We will prepare and submit the Freistellung application to the Finanzamt.', 'Kompletni vyrizeni': 'Application submission + full communication with the authority until approved.', 'Komplet se Steuernummer': 'We will submit the Steuernummer and Freistellung application for you.' },
    nextLabel: 'What happens next?',
    step1t: 'We will review your documents', step1d: 'Within 24 hours we will contact you if we need any additional information.',
    step2t: 'We will submit the application to the Finanzamt', step2d: 'Everything is handled electronically directly with the German tax authority.',
    step3t: 'You will receive your Freistellung', step3d: 'The average processing time is 4–8 weeks. We will keep you informed of the outcome.',
    contact: 'If you have any questions, write to',
    auto: 'This email was sent automatically.',
    lang: 'en',
  },
};

function buildCustomerEmail(session) {
  const meta = session.metadata || {};
  const name  = meta['Jmeno'] || session.customer_details?.name || 'zákazníku';
  const email = session.customer_details?.email || meta['Email'] || '';
  const svc   = meta['VYBRANA_SLUZBA'] || '';
  const T     = CUSTOMER_TRANSLATIONS[meta['Jazyk']] || CUSTOMER_TRANSLATIONS.cs;

  const svcKey  = Object.keys(T.svcDesc).find(k => svc.includes(k)) || '';
  const svcDesc = T.svcDesc[svcKey] || '';

  return {
    to: email,
    subject: T.subject,
    html: `<!DOCTYPE html><html lang="${T.lang}"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,Arial,sans-serif">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#1B3A6B;padding:32px 36px">
    <div style="font-size:20px;font-weight:700;color:#fff">Freistellung Express</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:4px">freistellung-express.com</div>
  </div>
  <div style="padding:36px">
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827">${T.heading}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7">
      ${T.greeting(name)}<br>
      ${T.intro}
    </p>
    <div style="background:#EEF3FB;border:1px solid #C3D4EE;border-radius:8px;padding:18px 20px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#2452A0;margin-bottom:8px">${T.svcLabel}</div>
      <div style="font-size:16px;font-weight:700;color:#1B3A6B">${svc}</div>
      ${svcDesc ? `<div style="font-size:13px;color:#6b7280;margin-top:4px">${svcDesc}</div>` : ''}
    </div>
    <div style="margin-bottom:24px">
      <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:10px">${T.nextLabel}</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;gap:12px;padding:12px 14px;background:#f9fafb;border-radius:7px;border:1px solid #e5e7eb">
          <div style="min-width:24px;height:24px;background:#1B3A6B;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">1</div>
          <div><div style="font-size:13px;font-weight:600;color:#111827">${T.step1t}</div><div style="font-size:12px;color:#6b7280;margin-top:2px;line-height:1.6">${T.step1d}</div></div>
        </div>
        <div style="display:flex;gap:12px;padding:12px 14px;background:#f9fafb;border-radius:7px;border:1px solid #e5e7eb">
          <div style="min-width:24px;height:24px;background:#1B3A6B;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">2</div>
          <div><div style="font-size:13px;font-weight:600;color:#111827">${T.step2t}</div><div style="font-size:12px;color:#6b7280;margin-top:2px;line-height:1.6">${T.step2d}</div></div>
        </div>
        <div style="display:flex;gap:12px;padding:12px 14px;background:#f9fafb;border-radius:7px;border:1px solid #e5e7eb">
          <div style="min-width:24px;height:24px;background:#1B3A6B;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">3</div>
          <div><div style="font-size:13px;font-weight:600;color:#111827">${T.step3t}</div><div style="font-size:12px;color:#6b7280;margin-top:2px;line-height:1.6">${T.step3d}</div></div>
        </div>
      </div>
    </div>
    <p style="font-size:13px;color:#6b7280;line-height:1.7;margin:0">${T.contact} <a href="mailto:info@freistellung-express.com" style="color:#1B3A6B;font-weight:600;text-decoration:none">info@freistellung-express.com</a>.</p>
  </div>
  <div style="padding:20px 36px;border-top:1px solid #e5e7eb;background:#f9fafb">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6">Freistellung Express — freistellung-express.com<br>${T.auto}</p>
  </div>
</div></body></html>`,
  };
}

async function sendMail(env, mail) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Freistellung Express <noreply@freistellung-express.com>',
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
    }),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const rawBody = await request.text();

  let event;
  try { event = JSON.parse(rawBody); }
  catch { return new Response('Invalid body', { status: 400 }); }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    await sendMail(env, buildOwnerEmail(session));

    const customerEmail = session.customer_details?.email || session.metadata?.Email;
    if (customerEmail) {
      await sendMail(env, buildCustomerEmail(session));
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
    },
  });
}
