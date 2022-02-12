import type { Plugin } from "vite";
import workerComponent from "./vite/workerComponent";
import workerFile from "./vite/workerFile";
import handleImports from "./vite/handleImports";
import registerComponents from "./vite/registerComponents";

export default function plugin(): Plugin[] {
  return [
    registerComponents(),
    workerFile(),
    handleImports(),
    workerComponent(),
  ];
}
