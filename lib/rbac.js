'use strict';

const EventEmitter = require('promise-events');

const Provider = require('./provider');
const AttributesManager = require('./attributes-manager');


const RBAC = module.exports = class RBAC extends EventEmitter {

  constructor(attributesManager) {
    if (arguments.length && !(attributesManager instanceof AttributesManager)) {
      throw new TypeError('Invalid attributes manager');
    }

    super();

    this._attributes = attributesManager || this._attributes || new AttributesManager();
    this._providers = this._providers || [];
  }


  /**
  Add a roles, permissions and attributes provider

  @param provider {Provider}   an implementation of the Provider interface
  */
  addProvider(provider) {
    if (!provider || !(provider instanceof Provider)) {
      throw new TypeError('Invalid provider');
    }

    if (this._providers.indexOf(provider) === -1) {
      this._providers.push(provider);
    }
  }


  /**
  Returns the attributes manager

  @return {AttributesManager}
  */
  getAttributesManager() {
    return this._attributes;
  }


  /**
  Check the user for the given permissions. The method will return
  a Promise resolving with a number. If the user has sufficient
  access to the specified permissions, the promise should resolve
  with a positive, non-zero value, or with NaN otherwise. If the
  Promise is rejected, it should be considered as if the user has
  insufficient access to the specified ressources.

  @param user {mixed}
  @param permissions {string|Array<string>}
  @param params {Object} (optional)
  @return Promise<int>
  */
  check(user, permissions, params) {
    var emitter = this;
    var providers;
    var attributes;

    if (!this._providers || !this._providers.length) {
      return Promise.resolve(NaN);
    }

    if (typeof permissions === 'string') {
      permissions = permissions.split(',');
    }

    permissions = permissions.map(function (permission) {
      return (Array.isArray(permission) ? permission : String(permission).split('&&')).map(function (p) {
        return String(p).trim();
      });
    });
    providers = this._providers;
    attributes = this._attributes;

    return getUserRoles(emitter, user, params, providers, attributes).then(function (userRoles) {
      //console.log("*** USER ROLES", userRoles);

      return Promise.all(Object.keys(userRoles).map(function (role) {
        return getRolePermissions(emitter, user, role, providers).then(function (rolePermissions) {
          // get best match...
          return rolePermissions && permissions.reduce(function (priority, permissionGroup) {
            return permissionGroup.every(function (p) { return rolePermissions[p]; }) && userRoles[role] || priority;
          }, NaN) || NaN;
        });
      })).then(function (priorities) {
        return priorities.length && priorities.reduce(function (carry, priority) {
          return !isNaN(priority) ? priority : carry;
        }) || NaN;
      });
    });
  }
}

RBAC.prototype._attributes = null;
RBAC.prototype._providers = null;


/**
Resolve all the roles for the specified user.
The resolved object has the roles for keys and the role depth as values.
All unavailable roles are filtered.
*/
function getUserRoles(emitter, user, params, providers, attributes) {
  return Promise.all(providers.map(function (provider) {
    return Promise.resolve().then(function () {
      return provider.getRoles(user);
    }).catch(function (err) {
      err = err || new Error('Error');
      err.role = '*';
      err.user = user;

      emitter.emit('error', err);
      return {};
    }).then(function (roles) {
      return attributes && filterRolesByAttributes(emitter, user, roles, params, provider, attributes) || roles;
    });
  })).then(function (rolesLists) {

    function _collect(userRoles, roles, depth) {
      if (roles && typeof roles === 'object') {
        Object.keys(roles).forEach(function (role) {
          userRoles[role] = Math.min(userRoles[role] || Infinity, depth);

          _collect(userRoles, roles[role], depth + 1);
        });
      }

      return userRoles;
    }

    // merge all roles keeping best depth
    return rolesLists.reduce(function (userRoles, roles) {
      return _collect(userRoles, roles, 1);
    }, {});
  });
}


/**
Remove any role that are unavailable from the specified attributes.
This function will directly modify the `roles` object.
*/
function filterRolesByAttributes(emitter, user, roles, params, provider, attributes) {
  function _attr(role) {
    return Promise.resolve().then(function () {
      return provider.getAttributes(role);
    });
  }

  function _validate(roles) {
    return Promise.all(Object.keys(roles).map(function (role) {
      return _attr(role).then(function (roleAttributes) {
        return roleAttributes && Promise.all(roleAttributes.map(function (attrName) {
          return Promise.resolve().then(function () {
            return attributes.validate(attrName, user, role, params);
          }).catch(function (err) {
            err = err || new Error('Error');
            err.role = role;
            err.user = user;

            emitter.emit('error', err);
            return false;
          });
        })).then(function (results) {
          if (results.some(function (result) { return !result; })) {
            delete roles[role]; // remove role because attribute not available
          } else if (roles[role] && typeof roles[role] === 'object') {

            return _validate(roles[role]);
          }
        });
      });
    }));
  }

  return _validate(roles).then(function () {
    return roles;
  });
}


/**
Return all the permission for the given role. The returned value is a lookup
table of permissions.
*/
function getRolePermissions(emitter, user, role, providers) {
  return Promise.all(providers.map(function (provider) {
    return Promise.resolve().then(function () {
      return provider.getPermissions(role);
    }).catch(function (err) {
      err = err || new Error('Error');
      err.role = role;
      err.user = user;

      emitter.emit('error', err);
      return null;
    });
  })).then(function (permissionLists) {
    return permissionLists.reduce(function (rolePermissions, permissions) {
      return Array.isArray(permissions) && permissions.reduce(function (rolePermissions, permission) {
        rolePermissions[permission] = true;

        return rolePermissions;
      }, rolePermissions) || rolePermissions;
    }, {});
  });
}