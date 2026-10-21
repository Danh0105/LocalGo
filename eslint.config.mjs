import parser from "@typescript-eslint/parser";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { builtinRules } = require("eslint/use-at-your-own-risk");
const recommended = Object.fromEntries(
  [...builtinRules].filter(([, rule]) => rule.meta.docs.recommended).map(([name]) => [name, "error"]),
);

export default [{
  files: ["src/**/*.{ts,tsx}"],
  languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
  rules: {
    ...recommended,
    // TypeScript handles names and declarations (including type-only bindings).
    "no-undef": "off",
    "no-unused-vars": "off",
    "no-redeclare": "off",
    "no-dupe-class-members": "off",
    "no-setter-return": "off",
  },
}, {
  files: ["src/lib/google-maps-link.ts"],
  // This URL sanitizer intentionally rejects ASCII control characters.
  rules: { "no-control-regex": "off" },
}, {
  files: ["src/components/content-reviews/index.tsx"],
  // Existing UI validation replaces the API error with a user-facing message.
  rules: { "preserve-caught-error": "off" },
}];
