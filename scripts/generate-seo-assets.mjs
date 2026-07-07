import fs from "node:fs";
import path from "node:path";

const defaultPublicUrl = "https://healthcare.kz";
const publicUrl = normalizeBaseUrl(process.env.VITE_PUBLIC_APP_URL || defaultPublicUrl);
const publicDir = path.resolve(process.cwd(), "public");
const buildDate = new Date().toISOString();

const sitemapRoutes = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/body", changefreq: "weekly", priority: "0.9" },
  { path: "/privacy", changefreq: "yearly", priority: "0.5" },
  { path: "/terms", changefreq: "yearly", priority: "0.5" },
  { path: "/medical-disclaimer", changefreq: "yearly", priority: "0.4" },
];

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

function buildUrl(routePath, lang) {
  const baseUrl = routePath === "/" ? `${publicUrl}/` : `${publicUrl}${routePath}`;
  if (!lang || lang === "ru") {
    return baseUrl;
  }
  return `${baseUrl}?lang=${lang}`;
}

const robotsTxt = `User-agent: *
Disallow: /admin/
Disallow: /doctor/
Disallow: /auth/
Disallow: /scan/
Disallow: /pair/
Disallow: /app/
Disallow: /login
Disallow: /register
Allow: /

Sitemap: ${publicUrl}/sitemap.xml
`;

const languages = ["ru", "kk", "en"];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapRoutes
  .flatMap((route) => {
    return languages.map((lang) => {
      const locUrl = buildUrl(route.path, lang);
      const alternates = languages.map((l) => {
        return `    <xhtml:link rel="alternate" hreflang="${l}" href="${buildUrl(route.path, l)}" />`;
      });
      alternates.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${buildUrl(route.path, "ru")}" />`);

      return `  <url>
    <loc>${locUrl}</loc>
    <lastmod>${buildDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
${alternates.join("\n")}
  </url>`;
    });
  })
  .join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8");

console.log(`Generated robots.txt and sitemap.xml for ${publicUrl}`);
