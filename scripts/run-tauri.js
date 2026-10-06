#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

const env = { ...process.env };
if (!env.CARGO_TARGET_DIR) {
  env.CARGO_TARGET_DIR = path.join(os.homedir(), '.cache', 'tauri-build-target');
}

const tauriCli = path.resolve('node_modules', '@tauri-apps/cli', 'tauri.js');
const child = spawn(process.execPath, [tauriCli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
