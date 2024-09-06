import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import stylistic from "@stylistic/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: [
        "dev/*.js",
        "types/**/*.ts",
        "resources/**/*.js",
        "**/out",
        "**/node_modules",
        "viewer/viewer.mjs",
        "**/.idea/",
        "**/__pycache__/",
        "**/.mypy_cache/",
        "**/.pytest_cache/",
        "**/.venv/",
        ".vscode/",
        ".vscode-test/",
        "**/vscode.proposed.d.ts",
    ],
}, ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"), {
    files: ["**/*.ts", "**/*.js"],

    plugins: {
        '@stylistic': stylistic,
    },

    languageOptions: {
        globals: {
            ...globals.node,
            Atomics: "readonly",
            SharedArrayBuffer: "readonly",
        },

        parser: tsParser,
        ecmaVersion: 2018,
        sourceType: "commonjs",

        parserOptions: {
            project: "./tsconfig.eslint.json",
        },
    },

    rules: {
        "@stylistic/member-delimiter-style": ["error", {
            multiline: {
                delimiter: "comma",
                requireLast: false,
            },

            singleline: {
                delimiter: "comma",
                requireLast: false,
            },
        }],

        "@stylistic/semi": ["error", "never", {
            beforeStatementContinuationChars: "always",
        }],

        "@stylistic/type-annotation-spacing": "error",

        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-inferrable-types": "off",
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/prefer-interface": "off",

        "@typescript-eslint/naming-convention": ["error", {
            selector: "default",
            format: ["camelCase", "PascalCase", "UPPER_CASE"],
            leadingUnderscore: "allow",
        }, {
            selector: "method",
            format: ["camelCase"],
        }, {
            selector: "function",
            format: ["camelCase"],
        }, {
            selector: "typeLike",
            format: ["PascalCase"],
        }, {
            selector: "objectLiteralProperty",
            format: null,
        }],

        "@typescript-eslint/consistent-type-assertions": ["error", {
            assertionStyle: "as",
            objectLiteralTypeAssertions: "never",
        }],

        "@typescript-eslint/no-empty-interface": ["error", {
            allowSingleExtends: true,
        }],

        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-invalid-this": "error",
        "@typescript-eslint/no-invalid-void-type": "error",

        "@typescript-eslint/no-misused-promises": ["error", {
            checksVoidReturn: {
                arguments: false,
            },
        }],

        "no-shadow": "off",
        "@typescript-eslint/no-shadow": "error",
        "@typescript-eslint/no-unsafe-argument": "error",
        "@typescript-eslint/no-unsafe-assignment": "error",
        "@typescript-eslint/no-unsafe-call": "error",
        "@typescript-eslint/no-unsafe-return": "error",
        "no-unused-expressions": "off",
        "@typescript-eslint/no-unused-expressions": "error",
        "no-unused-vars": "off",

        "@typescript-eslint/no-unused-vars": ["error", {
            args: "all",
            argsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_"
        }],

        "@typescript-eslint/no-require-imports": "error",
        "@typescript-eslint/prefer-includes": "error",
        "@typescript-eslint/prefer-readonly": "error",
        "no-return-await": "off",
        "@typescript-eslint/return-await": "error",
        "require-await": "off",
        "@typescript-eslint/require-await": "error",
        "@typescript-eslint/unbound-method": "error",
        curly: "error",
        "default-case": "error",
        "eol-last": "error",
        eqeqeq: ["error", "always"],
        "func-call-spacing": ["error", "never"],
        "no-caller": "error",

        "no-constant-condition": ["error", {
            checkLoops: false,
        }],

        "no-eval": "error",
        "no-multiple-empty-lines": "error",

        "no-multi-spaces": ["error", {
            ignoreEOLComments: true,
        }],

        "no-new-wrappers": "error",
        "no-trailing-spaces": "error",

        "no-empty": ["error", {
            allowEmptyCatch: true,
        }],

        "object-shorthand": "error",

        "one-var": ["error", {
            initialized: "never",
            uninitialized: "never",
        }],

        "prefer-arrow-callback": ["error"],

        quotes: ["error", "single", {
            avoidEscape: true,
        }],

        "space-before-function-paren": ["error", {
            anonymous: "always",
            named: "never",
            asyncArrow: "always",
        }],
    },
}, {
    files: ["viewer/**/*.ts"],

    languageOptions: {
        ecmaVersion: 2018,
        sourceType: "script",

        parserOptions: {
            project: "./tsconfig.eslint.viewer.json",
        },
    },

    rules: {
        "@typescript-eslint/naming-convention": ["error", {
            selector: "interface",
            prefix: ["I"],
            format: ["PascalCase"],
        }],

        "@typescript-eslint/no-unnecessary-type-assertion": "off",
        "@typescript-eslint/ban-ts-comment": "off",
    },
}];