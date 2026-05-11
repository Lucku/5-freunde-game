// ESLint 9+ flat config for 5 Freunde.
//
// This is a working game codebase, not a greenfield project — every rule is
// `warn`, never `error`, so lint never blocks. CI fails only on syntax errors
// from the parser itself. Pre-existing patterns (globals, `var`, `==`) are
// flagged but don't break the build.
//
// Custom local rule `no-foreach-splice` lives in eslint-plugin-5freunde/.
// It catches the `forEach(... arr.splice(i) ...)` index-skip bug class that
// already hit ~11 hot loops in game.js (see CHANGELOG: 2026-05-10 audit pass).

import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import freundePlugin from './eslint-plugin-5freunde/index.mjs';

export default [
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'out/**',
            '.vite/**',
            // Generated / vendor / large data
            'package-lock.json',
            'audio/**',
            'images/**',
            'server/data/**',
        ],
    },
    js.configs.recommended,
    prettierConfig,
    {
        // Renderer / browser game code — has window, document, canvas globals.
        files: ['**/*.js', '**/*.mjs'],
        ignores: ['server/**', 'scripts/**'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                // Browser
                window: 'readonly', document: 'readonly', navigator: 'readonly',
                console: 'readonly', performance: 'readonly', crypto: 'readonly',
                fetch: 'readonly', alert: 'readonly', setTimeout: 'readonly',
                clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
                requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly',
                btoa: 'readonly', atob: 'readonly', WebSocket: 'readonly',
                localStorage: 'readonly', sessionStorage: 'readonly',
                FileReader: 'readonly', Blob: 'readonly', URL: 'readonly',
                Audio: 'readonly', Image: 'readonly', TextEncoder: 'readonly',
                CompressionStream: 'readonly', DecompressionStream: 'readonly',
                FormData: 'readonly', AbortController: 'readonly',
                // Electron renderer with nodeIntegration: true
                process: 'readonly', require: 'readonly', module: 'writable',
                global: 'readonly', __dirname: 'readonly', __filename: 'readonly',
                Buffer: 'readonly',
                // App-level singletons (every file's load order assumes these exist)
                canvas: 'readonly', ctx: 'readonly',
                player: 'writable', player2: 'writable',
                enemies: 'writable', projectiles: 'writable',
                wave: 'writable', score: 'writable', frame: 'writable',
                arena: 'writable', saveData: 'writable', gameConfig: 'writable',
                audioManager: 'readonly', networkManager: 'readonly',
                dlcManager: 'readonly', uiManager: 'readonly',
            },
        },
        plugins: {
            '5freunde': freundePlugin,
        },
        rules: {
            // Warnings only — never errors. See header comment.
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-undef': 'off',                // too many globals to enumerate
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-prototype-builtins': 'off',   // saveData.hasOwnProperty is widespread
            'no-cond-assign': 'off',
            'no-inner-declarations': 'off',
            'no-redeclare': 'off',
            'no-control-regex': 'off',
            'no-fallthrough': 'off',
            'no-constant-condition': ['warn', { checkLoops: false }],
            'no-useless-escape': 'off',
            'no-self-assign': 'off',
            'no-async-promise-executor': 'off',
            'no-irregular-whitespace': 'off',
            'no-var': 'warn',
            'prefer-const': 'warn',
            eqeqeq: ['warn', 'always', { null: 'ignore' }],
            'no-debugger': 'warn',
            // Custom rule — catches the forEach+splice index-skip bug class.
            '5freunde/no-foreach-splice': 'warn',
        },
    },
    {
        // Node / server code — no DOM, but has require + process.
        files: ['server/**/*.js', 'scripts/**/*.js', 'index.js', 'forge.config.js', 'test-arena.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'commonjs',
            globals: {
                process: 'readonly', require: 'readonly', module: 'writable',
                exports: 'writable', global: 'readonly', Buffer: 'readonly',
                __dirname: 'readonly', __filename: 'readonly',
                setTimeout: 'readonly', clearTimeout: 'readonly',
                setInterval: 'readonly', clearInterval: 'readonly',
                console: 'readonly', URL: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-undef': 'warn',
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-prototype-builtins': 'off',
            'no-redeclare': 'off',
            'no-var': 'warn',
            'prefer-const': 'warn',
            eqeqeq: ['warn', 'always', { null: 'ignore' }],
        },
    },
    {
        // Build / tooling configs in ESM form (.mjs).
        files: ['vite.config.mjs', 'build.mjs', 'eslint.config.mjs', 'eslint-plugin-5freunde/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                process: 'readonly', require: 'readonly', console: 'readonly',
                __dirname: 'readonly', __filename: 'readonly', Buffer: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-undef': 'warn',
        },
    },
    {
        // Vitest test files
        files: ['tests/**/*.js', 'tests/**/*.mjs', '**/*.test.js', '**/*.test.mjs'],
        languageOptions: {
            globals: {
                describe: 'readonly', it: 'readonly', test: 'readonly',
                expect: 'readonly', beforeAll: 'readonly', afterAll: 'readonly',
                beforeEach: 'readonly', afterEach: 'readonly', vi: 'readonly',
            },
        },
    },
];
