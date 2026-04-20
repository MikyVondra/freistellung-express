function serviceFromAmount(amountTotal) {
  const eur = amountTotal / 100;
  if (eur <= 85)  return { name: 'Podání žádosti (80 €)',        desc: 'Připravíme a odešleme žádost o Freistellung na Finanzamt.' };
  if (eur <= 105) return { name: 'Kompletní vyřízení (100 €)',   desc: 'Podání + komunikace s úřadem až do úplného schválení.' };
  return          { name: 'Komplet se Steuernummer (120 €)',     desc: 'Podáme žádost o Steuernummer i Freistellung za vás.' };
}

function buildEmail(session) {
  const name    = session.customer_details?.name || session.metadata?.name || 'zákazníku';
  const email   = session.customer_details?.email || session.metadata?.email || '';
  const service = serviceFromAmount(session.amount_total || 0);
  return {
    to: email,
    subject: 'Platba přijata — Freistellung Express',
    html: `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,Arial,sans-serif">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#1B3A6B;padding:32px 36px">
    <div style="font-size:20px;font-weight:700;color:#fff">Freistellung Express</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:4px">freistellung-express.com</div>
  </div>
  <div style="padding:36px">
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827">Platba přijata ✓</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7">Dobrý den, <strong style="color:#111827">${name}</strong>.<br>Vaše objednávka byla úspěšně zaplacena. Nyní se pustíme do práce.</p>
    <div style="background:#EEF3FB;border:1px solid #C3D4EE;border-radius:8px;padding:18px 20px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#2452A0;margin-bottom:8px">Objednaná služba</div>
      <div style="font-size:16px;font-weight:700;color:#1B3A6B">${service.name}</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px">${service.desc}</div>
    </div>
    <p style="font-size:13px;color:#6b7280;line-height:1.7;margin:0">Máte-li dotazy, napište na <a href="mailto:info@freistellung-express.com" style="color:#1B3A6B;font-weight:600;text-decoration:none">info@freistellung-express.com</a>.</p>
  </div>
  <div style="padding:20px 36px;border-top:1px solid #e5e7eb;background:#f9fafb">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6">Freistellung Express · freistellung-express.com<br>Tento email byl odeslán automaticky.</p>
  </div>
</div></body></html>`,
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const rawBody = await request.text();

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid body', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email || session.metadata?.email;

    if (email) {
      const mail = buildEmail(session);
      await fetch('https://api.resend.com/emails', {
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
