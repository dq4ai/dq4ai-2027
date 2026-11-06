import astro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      ".remember/",
      "dist/",
      "dist-fixture/",
      ".astro/",
      ".lighthouseci/",
      "playwright-report/",
      "test-results/",
    ],
  },
  ...tseslint.configs.strict,
  ...astro.configs.recommended,
  { rules: { "@typescript-eslint/no-explicit-any": "error" } },
];
