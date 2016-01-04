'use strict';

const PERMISSION_SEP_OR = ',';
const PERMISSION_SEP_AND = '&&';

const EventEmitter = require('promise-events');

const Provider = require('./provider');
const AttributesManager = require('./attributes-manager');


const RBAC = module.exports = class RBAC extends EventEmitter {

  constructor(provider, attributesManager) {
    super();

    Object.defineProperties(this, {
      attributes: {
        enumerable: true,
        configurable: false,
        writable: false,
        value: arguments.length >= 2 ? attributesManager : this.attributes || new AttributesManager()
      },
      provider: {
        enumerable: true,
        configurable: false,
        writable: false,
        value: arguments.length >= 1 ? provider : this.provider
      }
    });

    if (!(this.provider instanceof Provider)) {
      throw new TypeError('Invalid or missing provider');
    } else if (!(this.attributes instanceof AttributesManager)) {
      throw new TypeError('Invalid attributes manager');
    }
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
    var provider = this.provider;
    var attributes = this.attributes;

    permissions = preparePermissionList(permissions);

    return getUserRoles(emitter, user, params, provider, attributes).then(function (userRoles) {
      return Promise.all(Object.keys(userRoles).map(function (role) {
        return getRolePermissions(emitter, user, role, userRoles[role], provider);
      })).then(function (rolePermissionsList) {
        var priority = NaN;

        if (rolePermissionsList.length) {
          for (var i = 0, iLen = permissions.length, permissionGroup, groupPriority; i < iLen; ++i) {
            permissionGroup = permissions[i];
            groupPriority = priority;

            for (var j = 0, jLen = permissionGroup.length, permission; j < jLen; ++j) {
              permission = permissionGroup[j];

              for (var k = 0, kLen = rolePermissionsList.length, rolePermissions; k < kLen; ++k) {
                rolePermissions = rolePermissionsList[k];

                if (rolePermissions[permission]) {
                  groupPriority = Math.min(rolePermissions[permission], groupPriority || Infinity);
                }
              }
            }

            if (groupPriority) {
              priority = groupPriority;
            }
          }
        }

        return priority;
      });
    });
  }
}

RBAC.prototype.attributes = null;
RBAC.prototype.provider = null;



/**
Prepare the given permissions list to be used for validation

@param {String|Array} permissions  a list of permissions to allow
*/
function preparePermissionList(permissions) {
  var preparedPermissions = [];
  var preparedGroup;

  if (typeof permissions === 'string') {
    permissions = permissions.split(PERMISSION_SEP_OR);
  } else if (!Array.isArray(permissions)) {
    throw new TypeError('Permissions must be an array or a string');
  }

  for (var i = 0, iLen = permissions.length, group; i < iLen; ++i) {
    group = permissions[i];
    preparedGroup = [];

    if (typeof group === 'string') {
      group = group.split(PERMISSION_SEP_AND);
    } else if (!Array.isArray(group)) {
      throw new TypeError('Permission group must be an array or a string');
    }

    for (var j = 0, jLen = group.length, permission; j < jLen; ++j) {
      permission = group[j];

      if (typeof permission === 'string') {
        permission = permission.trim();
      } else {
        throw new TypeError('Permission group must be an array or a string');
      }

      if (permission) {
        preparedGroup.push(permission);
      }
    }

    if (preparedGroup.length) {
      preparedPermissions.push(preparedGroup);
    }
  }

  if (!preparedPermissions.length) {
    throw new TypeError('Empty permissions');
  }

  return preparedPermissions;
}



/**
Resolve all the roles for the specified user.
The resolved object has the roles for keys and the role depth as values.
All unavailable roles are filtered.
*/
function getUserRoles(emitter, user, params, provider, attributes) {
  return Promise.resolve().then(function () {
    return provider.getRoles(user);
  }).catch(function (err) {
    err = err || new Error('Error');
    err.role = '*';
    err.user = user;

    emitter.emit('error', err);
    return {};
  }).then(function (roles) {
    return filterRolesByAttributes(emitter, user, roles, params, provider, attributes);
  }).then(function (roles) {

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
    return _collect({}, roles, 1);
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
function getRolePermissions(emitter, user, role, priority, provider) {
  return Promise.resolve().then(function () {
    return provider.getPermissions(role);
  }).catch(function (err) {
    err = err || new Error('Error');
    err.role = role;
    err.user = user;

    emitter.emit('error', err);
    return null;
  }).then(function (permissions) {
    var rolePermissions = {};

    if (permissions && Array.isArray(permissions)) {
      for (var j = 0, jLen = permissions.length; j < jLen; ++j) {
        rolePermissions[permissions[j]] = priority;
      }
    }

    return rolePermissions;
  });
}