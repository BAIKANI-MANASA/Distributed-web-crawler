module.exports = {
  root: true,
  ignorePatterns: ["dist", "node_modules"],
  env: { browser: true, es2020: true },
  extends: ["eslint:recommended"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  plugins: ["react-hooks", "react-refresh"],
  rules: {
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
  },
  settings: { react: { version: "18.3" } }
};
