export async function onRequestPost(context) {
    const { request } = context;

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    try {
        const formData = await request.formData();

        const fields = {};
        const attachments = [];

        for (const [key, value] of formData.entries()) {
            if (value instanceof File && value.size > 0) {
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

        // 🔥 TADY UŽ NIC NEPOSÍLÁŠ (žádný resend!)

        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers,
        });

    } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
            status: 500,
            headers,
        });
    }
}

// ✅ MUSÍ BÝT MIMO
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
