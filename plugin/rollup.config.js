import esbuild from "rollup-plugin-esbuild";
import dts from "rollup-plugin-dts";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import alias from "@rollup/plugin-alias";
import pkg from "./package.json";

const entry = ["src/vite.ts", "src/rwc.ts", "src/index.ts"];

const external = [
  ...Object.keys(pkg.dependencies || []),
  ...Object.keys(pkg.peerDependencies || []),
];

export default [
  {
    input: entry,
    output: {
      dir: "dist",
      format: "esm",
    },
    external,
    plugins: [
      alias({
        entries: [{ find: /^node:(.+)$/, replacement: "$1" }],
      }),
      resolve({
        preferBuiltins: true,
      }),
      json(),
      commonjs(),
      esbuild({
        target: "node14",
      }),
    ],
  },
  {
    input: ["src/vite.ts"],
    output: {
      file: "dist/vite.d.ts",
      format: "esm",
    },
    external,
    plugins: [dts({ respectExternal: true })],
  },
  {
    input: ["src/index.ts"],
    output: {
      file: "dist/index.d.ts",
      format: "esm",
    },
    external,
    plugins: [dts({ respectExternal: true })],
  },
];
