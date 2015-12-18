# RBAC-A

Role Based Access Control with Attributes and dynamic plugin roles implementation

## Install

```
npm i rbac-a --save
```


## Usage

```javascript
var RBAC = require('rbac-a');
var AccessProvider = require('./access-provider');

var rbac = new RBAC();

rbac.addProvider(new RBAC.JsonProvider('/path/to/roles.json'));
rbac.addProvider(new AccessProvider());

rbac.on('error', function (err) {
  console.error('Error while checking user %s with %s : %s', err.user, err.permissions, err.message);
})

rbac.check(userId, 'edit').then(function () {
  console.log('User can edit!');
}).catch(function () {
  console.log('User cannot edit.');
  console.info('Please contact your system admin for more information');
});

// specify attributes arguments
rbac.check(userId, 'delete', { time: someTimestamp }).then(....);

```


```javascript
// access-provider.js

/**
Attributes registry
*/
const attributes = {
  'dayShift': function (params) {
    var time = params && params.time || new Date();

    return time && time.getHours() >= 7 && time.getHours() <= 17;
  }
};

/**
Role cache. Normally, these would be stored in a database, or something
*/
const roles = {
  'guest': {
    //name: 'Guest'
  },
  'reader': {
    //name: 'Reader',
    'permissions': ['read'],
    'inherited': ['guest']
  },
  'writer': {
    //name: 'Writer',
    'permissions': ['create'],
    'inherited': ['reader']
  },
  'editor': {
    //name: 'Editor',
    'permissions': ['update'],
    'inherited': ['reader']
  },
  'director': {
    //name: 'Director',
    'permissions': ['delete'],
    'inherited': ['reader', 'editor'],
    // user only has this role if attribute condition is met
    'attributes': ['dayShift']
  },
  'admin': {
    //name: 'Administrator',
    'permissions': ['manage'],
    'inherited': ['director']
  }
};

/**
AccessProvider constructor

NOTE : this class is a simplified version of RBAC.JsonProvider
*/
module.exports = class AccessProvider {

  /**
  Return an attribute value specified by attrName, given the specified params
  */
  getAttribute(attrName, params) {
    return attributes[attrName];
  }

  /**
  Return the role defined by `roleName`
  */
  getRolePermissions(roleName) {
    // NOTE : the method should return an object similar to the one described here
    return roles[roleName];
  }

  /**
  Return the roles assigned to the user. Each item of the returned array will
  invoke `getRole` with it's item value
  */
  getUserRoles(userId) {
    return ['director', 'reader'];
  }

}
```

Roles are always restrictive. Any provider specifying a role's permission that restrict will override any previous rule, unless the access was granted by a descendant of that role.


## Users

When invoking `rbac.check`, the argument `userId` is an arbitrary value that is only checked within the specified providers. For this reason, this value should normally be numeric or string. However, implementing custom providers, other data types and values may be passed to the function.


## Async checking

Checking user access is done asynchronously. For this reason, providers may return a Promise from their methods `getUserRoles`, `getRolePermissions`, and `getAttribute`.


## Rule inheritance

Role inheritence is done from bottom to top, and evaluated from top to bottom.
When declaring roles, a given role does not inherit from another role, but
instead has declared roles inheriting from it.

In the [usage](#usage) example, the roles are evaluated in a path, from left
to right, starting at any given node, like so :

```
    
                           ┌── editor ──┐
    ── admin ── director ──┤            ├── reader ── guest
                           └── writer ──┘
```

### Cyclical inheritance

No error will be emitted for cyclical inheritance. However, the validation
will not search any deeper once a cyclical inheritance is detected.


## Super User Role (Administrator)

This RBAC module does not have a built-in "administrator" role or permission.
Such privileged role must be implemented by the application. This can be
achieved with a role (ex: `admin`), which is not inherited (i.e. no parent),
with a special permission (ex: `manage`), and allow this special permission
only and on every resource that has an *allow*` or *deny* rule set.

This way, the special permission (ex: `manage`) can be assigned on other roles
as well, but may be denied, too, if necessary.


## Grouped permissions

To specify more than one permission for a given rule, it is possible to pass an
array, or a comma-separated string of permissions. For example :

```javascript
rbac.check(userId, 'list, read').then(...);
rbac.check(userId, ['post', 'update']).then(...);
```

The above example would validate if the user has *any* (i.e. `OR`) of the
specified roles. For cases where users should be valid for *all* (i.e. `AND`)
specified roles, separate each role with the `&&` delimiter.

```javascript
rbac.check(userId, 'list&&read&&review').then(...);
// mixe OR / AND
rbac.check(userId, 'post && update, read && delete').then(...);
// is the same as
rbac.check(userId, ['post && update', 'read && delete']).then(...);
```


## Attributes

Attributes determine if a role is accessible or not. Attributes are role-based and are not necessarily user-dependent. If an attribute requires to be user-dependent, such user value should be provided as attribute parameter.

When checking permissions, `rbac.check` only allows passing one set of parameters that will be sent throughout any specified roles' attribute. And since attributes are business-specific, it is entirely to the implementing project to manage any such attributes and required parameters.

Attribute functions may return a thruthy value if all condition succeeds, meaning that the role is active for the specified user, or a falsy value if the conditions are not met, meaning that the role is not active for the specified user. If an attribute throws an error, the condition will fail and the role will not be available.

Any error thrown will be emit an `error` even via the `RBAC` instance. The error will be extended with the specified `user` and `permissions`.


## Contribution

All contributions welcome! Every PR **must** be accompanied by their associated
unit tests!


## License

The MIT License (MIT)

Copyright (c) 2015 Mind2Soft <yanick.rochon@mind2soft.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
