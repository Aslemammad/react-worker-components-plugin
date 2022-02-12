import MagicString from "magic-string";
import path from "path";
import type { Plugin, ResolvedConfig } from "vite";
import type Rollup from "rollup";
import { isWorkerComponent } from "../utils";
import {
  cleanUrl,
  fileToUrl,
  getAssetHash,
  injectQuery,
  onRollupWarning,
} from "../utils/viteWorker";

const WorkerFileId = "react_worker_component";
export default function workerComponent(): Plugin {
  let config: ResolvedConfig;
  return {
    enforce: "post",
    name: "react-worker-components:worker_component",
    configResolved: (_config) => {
      config = _config;
    },
    async transform(code, id) {
      if (id.includes(WorkerFileId)) {
        return;
      }
      if (!isWorkerComponent(id)) {
        return;
      }

      const s = new MagicString(code);
      const isBuild = config.command === "build";
      let url: string;
      if (isBuild) {
        // bundle the file as entry to support imports
        const rollup = await import("rollup");
        const bundle = await rollup.rollup({
          input: cleanUrl(id),
          plugins: config.plugins
          .filter(
            (p) => !p.name.includes("react-worker-components:worker_component")
          ) as Rollup.Plugin[],
          onwarn(warning, warn) {
            onRollupWarning(warning, warn, config);
          },
        });
        let code: string;
        try {
          const { output } = await bundle.generate({
            format: "esm",
            name: "worker_component",
            sourcemap: config.build.sourcemap,
          });
          code = output[0].code;
        } finally {
          await bundle.close();
        }
        const content = Buffer.from(code);

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
      } else {
        url = injectQuery(
          await fileToUrl(cleanUrl(id), config, this),
          WorkerFileId
        );
      }

      const workerConstructor = "Worker";
      const workerOptions = { type: "module" };

      const result = `export default function WorkerWrapper() {
          return new ${workerConstructor}(${JSON.stringify(
        url
      )}, ${JSON.stringify(workerOptions, null, 2)})
        }
        `;
      s.remove(0, code.length);

      s.append(result);

      return { code: s.toString(), map: s.generateMap() };
    },
  };
}
