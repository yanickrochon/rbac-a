'use strict';

var co = require('co');

/**
Utility function for providers which accepts an array of roles
and a function that maps a role to an array of roles it inherits
and outputs a role tree that can be returned from getRoles.

Ex: {
      "role1": {
        "role1.1": null,
        "role1.2": { ... },
        ...
      },
      "secondary": ...,
      ...
    }

@param roles {mixed}
@param getInheritedRoles {function}
@return {Object<string,number>}
*/
module.exports = function(roles, getInheritedRoles) {
  const cache = {};

  const collect = co.wrap(function *(roles, userRoles, depth) {
    for (let i = 0, iLen = roles.length; i < iLen; ++i) {
      cache[roles[i]] = cache[roles[i]] || depth;
    }

    for (let i = 0, iLen = roles.length; i < iLen; ++i) {
      if (cache[roles[i]] >= depth) {
        let inheritedRoles = yield Promise.resolve(getInheritedRoles(roles[i]));

        if (Array.isArray(inheritedRoles)) {
          userRoles[roles[i]] = yield collect(inheritedRoles, {}, depth + 1);
        } else {
          userRoles[roles[i]] = null;
        }
      }
    }

    return userRoles;
  });

  return collect(roles, {}, 1);
};
