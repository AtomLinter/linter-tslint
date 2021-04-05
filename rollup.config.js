import { createPlugins } from "rollup-plugin-atomic"

const plugins = createPlugins([
  ["ts", { tsconfig: "./lib/tsconfig.json" }, true],
  "js",
  "json"
])

const CommonConfig = {
  output: [
    {
      dir: "dist",
      format: "cjs",
      sourcemap: true,
    },
  ],
  external: ["atom"],
  plugins,
}

const RollupConfig = [
  // Main
  {
    input: "lib/main.ts",
    ...CommonConfig
  },
  // Worker
  {
    input: "lib/worker.ts",
    ...CommonConfig
  },
]
export default RollupConfig
