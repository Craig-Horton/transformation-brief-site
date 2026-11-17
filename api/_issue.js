// Turns an approved issue (markdown) into the email that subscribers receive.
// The leading underscore keeps this file from becoming a route.
//
// The first "# " line is the headline and becomes the subject. A line that starts
// "The Transformation Brief," directly under it becomes the issue line in the header.
// "## " lines are section labels, "### " lines are item headings, and the paragraph
// under a "## ... question" section is set in the navy box.

const FOOTER = 'The Transformation Brief is written in a personal capacity and uses public sources.';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Links and bold, applied to text that has already been escaped.
function inlineHtml(text) {
  return esc(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, t, u) => `<a href="${u}" style="color:#a65f1a;">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function inlineText(text) {
  return text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)').replace(/\*\*([^*]+)\*\*/g, '$1');
}

export function parseIssue(markdown) {
  const raw = String(markdown || '').replace(/\r\n/g, '\n');
  const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  let title = '';
  let dateline = '';
  const parts = [];
  let inQuestion = false;
  for (const block of blocks) {
    if (block.startsWith('# ') && !title) { title = block.slice(2).trim(); continue; }
    if (!dateline && /^The Transformation Brief,/.test(block) && !block.includes('\n')) {
      dateline = block.replace(/^The Transformation Brief,\s*/, '').trim();
      continue;
    }
    if (block === FOOTER) continue; // the email carries this line in its own footer
    if (block.startsWith('### ')) { parts.push({ kind: 'h3', text: block.slice(4).trim() }); inQuestion = false; continue; }
    if (block.startsWith('## ')) {
      const text = block.slice(3).trim();
      parts.push({ kind: 'h2', text });
      inQuestion = /question/i.test(text);
      continue;
    }
    const lines = block.split('\n');
    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      parts.push({ kind: 'ul', items: lines.map((l) => l.replace(/^[-*]\s+/, '')) });
      continue;
    }
    const text = lines.join(' ');
    if (inQuestion) { parts.push({ kind: 'question', text }); inQuestion = false; continue; }
    parts.push({ kind: 'p', text });
  }
  return { title, dateline, parts };
}

export function renderHtml(issue, unsubscribeLink) {
  const P = 'margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1a2a47;';
  const LI = 'margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1a2a47;';
  const SMALL = 'margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#647087;';
  const H1 = 'margin:0 0 16px;font-family:Georgia,serif;font-size:28px;line-height:1.15;color:#1a2a47;font-weight:700;';
  const H2 = 'margin:26px 0 12px;padding-top:18px;border-top:1px solid #d9dce2;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;color:#c97a2b;';
  const H3 = 'margin:0 0 6px;font-family:Georgia,serif;font-size:19px;line-height:1.25;color:#1a2a47;font-weight:700;';
  const body = issue.parts.map((p) => {
    if (p.kind === 'h2') return `<p style="${H2}">${inlineHtml(p.text)}</p>`;
    if (p.kind === 'h3') return `<h3 style="${H3}">${inlineHtml(p.text)}</h3>`;
    if (p.kind === 'ul') return `<ul style="margin:0 0 16px;padding-left:22px;">${p.items.map((i) => `<li style="${LI}">${inlineHtml(i)}</li>`).join('')}</ul>`;
    if (p.kind === 'question') return `<div style="margin:0 0 20px;background:#1a2a47;padding:20px 22px;font-family:Georgia,serif;font-size:19px;line-height:1.4;color:#ffffff;">${inlineHtml(p.text)}</div>`;
    return `<p style="${P}">${inlineHtml(p.text)}</p>`;
  }).join('\n');
  return `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:600px;margin:0 auto;">
<div style="background:#1a2a47;padding:22px 24px;border-top:5px solid #c97a2b;">
<div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#ffffff;">The Transformation Brief</div>
${issue.dateline ? `<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.12em;color:#e2a358;margin-top:8px;">${esc(issue.dateline)}</div>` : ''}
</div>
<div style="padding:26px 24px 8px;">
<h1 style="${H1}">${inlineHtml(issue.title)}</h1>
${body}
<hr style="border:none;border-top:1px solid #d9dce2;margin:24px 0 14px;">
<p style="${SMALL}">You are receiving this because you subscribed on my website. <a href="${unsubscribeLink}" style="color:#a65f1a;">Unsubscribe with one click</a>.</p>
<p style="${SMALL}">${FOOTER}</p>
</div>
</div>
</body></html>`;
}

export function renderText(issue, unsubscribeLink) {
  const out = [issue.title, issue.dateline ? `The Transformation Brief, ${issue.dateline}` : 'The Transformation Brief', ''];
  for (const p of issue.parts) {
    if (p.kind === 'ul') out.push(p.items.map((i) => `- ${inlineText(i)}`).join('\n'), '');
    else out.push(inlineText(p.text), '');
  }
  out.push(`Unsubscribe with one click: ${unsubscribeLink}`, '', FOOTER);
  return out.join('\n');
}
