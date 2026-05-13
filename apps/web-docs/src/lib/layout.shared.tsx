import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { SITE_NAME } from "@/const/site";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: SITE_NAME,
    },
  };
}
