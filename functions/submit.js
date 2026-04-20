export async function onRequestPost(context) {
    const { request, env } = context;

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    try {
        const formData = await request.formData();

        // Collect all text fields
        const fields = {};
        const attachments = [];

        for (const [key, value] of formData.entries()) {
            if (value instanceof File && value.size > 0) {
                // Convert file to base64
                const arrayBuffer = await value.arrayBuffer();
               const bytes = new Uint8Array(arrayBuffer);
let binary = '';
for (let i = 0; i < bytes.byteLength; i++) {
  binary += String.fromCharCode(bytes[i]);
}
const base64 = btoa(binary);
                attachments.push({
                    filename: value.name,
                    content: base64,
                });
            } else if (typeof value === 'string') {
                fields[key] = value;
            }
        }

        // Build email HTML
        const html = `
      <h2>Nová objednávka Freistellung Express</h2>
      <table style="border-collapse:collapse;width:100%">
        ${Object.entries(fields).map(([k, v]) => `
          <tr>
            <td style="padding:6px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;width:200px">${k}</td>
            <td style="padding:6px 12px;border:1px solid #e5e7eb">${v || '-'}</td>
          </tr>
        `).join('')}
      </table>
      ${attachments.length > 0 ? `<p style="margin-top:16px">📎 Přílohy: ${attachments.map(a => a.filename).join(', ')}</p>` : '<p style="margin-top:16px;color:#6b7280">Žádné přílohy nebyly nahrány.</p>'}
    `;

        // Send via Resend
        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Freistellung Express <noreply@freistellung-express.com>',
                to: ['mira.jaros7@seznam.cz'],
                subject: `Nová objednávka — ${fields['Jmeno'] || 'neznámý'} (${fields['VYBRANA SLUZBA'] || ''})`,
                html,
                attachments,
            }),
        });

        if (!resendRes.ok) {
            const err = await resendRes.text();
            return new Response(JSON.stringify({ ok: false, error: err }), { status: 500, headers });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });

    } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers });
    }
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
