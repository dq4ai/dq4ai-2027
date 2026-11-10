import type { ImageMetadata } from "astro";

const images = {
  ...import.meta.glob<{ default: ImageMetadata }>("/src/content/images/*.{jpg,jpeg,png,webp,avif}"),
  ...import.meta.glob<{ default: ImageMetadata }>(
    "/tests/fixtures/content-populated/images/*.{jpg,jpeg,png,webp,avif}",
  ),
};

/** A content image by its file name, from the real or the test content folder. */
export async function contentImage(file: string): Promise<ImageMetadata> {
  const loader = Object.entries(images).find(([path]) => path.endsWith(`/${file}`))?.[1];
  if (!loader) throw new Error(`Image "${file}" is not in the images folder`);
  return (await loader()).default;
}
