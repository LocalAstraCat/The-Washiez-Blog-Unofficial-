export const SITE_NAME = "The Washiez Chronicle";
export const SITE_DESCRIPTION = "A community-maintained reference for Washiez history, updates, and notable community moments.";
export const SITE_ORIGIN = "https://localastracat.github.io";
export const SITE_BASE_PATH = "/The-Washiez-Blog-Unofficial-";

export function publicUrl(path = "/") {
  const route = path === "/" ? "" : `/${path.replace(/^\/+/, "")}`;
  return `${SITE_ORIGIN}${SITE_BASE_PATH}${route}`;
}

export function articleDescription(body: string, maxLength = 155) {
  const compact = String(body ?? "").replace(/[#*_>`\[\]()]/g, "").replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact || SITE_DESCRIPTION;
  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

type MetadataOptions = {
  title: string;
  description: string;
  path?: string;
  structuredData?: Record<string, unknown>;
};

function setMeta(attribute: "name" | "property", key: string, value: string) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = value;
}

export function applyPublicMetadata({ title, description, path = "/", structuredData }: MetadataOptions) {
  if (typeof document === "undefined") return;
  const canonical = publicUrl(path);
  document.title = title;
  setMeta("name", "description", description);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", canonical);
  setMeta("property", "og:site_name", SITE_NAME);
  setMeta("property", "og:type", path.startsWith("/article/") ? "article" : "website");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  let canonicalTag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalTag) {
    canonicalTag = document.createElement("link");
    canonicalTag.rel = "canonical";
    document.head.append(canonicalTag);
  }
  canonicalTag.href = canonical;
  let dataTag = document.head.querySelector<HTMLScriptElement>("#chronicle-structured-data");
  if (!dataTag) {
    dataTag = document.createElement("script");
    dataTag.id = "chronicle-structured-data";
    dataTag.type = "application/ld+json";
    document.head.append(dataTag);
  }
  dataTag.textContent = JSON.stringify(structuredData ?? {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: publicUrl(),
    description: SITE_DESCRIPTION,
    inLanguage: "en",
  });
}
