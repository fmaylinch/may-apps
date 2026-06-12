import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseExampleHeader, type ExampleMeta } from "@/lib/examples";
import type { AppType } from "@/lib/types";

// Enumerates the bundled examples under public/examples/, reading each file's
// header comment for metadata. The directory is the single source of truth —
// dropping a new file in there is all it takes to register an example.
//
// public/ files aren't traced into the serverless bundle automatically, so
// next.config.ts adds an `outputFileTracingIncludes` entry for this route.
const EXAMPLES_DIR = path.join(process.cwd(), "public", "examples");

export async function GET() {
  let files: string[];
  try {
    files = await readdir(EXAMPLES_DIR);
  } catch {
    return Response.json([]);
  }

  const examples: ExampleMeta[] = [];
  for (const file of files.sort()) {
    if (!/\.(jsx?|tsx?)$/.test(file)) continue;
    const code = await readFile(path.join(EXAMPLES_DIR, file), "utf8");
    const header = parseExampleHeader(code);
    const slug = file.replace(/\.[^.]+$/, "");
    const fallbackType: AppType = file.endsWith(".jsx") || file.endsWith(".tsx") ? "react" : "vanilla";
    examples.push({
      slug,
      name: header.name ?? slug,
      description: header.description ?? "",
      type: header.type ?? fallbackType,
      file,
      template: header.template,
    });
  }

  return Response.json(examples);
}
