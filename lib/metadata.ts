import type { Metadata } from "next";

/* Generates consistent page metadata using the layout title template */
export function pageMeta(title: string, description?: string): Metadata {
  return {
    title,
    description: description ?? "EduResults — Student Result Portal",
  };
}
