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

  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${t}.${rawBody}`)
  );

  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === v1;
}

// 🎯 EMAIL BUILDER (už používá metadata)
function buildConfirmationEmail(session) {
  const name = session.metadata?.name || session.customer_details?.name || 'zákazníku';
  const email = session.customer_details?.email || '';
  const service = session.metadata?.service || 'Freistellung služba';

  return {
    to: email,
    subject: 'Platba přijata — Freistellung Express',
    html: `
<!DOCTYPE html>
<html lang="cs">
<body style="font-family:Arial;background:#f9fafb;padding:20px">

<h2>Platba přijata ✓</h2>

<p>Dobrý den, <strong>${name}</strong>,</p>
<p>děkujeme za vaši objednávku.</p>

<h3>Objednaná služba:</h3>
<p><strong>${service}</strong></p>

<p>Začínáme na tom pracovat. Ozveme se do 24 hodin.</p>

<hr>
<p style="font-size:12px;color:#888">
Freistellung Express<br>
Tento email byl odeslán automaticky.
</p>

</body>
</html>
`
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const rawBody = await request.text();
  const sigHeader = request.headers.get('stripe-signature') || '';

  const valid = await verifyStripeSignature(
    rawBody,
    sigHeader,
    env.STRIPE_WEBHOOK_SECRET
  );

  if (!valid) {
    return new Response('Invalid signature', { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  // 🔥 PODPORA I PRO ASYNC PLATBY
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object;

    const mail = buildConfirmationEmail(session);

    const res = await fetch('https://api.resend.com/emails', {
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

    // 🔍 DEBUG LOG (doporučuju nechat)
    console.log("RESEND STATUS:", res.status);
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

export async function onRequestGet() {
  return new Response("WEBHOOK OK", { status: 200 });
}
