module.exports = require('./lib/rbac');
module.exports.RBAC = module.exports;
module.exports.Provider = require('./lib/provider');
module.exports.AttributesManager = require('./lib/attributes-manager');

// providers
module.exports.providers = {
  JsonProvider: require('./lib/providers/json')
};

// utilities
module.exports.util = {
  collect: require('./lib/util/collect')
};
