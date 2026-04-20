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

  const event = JSON.parse(rawBody);

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object;

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

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
