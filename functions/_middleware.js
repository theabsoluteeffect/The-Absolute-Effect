/*
 * Trial-page clinical-context guard.
 * Cloudflare Pages middleware: adds a non-prescriptive reminder to every trial route
 * until each page has a completed, source-linked freshness review.
 */
const NOTE = `
<aside class="ae-freshness-note" role="note" aria-label="Clinical currency note">
  <strong>Clinical currency</strong>
  <p>This page summarizes evidence from a specific trial or study. Its findings may not, by themselves, reflect the current standard of care. Before applying the result, check subsequent follow-up, newer trials and current disease-specific guidelines.</p>
</aside>`;

const CSS = `
.ae-freshness-note{box-sizing:border-box;margin:18px 0 24px;padding:15px 18px;border:1px solid #d8d8d2;border-left:4px solid #686861;border-radius:10px;background:#f3f3ef;color:#292923;font:14px/1.55 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.ae-freshness-note strong{display:block;margin-bottom:4px;font-size:12px;letter-spacing:.07em;text-transform:uppercase}
.ae-freshness-note p{margin:0}
`;

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const response = await context.next();
  if (!url.pathname.startsWith("/trial-pages/") ||
      !/text\/html/i.test(response.headers.get("content-type") || "") ||
      response.status >= 400) {
    return response;
  }

  return new HTMLRewriter()
    .on("head", { element(element) {
      element.append("<style>" + CSS + "</style>", { html: true });
    }})
    .on("main", { element(element) {
      element.prepend(NOTE, { html: true });
    }})
    .transform(response);
}
