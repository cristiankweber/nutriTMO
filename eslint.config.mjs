import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const stableReactHookRules = new Set([
  "react-hooks/rules-of-hooks",
  "react-hooks/exhaustive-deps",
]);
const slowDisabledCoreRules = new Set(["no-dupe-keys", "no-import-assign"]);

const stableNextVitals = nextVitals.map((config) => {
  if (!config.rules) {
    return config;
  }

  const rules = Object.fromEntries(
    Object.entries(config.rules).filter(([ruleName]) => {
      return !ruleName.startsWith("react-hooks/") || stableReactHookRules.has(ruleName);
    }),
  );

  return {
    ...config,
    rules,
  };
});

const stableNextTs = nextTs.map((config) => {
  if (!config.rules) {
    return config;
  }

  const rules = Object.fromEntries(
    Object.entries(config.rules).filter(([ruleName, ruleValue]) => {
      const disabled = ruleValue === "off" || ruleValue === 0;
      return !(disabled && slowDisabledCoreRules.has(ruleName));
    }),
  );

  return {
    ...config,
    rules,
  };
});

const eslintConfig = defineConfig([
  ...stableNextVitals,
  ...stableNextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "src/generated/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
