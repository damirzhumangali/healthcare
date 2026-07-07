import { useEffect } from "react";
import { buildPublicAppUrl } from "./publicAppUrl";

type SeoOptions = {
  title: string;
  description: string;
  path?: string;
  robots?: string;
  ogType?: "website" | "article";
  locale?: "ru" | "kk" | "en";
  imagePath?: string;
  jsonLd?: object;
};

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
}

function upsertAlternate(hreflang: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${hreflang}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "alternate");
    element.setAttribute("hreflang", hreflang);
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
}

function upsertJsonLd(id: string, schema: object | null) {
  let element = document.head.querySelector<HTMLScriptElement>(`script[id="${id}"]`);
  if (!schema) {
    if (element) {
      element.remove();
    }
    return;
  }
  if (!element) {
    element = document.createElement("script");
    element.setAttribute("type", "application/ld+json");
    element.setAttribute("id", id);
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(schema);
}

function buildLocaleUrl(path: string, targetLocale: string) {
  const baseUrl = buildPublicAppUrl(path);
  if (targetLocale === "ru") {
    return baseUrl;
  }
  return `${baseUrl}?lang=${targetLocale}`;
}

function resolveSeoImage(imagePath = "/favicon-healthassist-20260521.webp") {
  return buildPublicAppUrl(imagePath);
}

export function usePageSeo({
  title,
  description,
  path = "/",
  robots = "index, follow",
  ogType = "website",
  locale = "ru",
  imagePath = "/favicon-healthassist-20260521.webp",
  jsonLd,
}: SeoOptions) {
  const jsonLdString = JSON.stringify(jsonLd);

  useEffect(() => {
    const canonicalUrl = buildPublicAppUrl(path);
    const imageUrl = resolveSeoImage(imagePath);
    const htmlLang = locale === "kk" ? "kk" : locale === "en" ? "en" : "ru";
    const ogLocale = locale === "kk" ? "kk_KZ" : locale === "en" ? "en_US" : "ru_KZ";

    document.title = title;
    document.documentElement.lang = htmlLang;

    upsertCanonical(canonicalUrl);
    upsertAlternate("ru", buildLocaleUrl(path, "ru"));
    upsertAlternate("kk", buildLocaleUrl(path, "kk"));
    upsertAlternate("en", buildLocaleUrl(path, "en"));
    upsertAlternate("x-default", buildLocaleUrl(path, "ru"));

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);
    upsertMeta("property", "og:type", ogType);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:locale", ogLocale);
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", imageUrl);

    try {
      const schemaObj = jsonLdString ? JSON.parse(jsonLdString) : null;
      upsertJsonLd("page-jsonld", schemaObj);
    } catch {
      // Ignore JSON-LD parse errors
    }
  }, [description, imagePath, locale, ogType, path, robots, title, jsonLdString]);
}
