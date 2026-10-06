/**
 * Branded HTML for recruitment emails. Templates stay plain text (editable in the admin panel);
 * this only dresses them up. Table layout and inline styles, because email clients ignore most CSS.
 */
const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const paragraphs = (text: string): string => text.split(/\n{2,}/).map(part => part.trim()).filter(Boolean)
  .map(part => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#27272a;">${escapeHtml(part).replace(/\n/g, '<br>')}</p>`).join('');

/** A link inside the text becomes a button: the sentence before it, the button, then the rest. */
export function renderRecruitmentEmailHtml({ subject, text, actionUrl, actionLabel = 'Continuar mi postulación', siteUrl, code, unsubscribeUrl }: {
  subject: string; text: string; actionUrl?: string; actionLabel?: string; siteUrl: string; code?: string; unsubscribeUrl?: string;
}): string {
  const site = siteUrl.replace(/\/+$/, '');
  let content: string;
  if (actionUrl && text.includes(actionUrl)) {
    const [before, ...rest] = text.split(actionUrl);
    const after = rest.join(actionUrl).replace(/^[\s.,;:]+/, '');
    content = paragraphs(before.trim().replace(/:$/, '.'))
      + `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:10px;background:#75d32d;">`
      + `<a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:13px 22px;font-size:15px;font-weight:700;color:#0a0a0a;text-decoration:none;border-radius:10px;">${escapeHtml(actionLabel)}</a></td></tr></table>`
      + paragraphs(after)
      + `<p style="margin:0 0 16px;font-size:12px;line-height:1.6;color:#71717a;">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${escapeHtml(actionUrl)}" style="color:#4d8f1c;word-break:break-all;">${escapeHtml(actionUrl)}</a></p>`;
  } else if (code && text.includes(`\n\n${code}\n\n`)) {
    // A one-time code gets its own large, easy-to-copy box.
    const [before, after] = text.split(`\n\n${code}\n\n`);
    content = paragraphs(before)
      + `<p style="margin:4px 0 20px;padding:16px;border-radius:12px;background:#f4f4f5;text-align:center;font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#0a0a0a;">${escapeHtml(code)}</p>`
      + paragraphs(after);
  } else content = paragraphs(text);

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title></head>`
    + `<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">`
    + `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(subject)}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:32px 16px;">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">`
    + `<tr><td style="background:#0a0a0a;padding:20px 28px;"><a href="${escapeHtml(site)}" style="text-decoration:none;">`
    + `<img src="${escapeHtml(site)}/email/logo.png" width="32" height="30" alt="" style="vertical-align:middle;border:0;">`
    + `<span style="vertical-align:middle;margin-left:10px;font-size:18px;font-weight:800;letter-spacing:.06em;color:#75d32d;">UNICODE</span></a></td></tr>`
    + `<tr><td style="padding:32px 28px 16px;">${content}</td></tr>`
    + `<tr><td style="padding:20px 28px 28px;border-top:1px solid #f4f4f5;font-size:12px;line-height:1.6;color:#a1a1aa;">`
    + `UNICODE · Centro Cultural Estudiantil de Ingeniería · FIIS UNI<br>`
    + `Recibes este correo porque postulaste en <a href="${escapeHtml(site)}" style="color:#71717a;">ccunicode.org</a>.`
    + (unsubscribeUrl ? `<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#71717a;text-decoration:underline;">Dejar de recibir recordatorios o retirar postulación</a>` : '')
    + `</td></tr>`
    + `</table></td></tr></table></body></html>`;
}
