// eslint-disable-next-line @typescript-eslint/no-var-requires
const prettierRc = require("./.prettierrc");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");
module.exports = {
  env: {
    node: true,
    jest: true,
  },
  extends: ["plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    project: path.resolve(__dirname, "tsconfig.json"),
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "prettier/prettier": ["error", prettierRc],
    "no-unused-vars": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "no-useless-constructor": "off",
    "@typescript-eslint/no-useless-constructor": "error",
    "@typescript-eslint/no-explicit-any": "off",
    "lines-between-class-members": ["error", "always"],
  },
};
