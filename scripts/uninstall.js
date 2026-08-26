const fs = require('fs');
const path = require('path');

console.log('\n[+] ghost-formbuilder: Running safe teardown...\n');

let ghostRoot = null;
let currentDir = process.env.INIT_CWD || process.cwd();
for (let i = 0; i < 5; i++) {
  if (fs.existsSync(path.join(currentDir, 'config.production.json')) || 
      fs.existsSync(path.join(currentDir, 'config.development.json'))) {
    ghostRoot = currentDir;
    break;
  }
  currentDir = path.resolve(currentDir, '..');
}

if (!ghostRoot) {
  console.log('[ghost-formbuilder] Could not locate Ghost root. Assuming manual cleanup is required.');
  process.exit(0);
}

const cooperativePlugins = ['@sakthi10122004/mailconfig', 'mailconfig'];

['config.development.json', 'config.production.json'].forEach(configFile => {
    const configPath = path.join(ghostRoot, configFile);
    if (fs.existsSync(configPath)) {
        try {
            let configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (configData.scheduling && configData.scheduling.active === 'ghost-formbuilder') {
                // Find fallback plugin
                let fallback = null;
                const pkgPath = path.join(ghostRoot, 'package.json');
                if (fs.existsSync(pkgPath)) {
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                    const deps = Object.keys(pkg.dependencies || {});
                    fallback = deps.find(d => cooperativePlugins.includes(d));
                }

                if (fallback) {
                    configData.scheduling.active = fallback;
                    console.log(`[ghost-formbuilder] Safely transferred scheduling pointer to ${fallback}`);
                } else {
                    delete configData.scheduling;
                    console.log('[ghost-formbuilder] Safely removed scheduling block');
                }
                
                fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
            }
        } catch (err) {
            console.error(`[ghost-formbuilder] Error parsing ${configFile}:`, err.message);
        }
    }
});

function triggerRestart(ghostRoot) {
    const cp = require('child_process');
    if (fs.existsSync(path.join(ghostRoot, '.ghost-cli'))) {
        console.log('[+] Triggering local Ghost CLI restart...');
        try {
            const isWindows = process.platform === 'win32';
            const child = cp.spawn('ghost', ['restart'], { cwd: ghostRoot, detached: true, stdio: 'ignore', shell: isWindows });
            child.on('error', () => {
                console.log('[+] Note: Could not auto-restart Ghost automatically (run `ghost restart` manually if needed).');
            });
            child.unref();
            console.log('[+] Local ghost restart initiated in background.');
            return;
        } catch (e) { }
    }
    const contentDataPath = path.join(ghostRoot, 'content', 'data');
    if (fs.existsSync(contentDataPath)) {
        const triggerFile = path.join(contentDataPath, '.reload-trigger');
        fs.writeFileSync(triggerFile, Date.now().toString());
        console.log('[+] ghost-formbuilder: Triggered supervisor hot-reload to complete teardown');
    }
}
triggerRestart(ghostRoot);

console.log('[+] ghost-formbuilder: Teardown complete.\n');
