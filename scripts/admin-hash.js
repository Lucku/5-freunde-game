#!/usr/bin/env node
/**
 * admin-hash — print a bcrypt hash of the given admin password.
 *
 * Usage:
 *   node scripts/admin-hash.js <password>
 *
 * Then copy the printed line into `server/.env`:
 *   ADMIN_PASSWORD_HASH=$2b$10$…
 *
 * The script loads bcrypt from `server/node_modules` so the root project
 * does not need to ship the binary dependency.
 */
'use strict';

const path = require('path');
let bcrypt;
try {
    bcrypt = require(path.join(__dirname, '..', 'server', 'node_modules', 'bcrypt'));
} catch {
    try { bcrypt = require('bcrypt'); }
    catch (e) {
        console.error('[admin-hash] bcrypt module not found.');
        console.error('[admin-hash] Run `npm install` inside the `server/` directory first.');
        process.exit(1);
    }
}

const password = process.argv[2];
if (!password) {
    console.error('Usage: node scripts/admin-hash.js <password>');
    process.exit(1);
}
if (password.length < 8) {
    console.error('[admin-hash] Refusing to hash a password shorter than 8 characters.');
    process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
    process.stdout.write(`ADMIN_PASSWORD_HASH=${hash}\n`);
}).catch(err => {
    console.error('[admin-hash] hash failed:', err);
    process.exit(1);
});
