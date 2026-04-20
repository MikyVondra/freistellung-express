async function verifyStripeSignature(rawBody, sigHeader, secret) {
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;

  if (Math.abs(Date.now() / 1000 - parseInt(t)) > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${rawBody}`));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  return computed === v1;
}

function serviceFromAmount(amountTotal) {
  const eur = amountTotal / 100;
  if (eur <= 85)       return { name: 'Podání žádosti (80 €)',                    desc: 'Připravíme a odešleme žádost o Freistellung na Finanzamt.' };
  if (eur <= 105)      return { name: 'Kompletní vyřízení (100 €)',               desc: 'Podání + komunikace s úřadem až do úplného schválení.' };
  return               { name: 'Komplet se Steuernummer (120 €)',                 desc: 'Podáme žádost o Steuernummer i Freistellung za vás.' };
}

function buildConfirmationEmail(session) {
  const name    = session.customer_details?.name  || 'zákazníku';
  const email   = session.customer_details?.email || '';
  const service = serviceFromAmount(session.amount_total || 0);

  return {
    to: email,
    subject: 'Přijali jsme vaši objednávku — Freistellung Express',
    html: `
<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,Arial,sans-serif">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">

  <div style="background:#1B3A6B;padding:32px 36px">
    <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">Freistellung Express</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:4px">freistellung-express.com</div>
  </div>

  <div style="padding:36px">
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827">Platba přijata ✓</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7">
      Dobrý den, <strong style="color:#111827">${name}</strong>.<br>
      Vaše objednávka byla úspěšně zaplacena. Nyní se pustíme do práce.
    </p>

    <div style="background:#EEF3FB;border:1px solid #C3D4EE;border-radius:8px;padding:18px 20px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#2452A0;margin-bottom:8px">Objednaná služba</div>
      <div style="font-size:16px;font-weight:700;color:#1B3A6B">${service.name}</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px">${service.desc}</div>
    </div>

    <div style="margin-bottom:24px">
      <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:10px">Co se děje dál?</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${[
          ['1', 'Zkontrolujeme vaše podklady', 'Do 24 hodin vás případně kontaktujeme, pokud budeme potřebovat doplnit informace.'],
          ['2', 'Podáme žádost na Finanzamt', 'Vše vyřídíme elektronicky přímo s německým finančním úřadem.'],
          ['3', 'Dostanete Freistellung', 'Průměrná doba vyřízení je 4–8 týdnů. O výsledku vás budeme informovat.'],
        ].map(([num, title, desc]) => `
        <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 14px;background:#f9fafb;border-radius:7px;border:1px solid #e5e7eb">
          <div style="min-width:24px;height:24px;background:#1B3A6B;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">${num}</div>
          <div>
            <div style="font-size:13px;font-weight:600;color:#111827">${title}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;line-height:1.6">${desc}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>

    <p style="font-size:13px;color:#6b7280;line-height:1.7;margin:0 0 6px">
      Máte-li jakékoli dotazy, napište nám na
      <a href="mailto:info@freistellung-express.com" style="color:#1B3A6B;font-weight:600;text-decoration:none">info@freistellung-express.com</a>
      nebo přes WhatsApp.
    </p>
  </div>

  <div style="padding:20px 36px;border-top:1px solid #e5e7eb;background:#f9fafb">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6">
      Freistellung Express · freistellung-express.com<br>
      Tento email byl odeslán automaticky, prosím neodpovídejte na něj.
    </p>
  </div>

</div>
</body>
</html>`,
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const rawBody = await request.text();
  const sigHeader = request.headers.get('stripe-signature') || '';

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response('STRIPE_WEBHOOK_SECRET not configured', { status: 500 });
  }

  const valid = await verifyStripeSignature(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response('Invalid signature', { status: 400 });
  }

  let event;
  try { event = JSON.parse(rawBody); } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details?.email;

    if (customerEmail) {
      const mail = buildConfirmationEmail(session);

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
