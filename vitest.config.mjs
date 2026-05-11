// Vitest config — runs unit tests in `tests/`.
// Vite plugins are NOT loaded here (no Electron renderer / asset copy needed),
// keeps test boot under 1s.
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.{js,mjs}'],
        environment: 'node',
        globals: false,
        passWithNoTests: true,
    },
});
