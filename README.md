# RBAC-A

Role Based Access Control with Attributes and dynamic plugin roles implementation

## Install

```
npm i rbac-a --save
```


## Usage

```javascript
var RBAC = require('rbac-a');

var rbac = new RBAC();

rbac.addProvider(new RBAC.providers.Json(require('/path/to/json')));
rbac.setAttribute(require('/path/to/attribute'));

rbac.on('error', function (err) {
  console.error('Error while checking $s/%s for %s : %s', err.role, err.user, err.permissions, err.message);
})

rbac.check(user, 'create').then(function () {
  console.log('User can create!');
}).catch(function () {
  console.log('User cannot create.');
  console.info('Please contact your system admin for more information');
});

// specify attributes arguments
rbac.check(user, 'edit', { time: Date.now() }).then(function () {
  console.log('User can edit!');
}).catch(function () {
  console.log('User cannot edit.');
  console.info('Please contact your system admin for more information');
});

```


```javascript
// /path/to/attribute.js
module.exports = function dayShift(user, role, params) {
  var time = params && new Date(params.time) || new Date();

  return time && time.getHours() >= 7 && time.getHours() <= 17;
};
```

```javascript
// /path/to/json
module.exports = {
  'roles': {
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
      'inherited': ['reader'],
      // user only has this role if attribute condition is met
      'attributes': ['dayShift']
    },
    'director': {
      //name: 'Director',
      'permissions': ['delete'],
      'inherited': ['reader', 'editor']
    },
    'auditor': {
      //name: 'Auditor',
      'permissions': ['audit']
    },
    'admin': {
      //name: 'Administrator',
      'permissions': ['manage'],
      'inherited': ['director', 'auditor']
    }
  },
  'users': {
    '0': ['admin'],
    '123': ['director'],
    '222': ['editor'],
    '333': ['editor', 'reader']
  }
};
```

Roles are always restrictive. Any provider specifying a role's permission that restrict will override any previous rule, unless the access was granted by a descendant of that role.


## Users

When invoking `rbac.check`, the argument `user` is an arbitrary value that is only checked within the specified providers. For this reason, this value should normally be numeric or string. However, implementing custom providers, other data types and values may be passed to the function.


## Rule inheritance

Role inheritence is done from bottom to top, and evaluated from top to bottom. When declaring roles, a given role does not inherit from another role, but instead has declared roles inheriting from it.

In the [usage](#usage) example, the roles are evaluated in a path, from left to right, starting at any given node, like so :

```
    
               ┌── auditor
    ── admin ──┤              ┌── editor? ──┐
               └── director ──┤             ├── reader ── guest
                              └── writer ───┘
```

**Note :** the `editor?` role depends if the specified attribute is active or not. If the rule's attribute is inactive, then all inheriting roles are ignored, unless explicitly specified within the user's membership. In the example above, if `editor`'s attribute is inactive, then user `333` would still be able to `read` as the role `reader` is explicitly specified whereas user `222` would not as it is only implicitly specified through the `editor` role's inheritance.


### Cyclical inheritance

No error will be emitted for cyclical inheritance. However, the validation
will not search any deeper once a cycle is detected.


## Super User Role (Administrator)

This RBAC module does not have a built-in "administrator" role or permission. Such privileged role must be implemented by the application. This can be achieved with a role (ex: `admin`), which is not inherited (i.e. has no parent), but should be the parent of very other roles, with a special permission (ex: `manage`).

This way, the special permission (ex: `manage`) can be assigned on other roles
as well, if necessary.


## Grouped permissions

To specify more than one permission for a given rule, it is possible to pass an
array, or a comma-separated string of permissions. For example :

```javascript
rbac.check(userId, 'list, read').then(...);
rbac.check(userId, ['post', 'update']).then(...);
```

The above example would validate if the user has *any* (i.e. `OR`) of the specified permissions. For cases where users should be valid only if *all* (i.e. `AND`) specified roles, separate each role with the `&&` delimiter.

```javascript
rbac.check(userId, 'list&&read&&review').then(...);
// mix OR / AND
rbac.check(userId, 'post && update, read && delete').then(...);
// is the same as
rbac.check(userId, ['post && update', 'read && delete']).then(...);
```


## Attributes

Attributes determine if a role is active or not. If an attribute fails (returns a falsy value or is resolved with a falsy value, or is rejected), then the role is considered inactive and treated as if not part of the user's membership. A role with no attributes is always active.

When checking permissions, `rbac.check` only allows passing one set of persistent and shared parameters that will be sent to any and all specified roles' attributes. And since attributes are business-specific, it is entirely to the implementing project to manage and handle any such parameters.

Attribute functions may return a thruthy value if all conditions succeed, meaning that the role is active for the specified user, or a falsy value if the conditions are not met, meaning that the role is not active for the specified user. If an attribute throws an error, the condition will fail and the role will not be available.

An inactive role discards all inheriting roles for the specified user.

Any uncaught error thrown will emit an `error` event via the `RBAC` instance. The error will be extended with the specified `user`, current `role`, and `permissions`.


## Contribution

All contributions welcome! Every PR **must** be accompanied by their associated unit tests!


## License

The MIT License (MIT)

Copyright (c) 2015 Mind2Soft <yanick.rochon@mind2soft.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
