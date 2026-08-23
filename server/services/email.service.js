// Envío de notificaciones por email vía Resend (llamada HTTP directa, sin
// SDK adicional). Es un "best effort": si falla, se loguea pero nunca se
// lanza el error hacia arriba — un email de aviso no debe bloquear el flujo
// principal (p.ej. la creación de una cuenta).
const RESEND_API_URL = 'https://api.resend.com/emails';

async function enviarEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`RESEND_API_KEY no configurada — no se pudo enviar el email "${subject}"`);
    return { ok: false };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Onpilot <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Error enviando email vía Resend:', res.status, data);
      return { ok: false, status: res.status, data };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    console.error('Error de red enviando email vía Resend:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { enviarEmail };
