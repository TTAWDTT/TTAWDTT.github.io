import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const docsDir = path.join(rootDir, "docs");
const outputPath = path.join(docsDir, "manifest.json");

async function collectMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const name = entry.name.toLowerCase();
        if (name.startsWith(".") || name === "docs") {
          return [];
        }
        return collectMarkdownFiles(fullPath);
      }
      if (!entry.name.toLowerCase().endsWith(".md")) {
        return [];
      }
      if (entry.name.toLowerCase() === "index.md") {
        return [];
      }
      return [fullPath];
    })
  );
  return files.flat();
}

function toDocsRelative(filePath) {
  const rel = path.relative(docsDir, filePath);
  return rel.split(path.sep).join("/");
}

async function main() {
  const files = await collectMarkdownFiles(docsDir);
  const items = await Promise.all(
    files.map(async (filePath) => {
      const stats = await fs.stat(filePath);
      return {
        path: toDocsRelative(filePath),
        modifiedAt: stats.mtime.toISOString()
      };
    })
  );
  items.sort((a, b) => a.path.localeCompare(b.path, "zh"));
  const manifest = {
    generatedAt: new Date().toISOString(),
    items
  };
  await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
