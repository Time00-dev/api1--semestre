import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const directory = process.argv[2] ? pathToFileURL(resolve(process.argv[2]) + sep) : new URL('./dist/', import.meta.url);
const entries = await readdir(directory, { recursive: true, withFileTypes: true });
const files = entries.filter(entry => !entry.isDirectory());
const extensions = new Set(['.html', '.css', '.js', '.svg', '.woff', '.woff2']);
const token = /\bsk-(?:(?:proj|svcacct|admin)-)?[\w-]{24,}\b/;
for (const entry of files) {
  const extension = extname(entry.name);
  if (!entry.isFile() || entry.name.startsWith('.') || !extensions.has(extension)) {
    throw new Error('Arquivo inesperado no build do Pages: ' + entry.name);
  }
  if (['.html', '.css', '.js', '.svg'].includes(extension)) {
    const value = await readFile(join(entry.parentPath, entry.name), 'utf8');
    if (token.test(value) || value.includes('api.openai.com') || value.includes('OPENAI_API_KEY')) {
      throw new Error('Referência privada encontrada no build do Pages: ' + entry.name);
    }
  }
}
const html = await readFile(new URL('index.html', directory), 'utf8');
if (!html.includes('Content-Security-Policy')) throw new Error('Política de conteúdo ausente no build do Pages.');
console.log('Artefato estático verificado: ' + files.length + ' arquivos.');
