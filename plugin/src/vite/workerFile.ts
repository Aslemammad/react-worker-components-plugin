import { init, parse } from "es-module-lexer";
import MagicString from "magic-string";
import type { Plugin } from "vite";
import { isComponentishName } from "../utils/react";
import { ENV_PUBLIC_PATH, parseWorkerRequest } from "../utils/viteWorker";

const WorkerFileId = "react_worker_component";
export default function workerFile(): Plugin {
  return {
    enforce: "post",
    name: "react-worker-components:worker_file",
    async transform(src, id) {
      const query = parseWorkerRequest(id);

      if (query && query[WorkerFileId] != null) {
        await init;

        const s = new MagicString(src);
        const exports = parse(src)[1];
        const exposedExports = exports
          .filter(isComponentishName)
          .map((component) => `\nexpose(${component});`)
          .join("");

        s.prepend(
          `import { expose } from 'react-worker-components-plugin/rwc';\n`
        );
        s.append(exposedExports);

        s.prepend(`import '${ENV_PUBLIC_PATH}'\n`);
        return {
          code: s.toString(),
          map: s.generateMap(),
        };
      }
    },
  };
}


