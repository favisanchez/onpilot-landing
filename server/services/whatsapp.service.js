// Integración con WhatsApp Cloud API (Meta): envío de mensajes salientes y
// verificación de la firma de los webhooks entrantes.
const crypto = require('crypto');

const GRAPH_API_VERSION = 'v20.0';

async function enviarMensajeWhatsapp(phoneNumberId, to, texto) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token || !phoneNumberId) {
    console.error('WhatsApp no configurado (falta WHATSAPP_ACCESS_TOKEN o phone_number_id) — no se envió:', texto);
    return { ok: false };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: texto },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Error enviando WhatsApp:', res.status, data);
      return { ok: false, status: res.status, data };
    }
    return { ok: true, id: data.messages?.[0]?.id };
  } catch (err) {
    console.error('Error de red enviando WhatsApp:', err.message);
    return { ok: false, error: err.message };
  }
}

// Meta firma el body crudo del webhook con HMAC-SHA256 usando el App
// Secret; comparación en tiempo constante para evitar timing attacks.
function firmaValida(bodyCrudo, cabeceraFirma) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !cabeceraFirma) return false;
  const esperada = 'sha256=' + crypto.createHmac('sha256', secret).update(bodyCrudo).digest('hex');
  const a = Buffer.from(esperada);
  const b = Buffer.from(cabeceraFirma);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { enviarMensajeWhatsapp, firmaValida };
