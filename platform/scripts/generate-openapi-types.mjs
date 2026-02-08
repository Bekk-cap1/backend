import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const platformRoot = resolve(__dirname, '..');
const source = resolve(platformRoot, '.cache', 'openapi.json');
const outFile = resolve(
  platformRoot,
  'packages',
  'shared',
  'src',
  'types',
  'openapi.d.ts',
);

const ast = await openapiTS(new URL(`file://${source}`), {
  alphabetize: true,
  exportType: true,
});
const generated = astToString(ast);

const header = `/* eslint-disable */\n/* AUTO-GENERATED FILE. DO NOT EDIT. */\n`;
await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, `${header}${generated}`, 'utf8');

console.log(`[openapi] generated ${outFile}`);
