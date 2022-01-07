import { ResolvedConfig, Plugin, normalizePath } from "vite";
import mime from "mime/lite";
import fs, { promises as fsp } from "fs";
import { createHash } from "crypto";
import { parse as parseUrl, URLSearchParams, pathToFileURL, URL } from "url";
import type Rollup from "rollup";
import path from "path";
import {
  OutputOptions,
  PluginContext,
  RollupWarning,
  WarningHandler,
} from "rollup";
import chalk from "chalk";

const warningIgnoreList = [`CIRCULAR_DEPENDENCY`, `THIS_IS_UNDEFINED`];
const dynamicImportWarningIgnoreList = [
  `Unsupported expression`,
  `statically analyzed`,
];
export function onRollupWarning(
  warning: RollupWarning,
  warn: WarningHandler,
  config: ResolvedConfig
): void {
  if (warning.code === "UNRESOLVED_IMPORT") {
    const id = warning.source;
    const importer = warning.importer;
    // throw unless it's commonjs external...
    if (!importer || !/\?commonjs-external$/.test(importer)) {
      throw new Error(
        `[vite]: Rollup failed to resolve import "${id}" from "${importer}".\n` +
          `This is most likely unintended because it can break your application at runtime.\n` +
          `If you do want to externalize this module explicitly add it to\n` +
          `\`build.rollupOptions.external\``
      );
    }
  }

  if (
    warning.plugin === "rollup-plugin-dynamic-import-variables" &&
    dynamicImportWarningIgnoreList.some((msg) => warning.message.includes(msg))
  ) {
    return;
  }

  if (!warningIgnoreList.includes(warning.code!)) {
    const userOnWarn = config.build.rollupOptions?.onwarn;
    if (userOnWarn) {
      userOnWarn(warning, warn);
    } else if (warning.code === "PLUGIN_WARNING") {
      config.logger.warn(
        `${chalk.bold.yellow(`[plugin:${warning.plugin}]`)} ${chalk.yellow(
          warning.message
        )}`
      );
    } else {
      warn(warning);
    }
  }
}
export const ENV_PUBLIC_PATH = `/@vite/env`;
export const FS_PREFIX = `/@fs/`;
export const queryRE = /\?.*$/s;
export const hashRE = /#.*$/s;
export function injectQuery(url: string, queryToInject: string): string {
  // encode percents for consistent behavior with pathToFileURL
  // see #2614 for details
  let resolvedUrl = new URL(url.replace(/%/g, "%25"), "relative:///");
  if (resolvedUrl.protocol !== "relative:") {
    resolvedUrl = pathToFileURL(url);
  }
  let { protocol, pathname, search, hash } = resolvedUrl;
  if (protocol === "file:") {
    pathname = pathname.slice(1);
  }
  pathname = decodeURIComponent(pathname);
  return `${pathname}?${queryToInject}${search ? `&` + search.slice(1) : ""}${
    hash || ""
  }`;
}
export const cleanUrl = (url: string): string =>
  url.replace(hashRE, "").replace(queryRE, "");
export function checkPublicFile(
  url: string,
  { publicDir }: ResolvedConfig
): string | undefined {
  // note if the file is in /public, the resolver would have returned it
  // as-is so it's not going to be a fully resolved path.
  if (!publicDir || !url.startsWith("/")) {
    return;
  }
  const publicFile = path.join(publicDir, cleanUrl(url));
  if (fs.existsSync(publicFile)) {
    return publicFile;
  } else {
    return;
  }
}

/**
 * converts the source filepath of the asset to the output filename based on the assetFileNames option. \
 * this function imitates the behavior of rollup.js. \
 * https://rollupjs.org/guide/en/#outputassetfilenames
 *
 * @example
 * ```ts
 * const content = Buffer.from('text');
 * const fileName = assetFileNamesToFileName(
 *   'assets/[name].[hash][extname]',
 *   '/path/to/file.txt',
 *   getAssetHash(content),
 *   content
 * )
 * // fileName: 'assets/file.982d9e3e.txt'
 * ```
 *
 * @param assetFileNames filename pattern. e.g. `'assets/[name].[hash][extname]'`
 * @param file filepath of the asset
 * @param contentHash hash of the asset. used for `'[hash]'` placeholder
 * @param content content of the asset. passed to `assetFileNames` if `assetFileNames` is a function
 * @returns output filename
 */
export function assetFileNamesToFileName(
  assetFileNames: Exclude<OutputOptions["assetFileNames"], undefined>,
  file: string,
  contentHash: string,
  content: string | Buffer
): string {
  const basename = path.basename(file);

  // placeholders for `assetFileNames`
  // `hash` is slightly different from the rollup's one
  const extname = path.extname(basename);
  const ext = extname.substring(1);
  const name = basename.slice(0, -extname.length);
  const hash = contentHash;

  if (typeof assetFileNames === "function") {
    assetFileNames = assetFileNames({
      name: file,
      source: content,
      type: "asset",
    });
    if (typeof assetFileNames !== "string") {
      throw new TypeError("assetFileNames must return a string");
    }
  } else if (typeof assetFileNames !== "string") {
    throw new TypeError("assetFileNames must be a string or a function");
  }

  const fileName = assetFileNames.replace(
    /\[\w+\]/g,
    (placeholder: string): string => {
      switch (placeholder) {
        case "[ext]":
          return ext;

        case "[extname]":
          return extname;

        case "[hash]":
          return hash;

        case "[name]":
          return name;
      }
      throw new Error(
        `invalid placeholder ${placeholder} in assetFileNames "${assetFileNames}"`
      );
    }
  );

  return fileName;
}
const assetCache = new WeakMap<ResolvedConfig, Map<string, string>>();
const assetHashToFilenameMap = new WeakMap<
  ResolvedConfig,
  Map<string, string>
>();
// save hashes of the files that has been emitted in build watch
const emittedHashMap = new WeakMap<ResolvedConfig, Set<string>>();
export function getAssetHash(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
}
export async function fileToBuiltUrl(
  id: string,
  config: ResolvedConfig,
  pluginContext: PluginContext,
  skipPublicCheck = false
): Promise<string> {
  if (!skipPublicCheck && checkPublicFile(id, config)) {
    return config.base + id.slice(1);
  }

  const cache = assetCache.get(config)!;
  const cached = cache.get(id);
  if (cached) {
    return cached;
  }

  const file = cleanUrl(id);
  const content = await fsp.readFile(file);

  let url: string;
  if (
    config.build.lib ||
    (!file.endsWith(".svg") &&
      content.length < Number(config.build.assetsInlineLimit))
  ) {
    // base64 inlined as a string
    url = `data:${mime.getType(file)};base64,${content.toString("base64")}`;
  } else {
    // emit as asset
    // rollup supports `import.meta.ROLLUP_FILE_URL_*`, but it generates code
    // that uses runtime url sniffing and it can be verbose when targeting
    // non-module format. It also fails to cascade the asset content change
    // into the chunk's hash, so we have to do our own content hashing here.
    // https://bundlers.tooling.report/hashing/asset-cascade/
    // https://github.com/rollup/rollup/issues/3415
    const map = assetHashToFilenameMap.get(config)!;
    const contentHash = getAssetHash(content);
    const { search, hash } = parseUrl(id);
    const postfix = (search || "") + (hash || "");
    const output = config.build?.rollupOptions?.output;
    const assetFileNames =
      (output && !Array.isArray(output) ? output.assetFileNames : undefined) ??
      // defaults to '<assetsDir>/[name].[hash][extname]'
      // slightly different from rollup's one ('assets/[name]-[hash][extname]')
      path.posix.join(config.build.assetsDir, "[name].[hash][extname]");
    const fileName = assetFileNamesToFileName(
      assetFileNames,
      file,
      contentHash,
      content
    );
    if (!map.has(contentHash)) {
      map.set(contentHash, fileName);
    }
    const emittedSet = emittedHashMap.get(config)!;
    if (!emittedSet.has(contentHash)) {
      const name = normalizePath(path.relative(config.root, file));
      pluginContext.emitFile({
        name,
        fileName,
        type: "asset",
        source: content,
      });
      emittedSet.add(contentHash);
    }

    url = `__VITE_ASSET__${contentHash}__${postfix ? `$_${postfix}__` : ``}`;
  }

  cache.set(id, url);
  return url;
}

export function fileToDevUrl(id: string, config: ResolvedConfig) {
  let rtn: string;
  if (checkPublicFile(id, config)) {
    // in public dir, keep the url as-is
    rtn = id;
  } else if (id.startsWith(config.root)) {
    // in project root, infer short public path
    rtn = "/" + path.posix.relative(config.root, id);
  } else {
    // outside of project root, use absolute fs path
    // (this is special handled by the serve static middleware
    rtn = path.posix.join(FS_PREFIX + id);
  }
  const origin = config.server?.origin ?? "";
  return origin + config.base + rtn.replace(/^\//, "");
}

export function fileToUrl(
  id: string,
  config: ResolvedConfig,
  ctx: PluginContext
): string | Promise<string> {
  if (config.command === "serve") {
    return fileToDevUrl(id, config);
  } else {
    return fileToBuiltUrl(id, config, ctx);
  }
}
export function parseWorkerRequest(id: string): Record<string, string> | null {
  const { search } = parseUrl(id);
  if (!search) {
    return null;
  }
  return Object.fromEntries(new URLSearchParams(search.slice(1)));
}

const WorkerFileId = "worker_file";

export function webWorkerPlugin(config: ResolvedConfig): Plugin {
  const isBuild = config.command === "build";

  return {
    name: "vite:worker",

    load(id) {
      if (isBuild) {
        const parsedQuery = parseWorkerRequest(id);
        if (
          parsedQuery &&
          (parsedQuery.worker ?? parsedQuery.sharedworker) != null
        ) {
          return "";
        }
      }
    },

    async transform(_, id) {
      const query = parseWorkerRequest(id);
      if (query && query[WorkerFileId] != null) {
        return {
          code: `import '${ENV_PUBLIC_PATH}'\n` + _,
        };
      }
      if (
        query == null ||
        (query && (query.worker ?? query.sharedworker) == null)
      ) {
        return;
      }

      let url: string;
      if (isBuild) {
        // bundle the file as entry to support imports
        const rollup = require("rollup") as typeof Rollup;
        const bundle = await rollup.rollup({
          input: cleanUrl(id),
          // plugins: await resolvePlugins({ ...config }, [], [], []),
          onwarn(warning, warn) {
            onRollupWarning(warning, warn, config);
          },
        });
        let code: string;
        try {
          const { output } = await bundle.generate({
            format: "iife",
            sourcemap: config.build.sourcemap,
          });
          code = output[0].code;
        } finally {
          await bundle.close();
        }
        const content = Buffer.from(code);
        if (query.inline != null) {
          // inline as blob data url
          return `const encodedJs = "${content.toString("base64")}";
            const blob = typeof window !== "undefined" && window.Blob && new Blob([atob(encodedJs)], { type: "text/javascript;charset=utf-8" });
            export default function WorkerWrapper() {
              const objURL = blob && (window.URL || window.webkitURL).createObjectURL(blob);
              try {
                return objURL ? new Worker(objURL) : new Worker("data:application/javascript;base64," + encodedJs, {type: "module"});
              } finally {
                objURL && (window.URL || window.webkitURL).revokeObjectURL(objURL);
              }
            }`;
        } else {
          const basename = path.parse(cleanUrl(id)).name;
          const contentHash = getAssetHash(content);
          const fileName = path.posix.join(
            config.build.assetsDir,
            `${basename}.${contentHash}.js`
          );
          url = `__VITE_ASSET__${this.emitFile({
            fileName,
            type: "asset",
            source: code,
          })}__`;
        }
      } else {
        url = await fileToUrl(cleanUrl(id), config, this);
        url = injectQuery(url, WorkerFileId);
      }

      const workerConstructor =
        query.sharedworker != null ? "SharedWorker" : "Worker";
      const workerOptions = { type: "module" };

      return `export default function WorkerWrapper() {
        return new ${workerConstructor}(${JSON.stringify(
        url
      )}, ${JSON.stringify(workerOptions, null, 2)})
      }`;
    },
  };
}
