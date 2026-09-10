from pathlib import Path
from html import escape
import json
import re

BASE = "https://theabsoluteeffect.pages.dev"
ROOT = Path("trial-pages")


def strip_tags(text):
    return re.sub(r"<[^>]+>", " ", text).strip()


def upsert_meta(head, name, content):
    tag = f'<meta name="{name}" content="{escape(content, quote=True)}">'
    pattern = rf'<meta\s+name="{re.escape(name)}"\s+content="[^"]*"\s*/?>'
    if re.search(pattern, head, flags=re.I):
        return re.sub(pattern, tag, head, count=1, flags=re.I)
    return head.replace("</head>", tag + "</head>", 1)


def upsert_property(head, prop, content):
    tag = f'<meta property="{prop}" content="{escape(content, quote=True)}">'
    pattern = rf'<meta\s+property="{re.escape(prop)}"\s+content="[^"]*"\s*/?>'
    if re.search(pattern, head, flags=re.I):
        return re.sub(pattern, tag, head, count=1, flags=re.I)
    return head.replace("</head>", tag + "</head>", 1)


updated = 0
for path in sorted(ROOT.glob("*/index.html")):
    html = path.read_text(encoding="utf-8")
    slug = path.parent.name
    url = f"{BASE}/trial-pages/{slug}/"

    title_match = re.search(r"<title>(.*?)</title>", html, flags=re.I | re.S)
    title = strip_tags(title_match.group(1)) if title_match else slug.replace("-", " ").title()

    q_match = re.search(r'<p class="question">(.*?)</p>', html, flags=re.I | re.S)
    question = strip_tags(q_match.group(1)) if q_match else ""
    description = f"{title}: {question}" if question else f"{title} — oncology evidence summary from The Absolute Effect."
    description = re.sub(r"\s+", " ", description).strip()
    if len(description) > 300:
        description = description[:297].rsplit(" ", 1)[0] + "..."

    head_match = re.search(r"<head>(.*?)</head>", html, flags=re.I | re.S)
    if not head_match:
        continue
    head = head_match.group(1)

    head = upsert_meta(head, "description", description)
    head = upsert_property(head, "og:title", title)
    head = upsert_property(head, "og:description", description)
    head = upsert_property(head, "og:url", url)
    head = upsert_property(head, "og:type", "article")

    canonical = f'<link rel="canonical" href="{url}">'
    if re.search(r'<link\s+rel="canonical"\s+href="[^"]*"\s*/?>', head, flags=re.I):
        head = re.sub(r'<link\s+rel="canonical"\s+href="[^"]*"\s*/?>', canonical, head, count=1, flags=re.I)
    else:
        head = head.replace("</head>", canonical + "</head>", 1)

    # Remove a previously generated block so repeated builds remain deterministic.
    head = re.sub(r'<script type="application/ld\+json" data-seo="trial">.*?</script>', "", head, flags=re.I | re.S)

    schema = {
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        "name": title,
        "url": url,
        "description": description,
        "isPartOf": {
            "@type": "WebSite",
            "name": "The Absolute Effect",
            "url": BASE + "/"
        },
        "about": {
            "@type": "MedicalStudy",
            "name": title
        },
        "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "The Absolute Effect", "item": BASE + "/"},
                {"@type": "ListItem", "position": 2, "name": "Evidence", "item": BASE + "/evidence/"},
                {"@type": "ListItem", "position": 3, "name": title, "item": url}
            ]
        }
    }
    ld = '<script type="application/ld+json" data-seo="trial">' + json.dumps(schema, ensure_ascii=False, separators=(",", ":")) + "</script>"
    head += ld

    html = html[:head_match.start(1)] + head + html[head_match.end(1):]
    path.write_text(html, encoding="utf-8")
    updated += 1

print(f"Updated SEO metadata and structured data for {updated} trial pages.")
