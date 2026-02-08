import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const platformRoot = resolve(__dirname, '..');
const source = resolve(platformRoot, '..', 'docs', 'openapi.json');
const target = resolve(platformRoot, '.cache', 'openapi.json');
const remoteUrl = process.env.OPENAPI_HTTP_SOURCE ?? 'http://localhost:3000/docs/openapi.json';

await mkdir(dirname(target), { recursive: true });

try {
  await copyFile(source, target);
  console.log(`[openapi] copied ${source} -> ${target}`);
} catch (copyError) {
  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const raw = await response.text();
    JSON.parse(raw);
    await writeFile(target, raw, 'utf8');
    console.log(`[openapi] fetched ${remoteUrl} -> ${target}`);
  } catch (fetchError) {
    let hint = '';
    try {
      const cached = await readFile(target, 'utf8');
      JSON.parse(cached);
      hint = ' Existing .cache/openapi.json is valid and can be used.';
    } catch {
      hint = '';
    }
    const reason =
      fetchError instanceof Error
        ? fetchError.message
        : String(fetchError ?? copyError);
    throw new Error(
      `[openapi] unable to fetch OpenAPI from local file or HTTP source (${reason}).${hint}`,
    );
  }
}
