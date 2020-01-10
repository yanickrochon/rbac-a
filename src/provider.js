/**
Provider interface.

This class provides roles, permissions and attributes to check and
validate user access.

Usage

  let user = 123;
  let roles = provider.getRoles(user);
  let permissions = provider.getPermissions(roles[i]);
  let attributes = provider.getAttributes(roles[i]);

Note : methods may return a Promise

Extend concrete providers and implement the declared methods.
*/
class Provider {

  /**
  Return all the roles available for the given user. The return value
  must be an object, recursively defining the associated roles for the
  specified user. Return an empty object if user has no roles.

  Ex: {
        "role1": {
          "role1.1": null,
          "role1.2": { ... },
          ...
        },
        "secondary": ...,
        ...
      }
  
  The method mey return a promise resolving with the
  expected return value.

  @param use {any}
  @return {Object<string,Object>|Promise<Object>}
  */
  getRoles(user) {
    throw new Error('Not implemented');
  }

  /**
  Return all permissions for the specified role. The return value
  must be an array. Return an empty array if role is missing or
  no permission for the specified role.

  Ex: ['permission1', 'permission2', ... ]

  The method mey return a promise resolving with the
  expected return value.

  @param role {any}
  @return {Array<string>|Promise<Array>}
  */
  getPermissions(role) {
    throw new Error('Not implemented');
  }

  /**
  Return all attributes for the specified role. The return value must
  be an array. Return an empty array if role is missing or if no
  attributes for the specified role.

  Ex: ['attribute1', 'attribute2', ... ]

  The method mey return a promise resolving with the
  expected return value.

  @param role {any}
  @return {Array<string>|Promise<Array>}
  */
  getAttributes(role) {
    throw new Error('Not implemented');
  }

}


module.exports = Provider;