import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import json from "@eslint/json";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        plugins: { js },
        extends: ["js/recommended"],
        languageOptions: { globals: globals.node },
    },
    tseslint.configs.recommended,
    {
        files: ["**/*.json"],
        plugins: { json },
        language: "json/json",
        extends: ["json/recommended"],
    },
    {
        extends: [eslintPluginPrettierRecommended],
        rules: {
            "prettier/prettier": [
                "error",
                {
                    tabWidth: 4,
                    useTabs: false,
                },
            ],
        },
    },
]);
