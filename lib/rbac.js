'use strict';

const EventEmitter = require('promise-events');

const Provider = require('./provider');
const AttributesManager = require('./attributes-manager');


const RBAC = module.exports = class RBAC extends EventEmitter {

  constructor(attributesManager) {
    if (attributesManager && !(attributesManager instanceof AttributesManager)) {
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
    if (provider && !(provider instanceof Provider)) {
      throw new TypeError('Invalid provider name');
    }

    this._providers.push(provider);
  }


  /**
  Set an attribute. See AttributesManager for more information.

  @param attribute {function}
  @return {boolean}
  */
  setAttribute(attribute) {
    return this._attributes.set(attribute);
  }


  /**
  Check the user for the given permissions. The method will return
  a Promise resolving with a positive, non-zero, integer if the user
  has sufficient access to the specified permissions, or be resolve
  with a falsy value otherwise. If the Promise is rejected otherwise,
  it should be considered as if resolved with false.

  @param user {mixed}
  @param permissions {string|Array<string>}
  @param params {Object} (optional)
  @return Promise<int>
  */
  check(user, permissions, params) {
    var providers;
    var attributes;

    if (!this._providers && !this._providers.length) {
      return Promise.reject();
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

    Promise.all(providers.map(function (provider) {
      return provider.getRoles(user).catch(function () {
        return [];
      }).then(function (roles) {
        return attributes && Promise.all(Object.keys(roles).map(function (role) {
          return Promise.resolve(provider.getAttributes(role)).then(function (roleAttributes) {
            return Promise.all(roleAttributes.map(function (attrName) {
              return attributes.validate(attrName, user, role, params).catch(function () {
                return false;
              });
            })).then(function (results) {
              if (!results.some(function (result) { return !result; })) {
                delete roles[role]; // remove role because attribute not available
              }

              return roles;
            });
          });
        })) || roles;
      });
    })).then(function (roleLists) {
      // merge all roles keeping best depth
      var userRoles = roleLists.reduce(function (userRoles, roles) {
        Object.keys(roles).forEach(function (role) {
          userRoles[role] = Math.min(roles[role], userRoles[role] || Infinity);
        });

        return userRoles;
      }, {});
      
      return Promise.all(Object.keys(userRoles).map(function (role) {
        return Promise.all(providers.map(function (provider) {
          return provider.getPermissions(role);
        })).then(function (permissionLists) {
          var userPermissions = permissionLists.reduce(function (userPermissions, permissionList) {
            return permissionList.reduce(function (userPermissions, p) {
              userPermissions[p] = true;

              return userPermissions;
            }, userPermissions);
          }, {});

          // get best match...
          return permissions.some(function (permissionGroup) {
            return permissionGroup.every(function (p) { return userPermissions[p]; });
          }) && userRoles[role] || Infinity;
        });
      }));
    }).then(function (priorities) {
      return Math.min.apply(null, priorities);
    });
  }
}

RBAC.prototype._attributes = null;
RBAC.prototype._providers = null;