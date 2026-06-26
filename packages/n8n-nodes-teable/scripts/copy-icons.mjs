// n8n loads a node's icon from a path relative to the compiled .node.js
// (e.g. `file:teable.svg`). tsc only emits .js, so copy the SVGs into dist/
// preserving their folder layout.
import { cp, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const roots = ['nodes', 'credentials'];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.svg') || entry.name.endsWith('.png')) yield full;
  }
}

for (const root of roots) {
  try {
    for await (const icon of walk(root)) {
      const dest = join('dist', relative('.', icon));
      await cp(icon, dest);
      console.log(`copied ${icon} -> ${dest}`);
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}
