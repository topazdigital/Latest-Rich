import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const isBuild = process.argv.includes("build");

const rawPort = process.env.PORT;
if (!isBuild && !rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort || "5000");
if (!isBuild && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

function findMatchingBrace(source: string, openIndex: number) {
  let depth = 0;
  let parentheses = 0;
  let quote = "";
  let comment = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (comment) {
      if (character === "*" && nextCharacter === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }

    if (!quote && character === "/" && nextCharacter === "*") {
      comment = true;
      index += 1;
      continue;
    }

    if (quote) {
      if (character === quote && source[index - 1] !== "\\") {
        quote = "";
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "(") {
      parentheses += 1;
    } else if (character === ")") {
      parentheses = Math.max(0, parentheses - 1);
    } else if (parentheses === 0 && character === "{") {
      depth += 1;
    } else if (parentheses === 0 && character === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function unwrapFirstCssAtRule(source: string, atRule: string) {
  const atRuleIndex = source.search(new RegExp(`@${atRule}\\b`));
  if (atRuleIndex === -1) return source;

  const openIndex = source.indexOf("{", atRuleIndex);
  if (openIndex === -1) return source;

  const closeIndex = findMatchingBrace(source, openIndex);
  if (closeIndex === -1) return source;

  return (
    source.slice(0, atRuleIndex) +
    source.slice(openIndex + 1, closeIndex) +
    source.slice(closeIndex + 1)
  );
}

function removeFirstCssAtRule(source: string, atRule: string) {
  const atRuleIndex = source.search(new RegExp(`@${atRule}\\b`));
  if (atRuleIndex === -1) return source;

  const openIndex = source.indexOf("{", atRuleIndex);
  if (openIndex === -1) return source;

  const closeIndex = findMatchingBrace(source, openIndex);
  if (closeIndex === -1) return source;

  return source.slice(0, atRuleIndex) + source.slice(closeIndex + 1);
}

function createLegacyCssFallback() {
  return {
    name: "legacy-css-fallback",
    apply: "build" as const,
    generateBundle(
      _options: unknown,
      bundle: Record<
        string,
        { type: string; source?: string | Uint8Array }
      >,
    ) {
      const cssAsset = Object.entries(bundle).find(
        ([fileName, asset]) =>
          asset.type === "asset" && /\.css$/i.test(fileName),
      )?.[1];

      if (!cssAsset?.source) return;

      let legacyCss =
        typeof cssAsset.source === "string"
          ? cssAsset.source
          : new TextDecoder().decode(cssAsset.source);
      let previousCss = "";

      while (legacyCss !== previousCss) {
        previousCss = legacyCss;
        legacyCss = unwrapFirstCssAtRule(legacyCss, "layer");
      }

      previousCss = "";
      while (legacyCss !== previousCss) {
        previousCss = legacyCss;
        legacyCss = removeFirstCssAtRule(legacyCss, "property");
      }

      legacyCss = legacyCss
        .replace(/\b(100|sv|lv)dvh\b/g, "$1vh")
        .replace(/\b100svh\b/g, "100vh")
        .replace(/\b100lvh\b/g, "100vh");

      this.emitFile({
        type: "asset",
        fileName: "assets/index-legacy.css",
        source: legacyCss,
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    legacy({
      // Keep the modern bundle for current browsers, while also producing
      // a transpiled/polyfilled bundle for Edge Legacy and older Safari,
      // Chrome, and Firefox releases.
      targets: [
        "Edge >= 16",
        "Chrome >= 49",
        "Firefox >= 52",
        "Safari >= 10.1",
        "iOS >= 10.3",
      ],
      modernPolyfills: true,
    }),
    createLegacyCssFallback(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Tailwind v4 emits modern CSS syntax that Edge Legacy can reject as a
    // stylesheet. Lower the CSS separately from the JavaScript legacy bundle
    // so older Edge, Safari, iOS, Chrome, and Firefox receive usable styles.
    cssMinify: "lightningcss",
    cssTarget: [
      "edge16",
      "chrome49",
      "firefox52",
      "safari10.1",
      "ios10.3",
    ],
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        ws: true,
      },
      "/sitemap.xml": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/sitemap-index.xml": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/sitemap-static.xml": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/sitemap-": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/robots.txt": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
