import { readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const manifest = JSON.parse(await readFile(resolve(root, "output/public-portal-preview/theme-assets/manifest.json"), "utf8"));
for (const item of manifest.images) {
  const source = resolve(root, item.sourcePath);
  const target = resolve(root, item.webPath);
  const metadata = await sharp(source).metadata();
  if (metadata.width !== item.w || metadata.height !== item.h) {
    throw new Error(`Unexpected image dimensions for ${item.key}-${item.theme}: ${metadata.width}x${metadata.height}`);
  }
  await mkdir(dirname(target), { recursive: true });
  const result = await sharp(source).webp({ quality: 86, effort: 5 }).toFile(target);
  console.log(`${item.key}-${item.theme}: ${result.width}x${result.height}, ${Math.round(result.size / 1024)} KB`);
}
