from pathlib import Path
from xml.sax.saxutils import escape

BASE = "https://theabsoluteeffect.pages.dev"
root = Path(".")

urls = [f"{BASE}/", f"{BASE}/evidence/"]
for page in sorted((root / "trial-pages").glob("*/index.html")):
    urls.append(f"{BASE}/trial-pages/{page.parent.name}/")

urls = sorted(set(urls))
xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
xml.extend(f"  <url><loc>{escape(url)}</loc></url>" for url in urls)
xml.append('</urlset>')
(root / "sitemap.xml").write_text("\n".join(xml) + "\n", encoding="utf-8")
(root / "robots.txt").write_text(
    "User-agent: *\nAllow: /\n\nSitemap: " + BASE + "/sitemap.xml\n",
    encoding="utf-8",
)
print(f"Generated sitemap with {len(urls)} URLs")
