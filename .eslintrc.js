// http://eslint.org/docs/user-guide/configuring

module.exports = {
  "env": {
    "node": true
  },
  "extends": [
    'eslint:recommended',
    'plugin:node/recommended'
  ],
  "parserOptions": {
    "ecmaVersion": 2017,
    "sourceType": "script"
  },
  "globals": {
    "config": "readonly",
    "logger": "readonly"
  },
  "rules": {
    'arrow-parens': ["warn", "always"],
    'generator-star-spacing': 1,
    'quotes': "off",
    'indent': ['warn', 2, { "MemberExpression": "off", "SwitchCase": 1 }],
    'semi': ['warn', 'always'],
    'func-call-spacing': 0,
    'curly': "off",
    'no-console': process.env.NODE_ENV === 'production' ? 2 : 0,
    'no-unused-vars': ["warn", { "argsIgnorePattern": "^_" }]
  }
}
