import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const source = path.join(rootDir, 'brand', 'social-share.svg');
  const target = path.join(rootDir, 'brand', 'social-share.png');

  const svg = await readFile(source, 'utf8');
  const renderer = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    background: 'transparent'
  });
  const pngData = renderer.render();
  const pngBuffer = pngData.asPng();

  await writeFile(target, pngBuffer);
  console.log(`Rendered social share image → ${path.relative(rootDir, target)}`);
}

main().catch((error) => {
  console.error('Failed to render social share artwork');
  console.error(error);
  process.exit(1);
});
