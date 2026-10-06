import js from "@eslint/js";
import alpinejs from "eslint-plugin-alpinejs";
import htmlPlugin from "@html-eslint/eslint-plugin";
import htmlParser from "@html-eslint/parser";
import globals from "globals";

/**
 * Zero-Build ESLint Flat Configuration
 * Analyzes JS logic, Alpine.js constructs, and HTML markup integrity.
 */
export default [
  // Global Ignores
  {
    ignores: [
      "**/node_modules/**",
      "frontend/dist/**",
      "dist/**",
      "frontend/tests/**",
      "purgecss-linter.js",
      "emulator-data/**"
    ]
  },

  // 1. JavaScript Rules
  {
    files: ["frontend/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
        Alpine: "readonly",
        firebase: "readonly"
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^(firebaseApp|auth|app|db|_)" }],
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "prefer-const": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='document'][callee.property.name=/^(querySelector|querySelectorAll|getElementById)$/]",
          message: "Imperative DOM queries are strictly prohibited. Utilize Alpine.js $refs, x-model, or $store binding for state mapping."
        },
        {
          selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]",
          message: "Directly manipulating HTML strings violates the declarative state. Utilize Alpine.js x-html or x-text directives."
        },
        {
          selector: "CallExpression[callee.object.name='document'][callee.property.name='createElement']",
          message: "Manual element creation is prohibited. Utilize Alpine.js x-for arrays bound to state data to render dynamic node lists."
        }
      ]
    }
  },

  // 2. HTML and Alpine.js Directives Rules
  {
    files: ["frontend/**/*.html"],
    languageOptions: {
      parser: htmlParser,
    },
    plugins: {
      "@html-eslint": htmlPlugin,
      "alpinejs": alpinejs
    },
    rules: {
      "@html-eslint/require-doctype": "error",
      "@html-eslint/no-duplicate-id": "error",
      "@html-eslint/no-multiple-empty-lines": ["error", { "max": 1 }],
      "alpinejs/no-raw-dom-access": "error",
      "alpinejs/no-unused-xrefs": "error"
    }
  }
];
