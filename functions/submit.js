export async function onRequestPost(context) {
  const { request, env } = context;

  const formData = await request.formData();

  const fields = {};
  const attachments = [];

  for (const [key, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) {
      const arrayBuffer = await value.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      attachments.push({ filename: value.name, content: btoa(binary) });
    } else if (typeof value === 'string') {
      fields[key] = value;
    }
  }

  const email       = fields['Email']         || '';
  const name        = fields['Jmeno']         || '';
  const cena        = parseInt(fields['CENA'] || '0', 10);
  const lang        = fields['Jazyk'] || 'cs';

  const serviceMap  = { 60: 'Prodloužení dokumentu', 80: 'Žádost o nový dokument' };
  if (![60, 80].includes(cena)) {
    return new Response(JSON.stringify({ ok: false, error: 'Neplatná cena služby.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const serviceName = serviceMap[cena] || 'Freistellung Express';

  const svcDescMap = {
    cs: {
      60:  'Příprava a podání žádosti o prodloužení stávajícího Freistellung.',
      80:  'Příprava a podání žádosti o nový Freistellung na německý Finanzamt.',
    },
    sk: {
      60:  'Príprava a podanie žiadosti o predĺženie existujúceho Freistellung.',
      80:  'Príprava a podanie žiadosti o nový Freistellung na nemecký Finanzamt.',
    },
    pl: {
      60:  'Przygotowanie i złożenie wniosku o przedłużenie obecnego Freistellung.',
      80:  'Przygotowanie i złożenie wniosku o nowy Freistellung do niemieckiego Finanzamt.',
    },
    en: {
      60:  'Preparation and submission of an application to extend an existing Freistellung.',
      80:  'Preparation and submission of a new Freistellung application to the German Finanzamt.',
    },
  };
  const serviceDesc = (svcDescMap[lang] || svcDescMap.cs)[cena] || '';

  // Email majiteli s daty + přílohami (hned po odeslání formuláře)
  const rows = Object.entries(fields)
    .filter(([k]) => k !== 'CENA')
    .map(([k, v]) => `<tr>
      <td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;width:200px">${k}</td>
      <td style="padding:6px 12px;border:1px solid #e5e7eb">${v || '-'}</td>
    </tr>`).join('');

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Freistellung Express <noreply@freistellung-express.com>',
      to: ['mira.jaros7@seznam.cz'],
      subject: `Nová objednávka (čeká na platbu) — ${name}`,
      html: `<h2 style="color:#1B3A6B">Nová objednávka — čeká na platbu</h2>
        <p style="color:#6b7280;margin-bottom:16px">Zákazník vyplnil formulář a přechází na platbu. Po zaplacení dostaneš druhý email s potvrzením.</p>
        <table style="border-collapse:collapse;width:100%;max-width:600px">${rows}</table>
        ${attachments.length > 0
          ? `<p style="margin-top:16px">📎 Přílohy: ${attachments.map(a => a.filename).join(', ')}</p>`
          : '<p style="margin-top:16px;color:#6b7280">Žádné přílohy nebyly nahrány.</p>'}`,
      attachments,
    }),
  });

  // Všechna pole do Stripe metadata
  const metaParams = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'CENA') continue;
    const safeKey = key.replace(/\s+/g, '_').slice(0, 40);
    metaParams[`metadata[${safeKey}]`] = String(value).slice(0, 490);
  }

  metaParams['metadata[VYBRANA_SLUZBA]'] = `${serviceName} (${cena} EUR)`;

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      mode: 'payment',
      locale: ['cs','sk','pl','en'].includes(lang) ? lang : 'cs',
      success_url: 'https://freistellung-express.com/?platba=ok',
      cancel_url:  'https://freistellung-express.com/',
      customer_email: email,
      'line_items[0][price_data][currency]':                    'eur',
      'line_items[0][price_data][product_data][name]':          serviceName,
      'line_items[0][price_data][product_data][description]':   serviceDesc,
      'line_items[0][price_data][unit_amount]':                 String(cena * 100),
      'line_items[0][quantity]':                                '1',
      ...metaParams,
    }),
  });

  const session = await stripeRes.json();

  if (!session.url) {
    return new Response(JSON.stringify({ ok: false, error: session.error?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
