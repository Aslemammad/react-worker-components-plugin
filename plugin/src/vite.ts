import MagicString from "magic-string";
import { init, parse } from "es-module-lexer";
import type { Plugin } from "vite";

export default function plugin(): Plugin {
  return {
    enforce: "pre",
    name: "react-worker-components",
    resolveId(id) {
      if(isWorkerComponent(id)) {
        // console.log(id)
        return id + '?worker'
      }
      return null;
    },
    async transform(src, id, options) {
      console.log(id)
      if(isWorkerComponent(id)) {
        // console.log('here', src)
        return src

      }
      // await init;
      // if (isWorkerComponent(id)) {
      //   const s = new MagicString(src)
      //
      //   const exports = parse(src)[1];
      //   console.log(exports, src, id)
      //   // console.log(src, id, options);
      //   return { code: src };
      // }
      //
      return null;
    },
  };
}

function isWorkerComponent(id: string) {
  return id.includes(".worker.");
}

function isComponentishName(name: string) {
  return typeof name === "string" && name[0] >= "A" && name[0] <= "Z";
}
