import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const distDir = path.join(root, "dist");
const ssrDir = path.join(root, "dist-ssr");
const publicUrl = normalizeBaseUrl(process.env.VITE_PUBLIC_APP_URL || "https://healthcare-bmo.vercel.app");

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

function buildRouteUrl(routePath) {
  if (routePath === "/") {
    return `${publicUrl}/`;
  }

  return `${publicUrl}${routePath}`;
}

function updateTag(source, pattern, replacement) {
  return source.replace(pattern, replacement);
}

function injectSeo(template, seo) {
  const imageUrl = `${publicUrl}/icon-192.png`;

  let html = template;
  html = updateTag(html, /<title>.*?<\/title>/s, `<title>${seo.title}</title>`);
  html = updateTag(html, /<meta name="description" content=".*?" \/>/s, `<meta name="description" content="${seo.description}" />`);
  html = updateTag(html, /<meta name="robots" content=".*?" \/>/s, `<meta name="robots" content="${seo.robots ?? "index, follow"}" />`);
  html = updateTag(html, /<link rel="canonical" href=".*?" \/>/s, `<link rel="canonical" href="${seo.canonicalUrl}" />`);
  html = updateTag(html, /<meta property="og:title" content=".*?" \/>/s, `<meta property="og:title" content="${seo.title}" />`);
  html = updateTag(html, /<meta property="og:description" content=".*?" \/>/s, `<meta property="og:description" content="${seo.description}" />`);
  html = updateTag(html, /<meta property="og:image" content=".*?" \/>/s, `<meta property="og:image" content="${imageUrl}" />`);
  html = updateTag(html, /<meta property="og:url" content=".*?" \/>/s, `<meta property="og:url" content="${seo.canonicalUrl}" />`);
  html = updateTag(html, /<meta name="twitter:title" content=".*?" \/>/s, `<meta name="twitter:title" content="${seo.title}" />`);
  html = updateTag(html, /<meta name="twitter:description" content=".*?" \/>/s, `<meta name="twitter:description" content="${seo.description}" />`);
  html = updateTag(html, /<meta name="twitter:image" content=".*?" \/>/s, `<meta name="twitter:image" content="${imageUrl}" />`);

  return html;
}

async function main() {
  const template = await fs.readFile(path.join(distDir, "index.html"), "utf8");
  const { render, PRERENDER_ROUTES, getPublicSeo } = await import(
    pathToFileURL(path.join(ssrDir, "entry-server.js")).href
  );

  for (const routePath of PRERENDER_ROUTES) {
    const appHtml = render(routePath);
    const seo = getPublicSeo(routePath, "ru");
    const html = injectSeo(
      template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`),
      {
        ...seo,
        canonicalUrl: buildRouteUrl(routePath),
      },
    );

    const outputPath =
      routePath === "/"
        ? path.join(distDir, "index.html")
        : path.join(distDir, routePath.slice(1), "index.html");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, html, "utf8");
  }

  const notFoundHtml = injectSeo(
    template.replace('<div id="root"></div>', `<div id="root">${render("/404")}</div>`),
    {
      title: "404 — Страница не найдена | HealthAssist",
      description: "Страница HealthAssist не найдена. Проверьте адрес или вернитесь на главную.",
      canonicalUrl: `${publicUrl}/404`,
      robots: "noindex, nofollow",
    },
  );

  await fs.writeFile(path.join(distDir, "404.html"), notFoundHtml, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
