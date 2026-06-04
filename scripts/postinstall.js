const fs = require('fs');
const path = require('path');

// Target the execution directory (Ghost Root)
const ghostRoot = process.env.INIT_CWD || path.resolve(__dirname, '../../');

console.log(`\n Validating target deployment landscape at: ${ghostRoot}`);

const hasConfig = fs.existsSync(path.join(ghostRoot, 'config.development.json')) || 
                  fs.existsSync(path.join(ghostRoot, 'config.production.json'));
const hasCliMarker = fs.existsSync(path.join(ghostRoot, '.ghost-cli'));

// STRICT ENVIRONMENT GUARD TRIGGER
if (!hasConfig && !hasCliMarker) {
    console.error('\n\x1b[41m\x1b[37m ERROR: GHOST CMS SYSTEM NOT DETECTED \x1b[0m');
    console.error('\x1b[31m%s\x1b[0m', `Installation aborted: "${ghostRoot}" is not a valid Ghost installation directory.`);
    console.error('\x1b[33m%s\x1b[0m', 'Please step inside your Ghost root folder and install this package directly from there.\n');
    process.exit(1); // Forces npm installation pipeline to crash safely
}

console.log('\x1b[32m%s\x1b[0m', 'Ghost ecosystem discovered. Injecting startup adapter pointers...');

// We modify both configs if they exist, or just the one that exists.
const configs = ['config.development.json', 'config.production.json'];

configs.forEach(configName => {
    const configPath = path.join(ghostRoot, configName);
    if (fs.existsSync(configPath)) {
        try {
            console.log(`[ghost-formbuilder] Patching ${configName}...`);
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            // Ensure scheduling hierarchy blocks exist safely
            if (!configData.scheduling) configData.scheduling = {};
            
            configData.scheduling.active = 'ghost-formbuilder';

            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
            console.log(`[ghost-formbuilder] Hijack pointer injected successfully into ${configName}`);
        } catch (err) {
            console.error(`[ghost-formbuilder] Failed to modify ${configName}:`, err);
        }
    }
});

console.log('[ghost-formbuilder] Postinstall complete.');
