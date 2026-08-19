/** Builds a same-site URL that works both locally and under a GitHub Pages project base path. */
export function sitePath(path: string, basePath = import.meta.env.BASE_URL) {
  const route = `/${path.replace(/^\/+/, "")}`;
  const base = basePath === "/" ? "" : `/${basePath.replace(/^\/+|\/+$/g, "")}`;
  return `${base}${route}`;
}
