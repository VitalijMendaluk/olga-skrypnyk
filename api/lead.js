/**
 * Vercel Serverless Function — POST /api/lead
 * Nimmt eine Terminanfrage vom Formular entgegen und schickt sie per Telegram-Bot.
 *
 * Benötigt (Vercel → Settings → Environment Variables):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (!TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: 'Telegram is not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  const { name, phone, service, price } = body || {};

  if (!name || !phone) {
    return res.status(400).json({ error: 'name and phone are required' });
  }

  // HTML-escape + Längenbegrenzung (Schutz vor Missbrauch)
  const clean = v => String(v == null ? '' : v)
    .slice(0, 200)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = [
    '💌 <b>Neue Terminanfrage</b>',
    '',
    `💅 <b>Behandlung:</b> ${clean(service) || '—'}`,
    `💶 <b>Preis:</b> ${clean(price) || '—'}`,
    `👤 <b>Name:</b> ${clean(name)}`,
    `📞 <b>Telefon:</b> ${clean(phone)}`
  ];

  try {
    const tg = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = await tg.json().catch(() => ({}));
    if (!tg.ok || !data.ok) {
      console.error('Telegram error:', data);
      return res.status(502).json({ error: 'Telegram error' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Send failed:', err);
    return res.status(502).json({ error: 'Send failed' });
  }
};
