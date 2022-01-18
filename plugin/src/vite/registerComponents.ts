import { parse } from "es-module-lexer";
import MagicString from "magic-string";
import type { Plugin, ResolvedConfig } from "vite";
import { isWorkerComponent } from "../utils";
import { isComponentishName } from "../utils/react";

export default function registerComponents(): Plugin {
  let config: ResolvedConfig;
  return {
    enforce: "post",
    name: "react-worker-components:register_components",
    configResolved(_config) {
      config = _config;
    },
    // register every component in a file that is not a worker
    transform(src, id) {
      if (isWorkerComponent(id)) {
        return;
      }
      if (!id.includes(config.root)) {
        return;
      }

      const s = new MagicString(src);
      const exports = parse(src)[1];
      const components = exports.filter(isComponentishName);
      if (!components.length) {
        return;
      }
      const registeredExports = components
        .map((component) => `\nregister(${component},'${component}');`)
        .join("");

      s.prepend(
        `import { register } from 'react-worker-components-plugin/rwc';\n`
      );
      s.append(registeredExports);

      return {
        code: s.toString(),
        map: s.generateMap(),
      };
    },
  };
}
