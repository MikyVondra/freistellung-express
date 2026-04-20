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

  const email = fields['Email'] || '';
  const name = fields['Jmeno'] || '';
  const cena = parseInt(fields['CENA'] || '0', 10);

  // Email majiteli
  const html = `
    <h2>Nová objednávka Freistellung Express</h2>
    <table style="border-collapse:collapse;width:100%">
      ${Object.entries(fields).filter(([k]) => k !== 'CENA').map(([k, v]) => `
        <tr>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;width:200px">${k}</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb">${v || '-'}</td>
        </tr>`).join('')}
    </table>
    ${attachments.length > 0
      ? `<p style="margin-top:16px">📎 Přílohy: ${attachments.map(a => a.filename).join(', ')}</p>`
      : '<p style="margin-top:16px;color:#6b7280">Žádné přílohy.</p>'}`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Freistellung Express <noreply@freistellung-express.com>',
      to: ['mira.jaros7@seznam.cz'],
      subject: `Nová objednávka — ${name} (${fields['VYBRANA SLUZBA'] || ''})`,
      html,
      attachments,
    }),
  });

  // Stripe session pouze pro platbu kartou
  if (cena > 0 && env.STRIPE_SECRET_KEY) {
    const serviceNames = { 80: 'Podání žádosti', 100: 'Kompletní vyřízení', 120: 'Komplet se Steuernummer' };
    const serviceName = serviceNames[cena] || 'Freistellung Express';

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        mode: 'payment',
        success_url: 'https://freistellung-express.com/?platba=ok',
        cancel_url: 'https://freistellung-express.com/',
        customer_email: email,
        'metadata[name]': name,
        'metadata[email]': email,
        'metadata[service]': serviceName,
        'line_items[0][price_data][currency]': 'eur',
        'line_items[0][price_data][product_data][name]': serviceName,
        'line_items[0][price_data][unit_amount]': String(cena * 100),
        'line_items[0][quantity]': '1',
      }),
    });

    const session = await stripeRes.json();
    return new Response(JSON.stringify({ ok: true, url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
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
