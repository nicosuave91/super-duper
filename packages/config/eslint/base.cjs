module.exports = {
  root: false,
  env: { es2022: true, node: true },
  extends: ['eslint:recommended', 'prettier'],
  ignorePatterns: ['dist', 'build', '.turbo', 'node_modules']
};
