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

function resolveSeoImage(imagePath = "/icon-192.png") {
  return buildPublicAppUrl(imagePath);
}

export function usePageSeo({
  title,
  description,
  path = "/",
  robots = "index, follow",
  ogType = "website",
  locale = "ru",
  imagePath = "/icon-192.png",
}: SeoOptions) {
  useEffect(() => {
    const canonicalUrl = buildPublicAppUrl(path);
    const imageUrl = resolveSeoImage(imagePath);
    const htmlLang = locale === "kk" ? "kk" : locale === "en" ? "en" : "ru";
    const ogLocale = locale === "kk" ? "kk_KZ" : locale === "en" ? "en_US" : "ru_KZ";

    document.title = title;
    document.documentElement.lang = htmlLang;

    upsertCanonical(canonicalUrl);
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
  }, [description, imagePath, locale, ogType, path, robots, title]);
}
