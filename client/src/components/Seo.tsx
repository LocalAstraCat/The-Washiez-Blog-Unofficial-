import { applyPublicMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { useEffect } from "react";

type SeoProps = {
  title?: string;
  description?: string;
  path?: string;
  structuredData?: Record<string, unknown>;
};

export function Seo({ title = SITE_NAME, description = SITE_DESCRIPTION, path = "/", structuredData }: SeoProps) {
  useEffect(() => { applyPublicMetadata({ title, description, path, structuredData }); }, [title, description, path, structuredData]);
  return null;
}
