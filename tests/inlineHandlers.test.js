import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

// Inline HTML handlers (`onclick="foo()"`) resolve names on `window` only;
// they can't see ES module bindings. #171 Phase 2 retired the
// `window.CloudSaveManager` shim while game.html still called it, so the
// login screen threw "CloudSaveManager is not defined" on every click. This
// static check fails when a handler calls a name nothing assigns to `window`.

const BUILTINS = new Set([
    'if', 'else', 'return', 'event', 'this', 'document', 'window', 'true', 'false',
    'null', 'undefined', 'new', 'typeof', 'Math', 'JSON', 'console', 'location',
    'history', 'setTimeout', 'parseInt', 'parseFloat', 'Number', 'String',
]);

const ls = (spec) => execSync(`git ls-files ${spec}`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const rendererJs = ls("'*.js' ':!server/**' ':!tests/**'").map(f => fs.readFileSync(f, 'utf8')).join('\n');

function unresolvedHandlerNames(htmlFile) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    // Classic <script> blocks in the page can define globals too.
    const pageScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
    const missing = [];
    for (const m of html.matchAll(/\son[a-z]+="([^"]*)"/g)) {
        const code = m[1].replace(/'[^']*'/g, "''");
        // Leading identifiers that are called or dereferenced: `foo(` / `Foo.`
        for (const [, name] of code.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*(?=[.(])/g)) {
            if (BUILTINS.has(name)) continue;
            const onWindow = new RegExp(`(window|globalThis)\\.${name}\\s*=`);
            const inPage   = new RegExp(`function\\s+${name}\\b|(var|let|const)\\s+${name}\\b`);
            if (!onWindow.test(rendererJs) && !onWindow.test(pageScripts) && !inPage.test(pageScripts)) {
                const line = html.slice(0, m.index).split('\n').length;
                missing.push(`${htmlFile}:${line} ${name}`);
            }
        }
    }
    return missing;
}

describe('inline HTML handlers', () => {
    it.each(ls("'*.html'"))('%s only calls names assigned to window', (file) => {
        expect(unresolvedHandlerNames(file)).toEqual([]);
    });
});
