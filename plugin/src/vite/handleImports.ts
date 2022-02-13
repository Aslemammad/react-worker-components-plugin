import { ImportSpecifier, parse } from "es-module-lexer";
import MagicString from "magic-string";
import type { Plugin } from "vite";

export default function handleImports(): Plugin {
  return {
    enforce: "post",
    name: "react-worker-components:handle_imports",

    async transform(src) {
      const imports = parse(src)[0];
      const workerComponentImports = importsWorkerComponent(imports);
      if (workerComponentImports.length) {
        const s = new MagicString(src);
        let index = 0;

        for (const {
          ss: statementStart,
          se: statementEnd,
          n,
        } of workerComponentImports) {
          const importContent = /\{(.*?)\}/.exec(
            src.substring(statementStart, statementEnd)
          )?.[1];

          const entries: Record<string, string> = {};

          importContent?.split(",")?.forEach((i) => {
            if (i.includes("as")) {
              const [component, as] = i.split("as");
              entries[component.trim()] = as.trim();
            } else {
              entries[i.trim()] = i.trim();
            }
          });

          s.remove(statementStart, statementEnd);
          const wrapImportContent = `import { wrap } from 'react-worker-components-plugin/rwc';`
          const injectedWrapImportContent = s.toString().includes(wrapImportContent) ? '' : wrapImportContent;

          const workerName = `__RWC_WORKER_${index}`;
          const workerNameCreator = `create__RWC_WORKER_${index}`;
          const newContent = `
          ${injectedWrapImportContent}
          import ${workerName} from '${n}';
          const ${workerNameCreator} = () => new ${workerName}();

          ${Object.entries(entries)
            .map(([component, as]) => {
              return `const ${as} = wrap(${workerNameCreator}, '${component}');`;
            })
            .join("\n")}
            `;
          s.prepend(newContent);

          index++;
        }

        return {
          code: s.toString(),
          map: s.generateMap(),
        };
      }
    },
  };
}

function importsWorkerComponent(imports: readonly ImportSpecifier[]) {
  return imports.filter(({ n }) => n?.includes(".worker"));
}
