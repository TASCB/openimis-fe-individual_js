// /root/openimis/frontend/openimis-fe-individual_js/rollup.config.js
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import babel from "@rollup/plugin-babel";
import pkg from "./package.json";

export default {
  input: "src/index.js",
  output: [
    { file: pkg.module, format: "es", sourcemap: true },
    { file: "dist/index.js", format: "cjs", sourcemap: true },
  ],
  external: [
    "react",
    "react-dom",
    "react-intl",
    "react-redux",
    /^@babel.*/,
    /^@date-io\/.*/,
    /^@material-ui\/.*/,
    /^@openimis.*/,
    "classnames",
    "clsx",
    "history",
    /^lodash.*/,
    "moment",
    "prop-types",
    /^redux.*/,
    "jspdf",
    "html2canvas",
    "recharts",
  ],

  plugins: [
    peerDepsExternal(),
    resolve({ browser: true, extensions: [".mjs", ".js", ".jsx", ".json"] }),
    commonjs({ include: /node_modules/, requireReturnsDefault: "auto" }),
    json(),
    babel({
      babelrc: false,
      extensions: [".js", ".jsx"],
      exclude: "node_modules/**",
      babelHelpers: "runtime",
      presets: [
        ["@babel/preset-env", { modules: false }],
        ["@babel/preset-react", { runtime: "automatic" }],
      ],
      plugins: ["@babel/plugin-transform-runtime"],
    }),
  ],
  treeshake: { moduleSideEffects: false },
};
