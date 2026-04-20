export async function onRequestPost(context) {
  const { request, env } = context;

  const formData = await request.formData();

  const email = formData.get("Email") || "";
  const name = formData.get("Jmeno") || "";
  const service = formData.get("VYBRANA SLUZBA") || "80";

  // 🎯 mapování služby → cena
  let amount = 8000;
  let serviceName = "Podání žádosti (80 €)";

  if (service === "100") {
    amount = 10000;
    serviceName = "Kompletní vyřízení (100 €)";
  }

  if (service === "120") {
    amount = 12000;
    serviceName = "Komplet se Steuernummer (120 €)";
  }

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      mode: "payment",

      success_url: "https://freistellung-express.com/dekujeme",
      cancel_url: "https://freistellung-express.com/zruseno",

      customer_email: email,

      // 🔥 metadata → půjde do webhooku
      "metadata[name]": name,
      "metadata[email]": email,
      "metadata[service]": serviceName,

      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][product_data][name]": serviceName,
      "line_items[0][price_data][unit_amount]": amount,
      "line_items[0][quantity]": "1",
    }),
  });

  const session = await stripeRes.json();

  return Response.redirect(session.url, 303);
}
