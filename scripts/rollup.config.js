import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import replace from 'rollup-plugin-replace';
import nodeGlobals from 'rollup-plugin-node-globals';
import { terser } from 'rollup-plugin-terser';
import { sizeSnapshot } from 'rollup-plugin-size-snapshot';

const input = './src/index.js';
const globals = {
  Converter: 'Converter',
  Units: "Units"
};
const babelOptions = {
  exclude: ["./build/**", "node_modules/**"],
  // We are using @babel/plugin-transform-runtime
  runtimeHelpers: true,
  configFile: './babel.config.js',
};
const commonjsOptions = {
  ignoreGlobal: true,
  include: ["./src/index.js", "node_modules/**"],
  namedExports: {},
};

function onwarn(warning) {
  throw Error(warning.message);
}

export default [
  {
    input,
    onwarn,
    output: {
      file: 'build/umd/rbac-a.js',
      format: 'umd',
      name: 'Converter',
      exports: 'named',
      globals,
    },
    external: Object.keys(globals),
    plugins: [
      nodeResolve(),
      babel(babelOptions),
      commonjs(commonjsOptions),
      nodeGlobals(), // Wait for https://github.com/cssinjs/jss/pull/893
      replace({ 'process.env.NODE_ENV': JSON.stringify('development') }),
    ],
  },
  {
    input,
    onwarn,
    output: {
      file: 'build/umd/rbac-a.min.js',
      format: 'umd',
      name: 'Converter',
      exports: 'named',
      sourcemap: true,
      globals,
    },
    external: Object.keys(globals),
    plugins: [
      nodeResolve(),
      babel(babelOptions),
      commonjs(commonjsOptions),
      nodeGlobals(), // Wait for https://github.com/cssinjs/jss/pull/893
      replace({ 'process.env.NODE_ENV': JSON.stringify('production') }),
      sizeSnapshot({ snapshotPath: 'size-snapshot.json' }),
      terser(),
    ],
  },
];