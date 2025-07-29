module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    es2020: true,
  },
  extends: [
    "eslint:recommended",
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    "no-unused-vars": ["warn", { 
      "vars": "all",
      "args": "none",           // 함수 파라미터는 체크 안함
      "ignoreRestSiblings": true,
      "argsIgnorePattern": "^_", // _로 시작하는 변수는 무시
      "varsIgnorePattern": "^_"  // _로 시작하는 변수는 무시
    }],
    "quotes": "off",
    "semi": "off",
    "comma-dangle": "off",
    "no-console": "off",
    "indent": "off",
    "object-curly-spacing": "off",
    "max-len": "off",
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "camelcase": "off",
    "new-cap": "off",
    "no-trailing-spaces": "off",
    "padded-blocks": "off",
    "space-before-function-paren": "off",
    "keyword-spacing": "off",
    "space-infix-ops": "off",
    "eol-last": "off",
    "no-multiple-empty-lines": "off",
    "brace-style": "off",
    "curly": "off",
    "no-restricted-globals": "off",
    "prefer-arrow-callback": "off",
  },
};