import { mkdir, writeFile } from "node:fs/promises";

const origin = "https://localastracat.github.io/The-Washiez-Blog-Unofficial-";
const output = "dist/public/sitemap.xml";
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[character]);
}

function entry(loc, lastmod) {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}\n  </url>`;
}

let publishedPosts = [];
if (supabaseUrl && supabaseKey) {
  const response = await fetch(`${supabaseUrl}/rest/v1/posts?select=slug,updated_at,published_at&status=eq.published`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });
  if (!response.ok) throw new Error(`Could not load published posts for sitemap: ${response.status}`);
  publishedPosts = await response.json();
}

const urls = [entry(`${origin}/`), entry(`${origin}/about`)];
for (const post of publishedPosts) urls.push(entry(`${origin}/article/${encodeURIComponent(post.slug)}`, post.updated_at || post.published_at));
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
await mkdir("dist/public", { recursive: true });
await writeFile(output, xml, "utf8");
console.log(`Generated sitemap with ${urls.length} URLs.`);
