import fs from "node:fs";
import path from "node:path";

const defaultPublicUrl = "https://healthcare-bmo.vercel.app";
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

function buildUrl(routePath) {
  if (routePath === "/") {
    return `${publicUrl}/`;
  }

  return `${publicUrl}${routePath}`;
}

const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${publicUrl}/sitemap.xml
`;

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapRoutes
  .map(
    (route) => `  <url>
    <loc>${buildUrl(route.path)}</loc>
    <lastmod>${buildDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemapXml, "utf8");

console.log(`Generated robots.txt and sitemap.xml for ${publicUrl}`);
