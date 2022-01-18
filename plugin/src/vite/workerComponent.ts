import MagicString from "magic-string";
import type { Plugin, ResolvedConfig } from "vite";
import { isWorkerComponent } from "../utils";
import { cleanUrl, fileToUrl, injectQuery } from "../utils/viteWorker";

const WorkerFileId = "react_worker_component";
export default function workerComponent(): Plugin {
  let config: ResolvedConfig;
  return {
    enforce: "post",
    name: "react-worker-components:worker_component",
    configResolved: (_config) => {
      config = _config;
    },
    async transform(_, id) {
      if (id.includes(WorkerFileId)) {
        return;
      }
      if (!isWorkerComponent(id)) {
        return;
      }
      const url = injectQuery(
        await fileToUrl(cleanUrl(id), config, this),
        WorkerFileId
      );

      const workerConstructor = "Worker";
      const workerOptions = { type: "module" };

      const result = `export default function WorkerWrapper() {
          return new ${workerConstructor}(${JSON.stringify(
        url
      )}, ${JSON.stringify(workerOptions, null, 2)})
        }
        `;
      const s = new MagicString(result);
      return { code: s.toString(), map: s.generateMap() };
    },
  };
}
