# RBAC-A

[![Build Status](https://travis-ci.org/yanickrochon/rbac-a.svg?branch=master)](https://travis-ci.org/yanickrochon/rbac-a)
[![Coverage Status](https://coveralls.io/repos/yanickrochon/rbac-a/badge.svg?branch=master)](https://coveralls.io/r/yanickrochon/rbac-a?branch=master)

[![NPM](https://nodei.co/npm/rbac-a.png?compact=true)](https://nodei.co/npm/rbac-a/)

Role Based Access Control with Attributes and dynamic plugin roles implementation. This module follows the [NIST RBAC model](http://en.wikipedia.org/wiki/NIST_RBAC_model) and offer a flexible solution to allow or restrict user operations.


## Breaking change between 0.x and 1.x

Attribute validation now receive a single argument. Instead of :

```js
// 0.x
attributesManager.set('myAttribute', function (user, role, params) { ... });
```

the function signature should be :

```js
// 1.x
attributesManager.set('myAttribute', function ({ user, role, params, activeAttributes }) { ... });
```


## Introduction

In an RBAC system, permissions are assigned to roles, not users. Therefore, roles act as a ternary relation between permissions and users. Permissions are static, defined in the applications. Roles, on the other hand, are dynamic and can be defined from an application interface (API), or user interface (UI), and saved in a datastore.

This module is not dependent on an authentication, a user session, or a datastore system. The relation between the user and it's roles are specified by a `Provider`. It is the application's responsibility to implement such provider. See [providers](#providers) for more information.

Rules are applied in consideration with the roles hierarchy. Top level roles always have priority over inherited roles. When validating users against given permissions, the best role priority matching the permissions is returned. Therefore, "allowed" users will always resolve with a positive integer, and "restricted" users will always resolve with a non-numeric value (i.e. `NaN`). See [usage](#usage) for more information, or [how to restrict users](#applications) with this module.


## Usage

```javascript
const RBAC = require('rbac-a');

const rbac = new RBAC({
  provider: new RBAC.providers.JsonProvider()  // mandatory
  //attributes: new RBAC.AttributesManager()   // optional
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
  console.error(err && err.stack ? err : 'ERROR');
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
  console.error(err && err.stack ? err : 'ERROR');
});
```

The method `rbac.check` will resolve with a numeric (non-zero positive integer) value if the specified user is granted the specified permissions, or `NaN` otherwise.

If, for ever reason, the method should fail, or if the promise is rejected, then it should be considered equal as if it was resolved with `NaN`.


## Users

When invoking `rbac.check`, the argument `user` is an arbitrary value that is only checked within the specified providers. For this reason, this value should normally be numeric or string. However, when implementing custom providers, other data types and values may be passed to the function, such as a user object.


## Roles

A role is an organizational unit defining a category of permissions and attributes assigned to users. Roles consitute de bridge between actual permissions and users.

Roles are hierarchichal, meaning that they may have a child to parent relationship. Providers returning user roles should provider the following structure to the RBAC instance:

```js
{
  "root": {
    "child": null,
    "subChild": {
      "base": null
    }
  }
}
```

Roles that do not have children should have a value of `null`, whereas children roles are specified within another object. When validating permissions, the returned numerical value correspond to the level of the role that matched the specified permission.

For example :


```js
// if permission "foo" is set to the "root" role then
rbac.check(user, 'foo').then(function (priority) {
  console.log( priority );  // -> 1
});

// if permission "foo" is set to the "base" role then
rbac.check(user, 'foo').then(function (priority) {
  console.log( priority );  // -> 3
});

// if permission "foo" is set to both "child" and "base" roles then
rbac.check(user, 'foo').then(function (priority) {
  console.log( priority );  // -> 2   // highest match
});
```

## Attributes

Attributes determine if a role is active or not, they define conditions to a role, and because the same attributes can be set to different roles, they serve to specify common permissions or restrictions across many roles. If an attribute fails (returns or resolves with a falsy value, or if an error is thrown), then the role is considered inactive and treated as if not part of the user's membership. A role with no attributes is always active.

When checking permissions, `rbac.check` only allows passing one set of persistent and shared parameters that will be sent to any and all specified roles' attributes. And since attributes are business-specific, it is entirely to the implementing project to manage and handle any such parameters.

Attribute functions may return or resolve with a thruthy value if the condition succeeds, meaning that the role is active for the specified user, or a falsy value if the condition is not met, meaning that the role is not active for the specified user. If an attribute throws an error, the condition will fail and the role will not be available.

An inactive role discards all inheriting roles for the specified user.

Any uncaught error thrown will emit an `error` event via the `RBAC` instance. The error will be extended with the specified `user`, and current `role`.



For example, given the following definition :

```json
{
  "worker": {
    "permissions": ["read"],
    "attributes": ["restricted"],
  },
  "supervisor": {
    "permissions": ["read", "write"],
    "attributes": ["restricted"],
  },
  "director": {
    "inherit": ["supervisor"],
    "attributes": ["unrestricted"],
  }
}
```

The role `"director"` would not be restricted for read and write, unlike for the `"supervisor"`. In turn, the `AttributesManager`'s purpose is to validate these attributes. Attributes that are invalid are considered non-existent when determining user permissions. For the above exemple, the `AttributesManager` might be configured as such :

```js
attributes.set('restricted', function (context) {
   // only true if unrestricted attribute exists on parents
   return context.activeAttributes.indexOf('unrestricted') !== -1;
});
attributes.set('unrestricted', function (context) {
   return true;
});
```

The relationship between users and permissions can be expressed as such :

```
                         +----------------+
                         |   Attributes   |
                         +----------------+
                                 |
  +-----------+             +---------+             +---------------+
  |   Users   | ----------- |  Roles  | ----------- |  Permissions  |
  +-----------+             +---------+             +---------------+
```


## Attributes

. If an attribute fails (returns or resolves with a falsy value, or if an error is thrown), then the role is considered inactive and treated as if not part of the user's membership. A role with no attributes is always active.

When checking permissions, `rbac.check` only allows passing one set of persistent and shared parameters that will be sent to any and all specified roles' attributes. And since attributes are business-specific, it is entirely to the implementing project to manage and handle any such parameters.

Attribute functions may return or resolve with a thruthy value if all conditions succeed, meaning that the role is active for the specified user, or a falsy value if the conditions are not met, meaning that the role is not active for the specified user. If an attribute throws an error, the condition will fail and the role will not be available.

An inactive role discards all inheriting roles for the specified user.

Any uncaught error thrown will emit an `error` event via the `RBAC` instance. The error will be extended with the specified `user`, and current `role`.

An attributes manager may be specified from the constructor, or assigned directly to the prototype.

```js
const rbac1 = new RBAC({
  attributes: new RBAC.AttributesManager()
});

// or
RBAC.prototype.attributes = new RBAC.AttributesManager();

const rbac2 = new RBAC();
```

**NOTE**: when specifying an attributes manager to the prototype, all instances not specifying their own `AttributesManager` will fall back to that one.

**NOTE**: if not specified, or not set on the prototype, a new instance of `AttributesManager` will be created.

**NOTE**: if the provider returns attributes that are not defined in the `AttributesManager`, the behavior is to consider them as returning `false`. However, passing `ignoreMissingAttributes: false` in option will make the instance throw instead.

```js
const rbac = new RBAC({
  attributes: new RBAC.AttributesManager({ ignoreMissingAttributes: false })
});
```


### Adding attributes

To add attributes to the attributes manager, simply call the `set` method, passing a named function, or using a string specifying the name of the function handler. The attribute handler should return a `Boolean`, or a `Promise` resolving with a `Boolean`.

```javascript
function businessHours(context) { ... }

// named function
rbac.attributes.set(businessHours);
// or lambda function
rbac.attributes.set('businessHours', () => { ... }));
```

**Note**: attributes which throw an error are considered to return `false`.


### Removing attributes

Attributes may be removed by value or by name :

```javascript
rbac.attributes.remove(businessHours);   // removed by function reference
rbac.attributes.remove('businessHours'); // removed by name
```


## Grouped permissions

When validating users, it is possible to specify more than one permissions for a given rule, whether from an array, or a comma-separated string of permissions. For example :

```js
rbac.check(userId, 'list, read').then(...);
rbac.check(userId, ['post', 'update']).then(...);
```

The above example would validate if the user has *any* (i.e. `OR`) of the specified permissions. For cases where users should be only valid if *all* (i.e. `AND`) specified conditions are met, separate each permission with the `&&` delimiter.

```js
rbac.check(userId, 'list&&read&&review').then(...);

// mix OR / AND (all the following are equivalent)
rbac.check(userId, 'post && update, read && delete').then(...);
rbac.check(userId, ['post && update', 'read && delete']).then(...);
rbac.check(userId, [['post', 'update'], ['read', 'delete']]).then(...);
```

**Note:** the following is invalid :

```js
// not valid (one too many parentheses)
rbac.check(userId, [[['foo']]]).then(...);
```


## Providers

Providers are the pluggable core of the RBAC-A system. To validate users against permissions, a provider extending the built-in class `Provider` must be specified. Unlike [attributes](#attributes), providers are mandatory. A provider may be specified from the constructor, or assigned directly to the prototype as default value for all `RBAC` instances.

The role of a `Provider` is to :

1. return a hiarerchichal structure (i.e. an `Object`) specifying roles for the given user
2. return an `Array` of allowed permissions for *any* given role
3. return an `Array` of attributes for *any* given role


The `CustomProvider` instance *must* extend `Provider`. For example :

```javascript
const Provider = require('rbac-a').Provider;

class CustomProvider extends Provider {
  getRoles(user) {
    return {
      "root": {
        "child": null,
        "subChild": {
          "base": null
        }
      }
    };
  }

  getPermissions(role) {
    return ['read', 'write'];
  }

  getAttributes(role) {
    return ['workHours'];
  }
}

const rbac1 = new RBAC({
  provider: new CustomProvider()
});

// or globally
RBAC.prototype.provider = new CustomProvider();
const rbac2 = new RBAC();
```

**NOTE**: when specifying a provider to the prototype, all instances not specifying their own `Provider` will fall back to that one.

When hybrid systems requiring more complex providers, a custom provider may compose other providers and validate against both of them simultaneously. For example :

```javascript
class CompositeProvider extends Provider {

  constructor(options) {
    this.json = new JsonProvider(options.jsonData);
    this.custom = new CustomProvider(options.customData);
  }

  getRoles(user) {
    const jsonRoles = this.json.getRoles(user);
    const customRoles = this.custom.getRoles(user);

    return merge(jsonRoles, customRoles);
  }

  getPermissions(role) {
    return Promise.all([
      this.json.getPermissions(role),
      this.custom.getPermissions(role)
    ]).then(function (permissionLists) {
      const jsonPermissions = permissionLists[0] || [];
      const customPermissions = permissionLists[1] || [];

      return concat( jsonPermissions, customPermissions );
    });
  }

  getAttributes(role) {
    const jsonAttributes = this.json.getAttributes(role) || [];
    const customAttributes = this.custom.getAttributes(role) || [];

    return concat( jsonAttributes, customAttributes );
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

When calling `getRoles(user)`, the provider will construct the hierarchichal roles from the definition.

For example: 

```js
jsonProvider.getRoles('john.smith');
// -> {
//       "writer": {
//         "reader": {
//           "guest": null
//         } 
//      }
//    }
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
