import { init, parse } from "es-module-lexer";
import MagicString from "magic-string";
import type { Plugin, ResolvedConfig } from "vite";
import { isWorkerComponent } from "../utils";
import { isComponentishName } from "../utils/react";
import { ENV_PUBLIC_PATH, parseWorkerRequest } from "../utils/viteWorker";

const WorkerFileId = "react_worker_component";
export default function workerFile(): Plugin {
  let config: ResolvedConfig;
  return {
    enforce: "post",
    name: "react-worker-components:worker_file",
    configResolved: (_config) => {
      config = _config;
    },
    async transform(src, id) {
      const isBuild = config.command === "build";
      const query = parseWorkerRequest(id);

      if (
        (query && query[WorkerFileId] != null) ||
        // handle worker components here in build
        (isBuild && isWorkerComponent(id))
      ) {
        await init;

        const s = new MagicString(src);
        const exports = parse(src)[1];
        const exposedExports = exports
          .filter(isComponentishName)
          .map((component) => `\nexpose(${component}, '${component}');`)
          .join("");

        s.prepend(
          `import { expose } from 'react-worker-components-plugin/rwc';\n`
        );
        s.append(exposedExports);

        if (!isBuild) {
          s.prepend(`import '${ENV_PUBLIC_PATH}'\n`);
        }

        return {
          code: s.toString(),
          map: s.generateMap(),
        };
      }
    },
  };
}
