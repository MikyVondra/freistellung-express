export async function onRequestPost(context) {
  const { request, env } = context;

  const rawBody = await request.text();

  let event;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid body", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // 🔥 DŮLEŽITÉ – fallback na metadata
    const email =
      session.customer_details?.email ||
      session.metadata?.email;

    if (email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Freistellung Express <noreply@freistellung-express.com>",
          to: [email],
          subject: "Platba přijata",
          html: `<p>Děkujeme za objednávku ✔</p>`,
        }),
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
