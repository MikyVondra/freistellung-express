export async function onRequestPost(context) {
  const { request, env } = context;

  const formData = await request.formData();

  const fields = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') fields[key] = value;
  }

  const email       = fields['Email']          || '';
  const name        = fields['Jmeno']          || '';
  const cena        = parseInt(fields['CENA']  || '0', 10);
  const serviceMap  = { 80: 'Podání žádosti', 100: 'Kompletní vyřízení', 120: 'Komplet se Steuernummer' };
  const serviceName = serviceMap[cena] || 'Freistellung Express';

  // Všechna pole formuláře do Stripe metadata (klíče bez mezer)
  const metaParams = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'CENA') continue;
    const safeKey = key.replace(/\s+/g, '_').slice(0, 40);
    metaParams[`metadata[${safeKey}]`] = String(value).slice(0, 490);
  }

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      mode: 'payment',
      success_url: 'https://freistellung-express.com/?platba=ok',
      cancel_url:  'https://freistellung-express.com/',
      customer_email: email,
      'line_items[0][price_data][currency]':              'eur',
      'line_items[0][price_data][product_data][name]':    serviceName,
      'line_items[0][price_data][unit_amount]':           String(cena * 100),
      'line_items[0][quantity]':                          '1',
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
