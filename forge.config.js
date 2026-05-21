const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { execSync } = require('node:child_process');

// Files/dirs the packaged app actually needs at runtime. Everything else
// (raw source, tests, build configs, vite config, out/, .git, etc.) is
// excluded so the asar can't fall back to loading unbundled modules with
// runtime `import.meta.glob` calls that Vite never transformed.
const PACKAGE_INCLUDE = [
  'dist',
  'index.js',
  'package.json',
  'icon.png',
  'images/icons',
  'node_modules',
];

module.exports = {
  hooks: {
    // Always run `vite build` before packaging so dist/ is fresh and present.
    // Without this, electron-forge happily packages a stale or missing dist/,
    // and index.js's old fallback would silently load raw source modules.
    generateAssets: async () => {
      console.log('[forge] Running vite build before package...');
      execSync('npm run build', { stdio: 'inherit' });
    },
  },
  packagerConfig: {
    asar: true,
    icon: process.platform === 'win32' ? 'images/icons/win/icon'
      : process.platform === 'darwin' ? 'images/icons/mac/icon'
        : 'images/icons/png/256x256',
    executableName: '5FreundeArena',
    // Whitelist: keep only paths that start with one of PACKAGE_INCLUDE.
    // electron-packager's `ignore` is called for every path; return true to drop.
    ignore: (filePath) => {
      if (filePath === '') return false; // root
      // filePath looks like '/dist', '/dist/game.html', '/node_modules/foo', '/index.js'.
      const rel = filePath.replace(/^\//, '');
      for (const allow of PACKAGE_INCLUDE) {
        if (rel === allow) return false;
        if (rel.startsWith(allow + '/')) return false;
        // Allow ancestor dirs of allowed paths (e.g. 'images' must traverse to reach 'images/icons').
        if (allow.startsWith(rel + '/')) return false;
      }
      return true;
    },
    afterCopy: [(buildPath, _electronVersion, platform, _arch, done) => {
      const { writeFileSync, chmodSync } = require('fs');
      const { join } = require('path');
      try {
        if (platform === 'win32') {
          writeFileSync(
            join(buildPath, 'MapEditor.bat'),
            '@echo off\r\nstart "" "%~dp05FreundeArena.exe" --map-editor\r\n'
          );
        } else {
          const sh = join(buildPath, 'MapEditor.sh');
          writeFileSync(sh, '#!/bin/sh\n"$(dirname "$0")/5FreundeArena" --map-editor &\n');
          chmodSync(sh, '755');
        }
      } catch (e) {
        console.warn('[forge] Failed to write MapEditor launcher:', e.message);
      }
      done();
    }],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: '5_freunde_arena',
        setupExe: '5FreundeArena-Setup.exe',
        shortcutName: '5 Freunde: Elemental Arena',
        setupIcon: 'images/icons/win/icon.ico',
        loadingGif: 'images/installer/loading.gif',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
    },
    /* 
    // RPM and DEB makers often fail on macOS without specific tools installed.
    // Since we only need the ZIP for Steam Deck, we can disable these.
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    }, 
    */
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
