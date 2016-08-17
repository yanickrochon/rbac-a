# RBAC-A

[![Build Status](https://travis-ci.org/yanickrochon/rbac-a.svg)](https://travis-ci.org/yanickrochon/rbac-a)
[![Coverage Status](https://coveralls.io/repos/yanickrochon/rbac-a/badge.svg?branch=master)](https://coveralls.io/r/yanickrochon/rbac-a?branch=master)

[![NPM](https://nodei.co/npm/rbac-a.png?compact=true)](https://nodei.co/npm/rbac-a/)

Role Based Access Control with Attributes and dynamic plugin roles implementation. This module follows the [NIST RBAC model](http://en.wikipedia.org/wiki/NIST_RBAC_model) and offer a flexible solution to allow or restrict user operations.


## Install

```
npm i rbac-a --save
```


## Introduction

In an RBAC system, permissions are assigned to roles, not users. Therefore, roles act as a ternary relation between permissions and users. Permissions are static, defined in the applications. Roles, on the other hand, are dynamic and can be defined from an application interface (API), or user interface (UI), and saved in a datastore.

This module is not dependent on an authentication, a user session, or a datastore system. The relation between the user and it's roles are specified by a `Provider`. It is the application's responsibility to implement such provider. See [providers](#providers) for more information.

Rules are applied in consideration with the roles hierarchy. Top level roles always have priority over inherited roles. When validating users against given permissions, the best role priority matching the permissions is returned. Therefore, "allowed" users will always resolve with a positive integer, and "restricted" users will always resolve with a non-numeric value (i.e. `NaN`). See [usage](#usage) for more information, or [how to restrict users](#applications) with this module.


## Usage

```javascript
const RBAC = require('rbac-a');
const CustomProvider = createProvider(); // extends Provider

var rbac = new RBAC({
  provider: new CustomProvider()
});


rbac.on('error', function (err) {
  console.error('Error while checking $s/%s', err.role, err.user);
  console.error(err.stack);
})

rbac.check(user, 'create').then(function (allowed) {
  if (allowed) {
    console.log('User can create!');
  } else {
    console.log('User cannot create.');
    console.info('Please contact your system admin for more information');
  }
}).catch(function (err) {
  console.error(err && err.stack || err || 'ERROR');
});

// specify attributes arguments
rbac.check(user, 'edit', { time: Date.now() }).then(function (allowed) {
  if (allowed) {
    console.log('User can edit!');
  } else {
    console.log('User cannot edit.');
    console.info('Please contact your system admin for more information');
  }
}).catch(function (err) {
  console.error(err && err.stack || err || 'ERROR');
});
```

The method `rbac.check` will resolve with a numeric, non-zero, positive, integer value if the specified user is granted the specified permissions, or `NaN` otherwise.

If, for ever reason, the method should fail (i.e. the promise is rejected), then it should be considered equal as if it was resolved with `NaN`.


## Users

When invoking `rbac.check`, the argument `user` is an arbitrary value that is only checked within the specified providers. For this reason, this value should normally be numeric or string. However, when implementing custom providers, other data types and values may be passed to the function.


## Grouped permissions

To specify more than one permission for a given rule, it is possible to pass an array, or a comma-separated string of permissions. For example :

```javascript
rbac.check(userId, 'list, read').then(...);
rbac.check(userId, ['post', 'update']).then(...);
```

The above example would validate if the user has *any* (i.e. `OR`) of the specified permissions. For cases where users should be valid only if *all* (i.e. `AND`) specified roles, separate each role with the `&&` delimiter.

```javascript
rbac.check(userId, 'list&&read&&review').then(...);

// mix OR / AND (all the following are equivalent)
rbac.check(userId, 'post && update, read && delete').then(...);
rbac.check(userId, ['post && update', 'read && delete']).then(...);
rbac.check(userId, [['post', 'update'], ['read', 'delete']]).then(...);
```


## Providers

Providers are the pluggable core of the RBAC-A system. To validate users against permissions, a provider extending the built-in class `Provider` must be specified. Unlike [attributes](#attributes), providers are mandatory. A provider may be specified from the constructor, or assigned directly to the prototype.

```javascript
const rbac1 = new RBAC({
  provider: new CustomProvider()
});

// or
RBAC.prototype.provider = new CustomProvider();

const rbac2 = new RBAC();
```

**NOTE**: when specifying a provider to the prototype, all instances not specifying their own `Provider` will fall back to that one.

The `CustomProvider` instance must extend `Provider`. For example :

```javascript
'use strict';

const Provider = require('rbac-a').Provider;

class CustomProvider extends Provider {

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

  @param use {mixed}
  @return {Object<string,number>}
  */
  getRoles(user) {
    return {};   // TODO : implement stub
  }

  /**
  Return all permissions for the specified role. The return value
  must be an array. Return an empty array if role is missing or
  no permission for the specified role.

  Ex: ['permission1', 'permission2', ... ]

  The method mey return a promise resolving with the
  expected return value.

  @param role {mixed}
  @return {Array<string>}
  */
  getPermissions(role) {
    return [];   // TODO : implement stub
  }

  /**
  Return all attributes for the specified role. The return value must
  be an array. Return an empty array if role is missing or if no
  attributes for the specified role.

  Ex: ['attribute1', 'attribute2', ... ]

  The method mey return a promise resolving with the
  expected return value.

  @param role {mixed}
  @return {Array<string>}
  */
  getAttributes(role) {
    return [];   // TODO : implement stub
  }

}
```

When hybrid systems require more complex providers, a composed one may be implemented. For example :

```javascript
class CompositeProvider extends Provider {

  constructor(options) {
    this.json = new JsonProvider(options.rulesObject);
    this.custom = new CustomProvider(options);
  }

  getRoles(user) {
    // NOTE : ignore JSON provider, here
    return this.custom.getRoles(user);
  }

  getPermissions(role) {
    return Promise.all([
      this.json.getPermissions(role),
      this.custom.getPermissions(role)
    ]).then(function (permissionLists) {
      var jsonPermissions = permissionLists[0] || [];
      var customPermissions = permissionLists[1] || [];
      return jsonPermissions.push.apply(jsonPermissions, customPermissions);
    });
  }

  getAttributes(role) {
    // NOTE : ignore custom provider, here
    return this.json.getAttributes(role);
  }
}
```

### Built-in providers

#### JSON (static, sync)

A default provider is implemented, using a JSON Object as data source.

```javascript
const RBAC = require('rbac-a');
const JsonProvider = RBAC.providers.JsonProvider;

var rbac = new RBAC({
  provider: new JsonProvider(rulesObject)
});
```

The JSON should have the following format, for example :

```json
{
  "roles": {
    "guest": {
    },
    "reader": {
      "permissions": ["read"],
      "inherited": ["guest"]
    },
    "writer": {
      "permissions": ["create"],
      "inherited": ["reader"]
    },
    "editor": {
      "permissions": ["update"],
      "inherited": ["reader"],
      "attributes": ["dailySchedule"]
    },
    "director": {
      "permissions": ["delete"],
      "inherited": ["reader", "editor"],
    },
    "admin": {
      "permissions": ["manage"],
      "inherited": ["director"],
      "attributes": ["hasSuperPrivilege"]
    }
  },
  "users": {
    "john.smith": ["writer"],
    "root": ["admin"]
  }
}
```

## Attributes

Attributes determine if a role is active or not. If an attribute fails (returns or resolves with a falsy value, or if an error is thrown), then the role is considered inactive and treated as if not part of the user's membership. A role with no attributes is always active.

When checking permissions, `rbac.check` only allows passing one set of persistent and shared parameters that will be sent to any and all specified roles' attributes. And since attributes are business-specific, it is entirely to the implementing project to manage and handle any such parameters.

Attribute functions may return or resolve with a thruthy value if all conditions succeed, meaning that the role is active for the specified user, or a falsy value if the conditions are not met, meaning that the role is not active for the specified user. If an attribute throws an error, the condition will fail and the role will not be available.

An inactive role discards all inheriting roles for the specified user.

Any uncaught error thrown will emit an `error` event via the `RBAC` instance. The error will be extended with the specified `user`, and current `role`.

An attributes manager may be specified from the constructor, or assigned directly to the prototype.

```javascript
const rbac1 = new RBAC({
  attributes: new RBAC.AttributesManager()
});

// or
RBAC.prototype.attributes = new RBAC.AttributesManager();

const rbac2 = new RBAC();
```

**NOTE**: when specifying an attributes manager to the prototype, all instances not specifying their own `AttributesManager` will fall back to that one.

**NOTE**: if not specified, or not set on the prototype, a new instance of `AttributesManager` will be created.


### Adding attributes

To add attributes to the attributes manager, simply call the `set` method, passing a named function. The function name is the attribute name.

```javascript
function businessHours(user, role, params) {
  return /* ... */;
}

rbac.attributes.set(businessHours);
```

Attributes may return a `Promise` if they require asynchronous validation.

### Removing attributes

Attributes may be removed by value or by name :

```javascript
rbac.attributes.remove('businessHours');
rbac.attributes.remove(businessHours);
```


## Applications

The RBAC system is *not* about restricting users, but seeing if a user possess the required permissions or not. However, implementing an allow/deny system is quite trival. In fact, since `rbac.check` resolves with a numeric value representing the depth or best rule that matched the desired permissions, and lower values have higher priority (i.e. weight), implementing such system means only comparing two results. For example :

```javascript
function allowDeny(user, allowedPermissions, deniedPermissions, params) {
  function check(permissions) {
    // handle catch separately to prevent failing prematurely. The promise
    // will always resolve with a numeric value
    return permissions && rbac.check(user, permissions, params).then(function (allowed) {
      return allowed || Infinity;
    }, function () {
      // Infinity is the highest possible value (or lowest possible priority)
      return Infinity;
    }) || Infinity;
  }

  return Promise.all([
    check(allowedPermissions),
    check(deniedPermissions)
  ]).then(function (results) {
    // Note: if both are equal, then the rule failed
    if (results[0] < results[1]) {
      return true;                    // resolve next
    } else {
      return false;
    }
  });
}


allowDeny(user, 'writer', 'auditor').then(function (allowed) {
  if (allowed) {
    console.log('User is a writer and not an auditor');
  } else {
    console.log('User is a not a writer, or is an auditor');
  }
}, function (err) {
  console.error(err.stack);
})
```


## Contribution

All contributions welcome! Every PR **must** be accompanied by their associated unit tests!


## License

The MIT License (MIT)

Copyright (c) 2015 Mind2Soft <yanick.rochon@mind2soft.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
