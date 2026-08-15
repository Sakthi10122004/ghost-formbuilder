#!/usr/bin/env node
const path = require('path');
const fs   = require('fs');

console.log('\n[-] ghost-formbuilder: Running cleanup script before uninstall...\n');

// Robustly find Ghost root by climbing up the tree from where the script is executed
let ghostRoot = null;
let currentDir = process.env.INIT_CWD || process.cwd();

for (let i = 0; i < 5; i++) {
  if (fs.existsSync(path.join(currentDir, '.ghost-cli')) || 
      fs.existsSync(path.join(currentDir, 'config.development.json')) ||
      fs.existsSync(path.join(currentDir, 'config.production.json'))) {
    ghostRoot = currentDir;
    break;
  }
  currentDir = path.resolve(currentDir, '..');
}

if (!ghostRoot) {
  const nodeModulesParent = path.resolve(__dirname, '../../../');
  if (fs.existsSync(path.join(nodeModulesParent, '.ghost-cli'))) {
    ghostRoot = nodeModulesParent;
  }
}

if (!ghostRoot) {
  console.log('\x1b[33m%s\x1b[0m', '[-] Could not find Ghost root directory. Skipping config cleanup.');
  process.exit(0);
}

// Get our own package name dynamically
const myPkgPath = path.join(__dirname, '../package.json');
let myPkgName = 'ghost-formbuilder';
if (fs.existsSync(myPkgPath)) {
  try {
    myPkgName = JSON.parse(fs.readFileSync(myPkgPath, 'utf8')).name;
  } catch(e) {}
}

let configModified = false;

// Attempt to clean both dev and prod configs if they exist
['config.development.json', 'config.production.json'].forEach(configFile => {
    const filePath = path.join(ghostRoot, configFile);
    if (fs.existsSync(filePath)) {
        let conf = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Remove the scheduling block if it belongs to our plugin
        if (conf.scheduling && conf.scheduling.active === myPkgName) {
            delete conf.scheduling;
            fs.writeFileSync(filePath, JSON.stringify(conf, null, 2));
            console.log('\x1b[32m%s\x1b[0m', `[-] Successfully removed ${myPkgName} scheduling adapter from ${configFile}`);
            configModified = true;
        }
    }
});

if (configModified) {
    console.log('\n\x1b[32m%s\x1b[0m', 'Plugin config cleaned!');
    console.log('');
}

function triggerRestart(ghostRoot) {
    const cp = require('child_process');
    if (fs.existsSync(path.join(ghostRoot, '.ghost-cli'))) {
        console.log('[-] Triggering local Ghost CLI restart...');
        try {
            cp.execSync('ghost restart', { cwd: ghostRoot, stdio: 'inherit' });
            console.log('[-] Local ghost restart completed.');
            return;
        } catch (e) {
            console.warn('[!] Ghost restart failed:', e.message);
        }
    }
    const contentDataPath = path.join(ghostRoot, 'content', 'data');
    if (fs.existsSync(contentDataPath)) {
        const triggerFile = path.join(contentDataPath, '.reload-trigger');
        fs.writeFileSync(triggerFile, Date.now().toString());
        console.log('[-] Triggered supervisor hot-reload to complete teardown');
    }
}

triggerRestart(ghostRoot);
console.log('[-] ghost-formbuilder: Teardown complete.\n');
