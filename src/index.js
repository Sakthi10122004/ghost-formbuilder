const { getGhostPath } = require('./utils');
const formStorage = require('./formStorage');
const adapter = require('./adapter');

console.log('[ghost-formbuilder] Loaded into memory via scheduling adapter hijack.');

let SchedulingBase;
try {
    const schedulingBasePath = getGhostPath('core/server/adapters/scheduling/scheduling-base');
    if (schedulingBasePath) {
        SchedulingBase = require(schedulingBasePath);
    }
} catch (e) {}

// If we couldn't find SchedulingBase, create a compatible shim
if (!SchedulingBase) {
    SchedulingBase = function() {
        Object.defineProperty(this, 'requiredFns', {
            value: ['schedule', 'unschedule', 'run'],
            writable: false
        });
    };
}

function bootCooperativePlugins(options) {
    try {
        const fs = require('fs');
        const path = require('path');
        const pkgPath = path.join(process.cwd(), 'package.json');
        if (!fs.existsSync(pkgPath)) return;
        
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = Object.keys(pkg.dependencies || {});
        
        global.__bootedGhostPlugins = global.__bootedGhostPlugins || {};
        
        deps.forEach(dep => {
            const isPlugin = dep.startsWith('ghost-') || dep.includes('mailconfig') || dep.startsWith('@sakthi10122004/');
            if (isPlugin && !global.__bootedGhostPlugins[dep]) {
                global.__bootedGhostPlugins[dep] = true;
                try {
                    console.log(`[Cooperative Boot] Loading plugin: ${dep}`);
                    const PluginModule = require(path.join(process.cwd(), 'node_modules', dep));
                    
                    if (typeof PluginModule === 'function') {
                        new PluginModule(options);
                    } else if (PluginModule && typeof PluginModule.init === 'function') {
                        PluginModule.init(options);
                    }
                } catch (err) {
                    console.error(`[Cooperative Boot] Failed to boot plugin ${dep}:`, err.message);
                }
            }
        });
    } catch (e) {
        console.error('[Cooperative Boot] Error during discovery:', e.message);
    }
}

function FormBuilderAdapter(options) {
    SchedulingBase.call(this);
    
    // Register ourselves first to prevent cyclic loading
    global.__bootedGhostPlugins = global.__bootedGhostPlugins || {};
    global.__bootedGhostPlugins['ghost-formbuilder'] = true;
    
    // Scan and load other installed plugins cooperatively
    bootCooperativePlugins(options);

    this.options = options || {};
    
    // Initialize Routing & HTTP Hijack immediately and synchronously
    try {
        console.log('[FormBuilder] Booting Hijack Engine synchronously...');
        adapter.init();
    } catch (err) {
        console.error('[FormBuilder] Failed to initialize Hijack Engine:', err);
    }
    
    // Bootstrap database tables asynchronously
    this._initFormBuilder();
}

// Inherit from SchedulingBase
Object.setPrototypeOf(FormBuilderAdapter.prototype, SchedulingBase.prototype);
Object.setPrototypeOf(FormBuilderAdapter, SchedulingBase);

FormBuilderAdapter.prototype._initFormBuilder = async function() {
    try {
        console.log('[FormBuilder] Extracting database configuration...');
        await formStorage.init();
        
        console.log('\n==================================================');
        console.log('FormBuilder Engine successfully attached to Ghost.');
        console.log('==================================================\n');
    } catch (err) {
        console.error('[FormBuilder] Failed to initialize database:', err);
    }
};

FormBuilderAdapter.prototype.schedule = function(object) {};
FormBuilderAdapter.prototype.unschedule = function(object) {};
FormBuilderAdapter.prototype.run = function() {};
FormBuilderAdapter.prototype.register = function(object) {};

module.exports = FormBuilderAdapter;
