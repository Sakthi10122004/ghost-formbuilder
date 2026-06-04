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

function FormBuilderAdapter(options) {
    SchedulingBase.call(this);
    this.options = options || {};
    this._initFormBuilder();
}

// Inherit from SchedulingBase
Object.setPrototypeOf(FormBuilderAdapter.prototype, SchedulingBase.prototype);
Object.setPrototypeOf(FormBuilderAdapter, SchedulingBase);

FormBuilderAdapter.prototype._initFormBuilder = async function() {
    try {
        console.log('[FormBuilder] Extracting database configuration...');
        await formStorage.init();
        
        console.log('[FormBuilder] Booting Hijack Engine...');
        adapter.init();
        
        console.log('\n==================================================');
        console.log('FormBuilder Engine successfully attached to Ghost.');
        console.log('==================================================\n');
    } catch (err) {
        console.error('[FormBuilder] Failed to initialize:', err);
    }
};

FormBuilderAdapter.prototype.schedule = function(object) {};
FormBuilderAdapter.prototype.unschedule = function(object) {};
FormBuilderAdapter.prototype.run = function() {};

module.exports = FormBuilderAdapter;
