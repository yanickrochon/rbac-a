# RBAC-A

[![Build Status](https://travis-ci.org/yanickrochon/rbac-a.svg?branch=next)](https://travis-ci.org/yanickrochon/rbac-a)
[![Coverage Status](https://coveralls.io/repos/yanickrochon/rbac-a/badge.svg?branch=master)](https://coveralls.io/r/yanickrochon/rbac-a?branch=master)

[![NPM](https://nodei.co/npm/rbac-a.png?compact=true)](https://nodei.co/npm/rbac-a/)

Role Based Access Control with Attributes and dynamic plugin roles implementation. This module follows the [NIST RBAC model](http://en.wikipedia.org/wiki/NIST_RBAC_model) and offer a flexible solution to allow or restrict user operations.


## Breaking change between 0.x and 1.x

*TODO*


## Introduction

In an RBAC system, permissions are assigned to roles, not users. Therefore, roles act as a ternary relation between permissions and users. Permissions are static, defined in the applications. Roles, on the other hand, are dynamic and can be defined from an application interface (API), or user interface (UI), and saved in a datastore.

This module is not dependent on an authentication, a user session, or a datastore system. The relation between the user and it's roles are specified by a `Provider`. It is the application's responsibility to implement such provider. See [providers](#providers) for more information.

Rules are applied in consideration with the roles hierarchy. Top level roles always have priority over inherited roles. When validating users against given permissions, the best role priority matching the permissions is returned. Therefore, "allowed" users will always resolve with a positive integer, and "restricted" users will always resolve with a non-numeric value (i.e. `NaN`). See [usage](#usage) for more information, or [how to restrict users](#applications) with this module.


## Usage

```javascript
import RBAC from 'rbac-a';



const rbac = new RBAC({
  provider: new RBAC.providers.JsonProvider()  // mandatory
  //attributes: new RBAC.AttributesManager()   // optional
});

rbac.on('error', err => {
  console.error('Error while checking $s/%s', err.role, err.user);
  console.error(err.stack);
});


// check permission
const canCreated = await rbac.check(user, 'create');

if (canCreated) {
  console.log('User can create!');
} else {
  console.log('User cannot create.');
  console.info('Please contact your system admin for more information');
}

// specify attributes arguments
const canEdit = await rbac.check(user, 'edit', { timestamp: Date.now() });

if (canEdit) {
  console.log('User can edit at this time!');
} else {
  console.log('User cannot edit at this time.');
  console.info('Please contact your system admin for more information');
}
```

The method `rbac.check` will resolve with a numeric value, positive if the specified user is granted the specified permissions, or `0` otherwise.

If for ever reason the validation should fail, either at the provider level, or during an attribute validation, then the method will return `0`.


## Definitions


### Users

When invoking `rbac.check`, the argument `user` is an arbitrary value that is only checked within the specified providers. For this reason, the value should normally be numeric or string, however it may very well be an
`Object`. Whatever the value, it should be considered immutable at all times.


### Roles

A role is an organizational unit defining a group of permissions assignable to users. Roles consitute de bridge between actual permissions and users. Roles are hierarchichal, meaning that they may have a child to parent relationship.


### Attributes

If roles validation is static, attribute validation is dynamic; an attribute is always validated through a user-defined function.

For exemple, two users may have the same roles, therefore the same permissions, however both may possess different attributes which would dynamically grant or deny them certain rights conditionally. Another example would be an attribute that would dynamically check the user's device and grand extra permissions depending on the device currently in use.


## Data relations

```
        +--------+ 1.             n. +--------+ 1.         n. +--------------+
        |  User  |--------+--------->|  Role  |-------------->|  Permission  |
        +--------+        |          +--------+               +--------------+
                          |            1.|
                          |              | 1.
                          |      n. +------------+ 1.      n. +-------------+
                          +-------->|  UserRole  |----------->|  Attribute  |
                                    +------------+            +-------------+
```

## API

### RBAC

```js

class RBAC {

  /**
   * Create a new instance of RBAC
   * 
   * @param {P extends Provider} provider      will provide methods to return roles, permission and attributes
   * @param {Map<String,Function>} attributes  a object mapping attributes to a validation function
   */
  constructor({ provider, attributes })

  /**
   * Validate the given user
   * 
   * @param {Any} user                    a value representing the user to check
   * @param {String} permissions          some permissions to check
   * @param {Object} options              options passed to the provider and attributes when validating
   * @return {Promise<Number>}            resolve to a numeric value representing the highest access level
   *                                      for the given permissions
   */
  async check(user, permissions, options)
}


interface Provider {
  /**
   * Retrive all the roles associated with the specified user
   * 
   * @param {Any} user                  a value representing the user to check
   * @param {Object} options            the options passed to the RBAC.check method
   * @return {Promise<Array<UserRole>>}
   */
  async getUserRoles(user, options)

  /**
   * Retrive all permissions associated with the given roles. The returned
   * value will be an object mapping the role names with a list of associated
   * permissions.
   * 
   * @param {Array<String>} roles                  the list of roles
   * @return {Promise<Map<String,Array<String>>>}  a Preomise resolving to a map of permissions
   */
  async getPermissions(roles, options)
}


interface UserRole {
  /**
   * The role name
   * @type {String}
   **/
  role

  /**
   * A list of child roles
   * @type {Array<String>}
   */
  inheritedRoles

  /**
   * The list of attributes associated with the role
   * @type {Array<String>}
   */
  attributes
}

```


### Checking permissions

```js

const canCreateOrEdit = await rback.check(user, 'create | edit');




```


## Contribution

All contributions welcome! Every PR **must** be accompanied by their associated unit tests!


## License

The MIT License (MIT)

Copyright (c) 2015 Mind2Soft <yanick.rochon@mind2soft.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
