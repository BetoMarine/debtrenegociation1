import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertBuildStorageNs, isPreviewNs } from "./src/shared/storage/ns-policy.js";

const SITE = "/debtrenegociation1";

export function previewNumber(ns) {
  const match = /^pyl-preview-pr(\d+)$/.exec(String(ns || ""));
  return match ? match[1] : null;
}

export function manifestIds(ns) {
  const pr = previewNumber(ns);
  if (pr) {
    const base = `${SITE}/preview/pr-${pr}`;
    return {
      preview: true,
      pr,
      rd: `${base}/`,
      fortune: `${base}/fortune/`,
      sunday: `${base}/sunday/`,
    };
  }
  return {
    preview: false,
    pr: null,
    rd: `${SITE}/`,
    fortune: `${SITE}/fortune/`,
    sunday: `${SITE}/sunday/`,
  };
}

export function badgeSvg(pr) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#7e22ce"/>
  <text x="256" y="230" text-anchor="middle" font-family="sans-serif" font-size="72" fill="#ffffff">Preview</text>
  <text x="256" y="340" text-anchor="middle" font-family="sans-serif" font-size="120" font-weight="700" fill="#ffffff">PR ${pr}</text>
</svg>
`;
}

export function enhanceManifest(raw, { id, pr }) {
  const json = JSON.parse(raw);
  json.id = id;
  if (pr) {
    json.name = `Preview PR ${pr} · ${json.name}`;
    json.icons = [
      { src: "icons/preview-badge.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      ...(json.icons || []),
    ];
  }
  return `${JSON.stringify(json, null, 2)}\n`;
}

export function transformPreviewHtml(html) {
  return html
    .replace(/\/\* pyl-cache-heal:start \*\/[\s\S]*?\/\* pyl-cache-heal:end \*\//, "/* preview cache heal is prefix-scoped in sw.js */")
    .replace(/href="\/(?:fortune\/|sunday\/)?manifest\.webmanifest"/g, 'href="manifest.webmanifest"');
}

function writeDist(root, rel, contents) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

export function foundationPlugins({ command, storageNs, preview }) {
  assertBuildStorageNs({ command, storageNs });
  const ns = storageNs || "";
  const ids = manifestIds(ns);
  const isPreview = preview || isPreviewNs(ns);
  return [
    {
      name: "pyl-preview-migration-stub",
      enforce: "pre",
      resolveId(source) {
        if (command !== "build" || !isPreview) return null;
        if (source.includes("migrate-ns-v1")) return "\0pyl-migrate-ns-v1-stub";
        return null;
      },
      load(id) {
        if (id !== "\0pyl-migrate-ns-v1-stub") return null;
        return `export const LEGACY_DB_NAMES = [];
export async function migrateNamespacesV1(){ return { migrated: false, reason: "preview" }; }
export async function snapshotDb(){ return ""; }
export function stableString(value){ return JSON.stringify(value); }
`;
      },
    },
    {
      name: "pyl-generated-manifests",
      transformIndexHtml(html) {
        if (!isPreview) return html;
        return transformPreviewHtml(html);
      },
      closeBundle() {
        if (command !== "build") return;
        const dist = join(process.cwd(), "dist");
        const entries = [
          ["manifest.webmanifest", "manifest.webmanifest", ids.rd, "icons/preview-badge.svg"],
          ["fortune/manifest.webmanifest", "fortune/manifest.webmanifest", ids.fortune, "fortune/icons/preview-badge.svg"],
          ["sunday/manifest.webmanifest", "sunday/manifest.webmanifest", ids.sunday, "sunday/icons/preview-badge.svg"],
        ];
        for (const [srcRel, destRel, id, badgeRel] of entries) {
          const raw = readFileSync(join(process.cwd(), "public", srcRel), "utf8");
          writeDist(dist, destRel, enhanceManifest(raw, { id, pr: isPreview ? ids.pr : null }));
          if (isPreview && ids.pr) writeDist(dist, badgeRel, badgeSvg(ids.pr));
        }
      },
    },
  ];
}
