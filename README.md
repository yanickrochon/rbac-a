# RBAC-A

Role Based Access Control with Attributes and dynamic plugin roles implementation

## Install

```
npm i rbac-a --save
```


## Usage

```javascript
const RBAC = require('rbac-a');

const UserDbProvider = require('./path/to/user-db-provider');

var rbac = new RBAC();

// ... add providers and setup AttributeManager if necessary

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

Attributes determine if a role is active or not. If an attribute fails (returns or resolves with a falsy value, or if an error is thrown), then the role is considered inactive and treated as if not part of the user's membership. A role with no attributes is always active.

When checking permissions, `rbac.check` only allows passing one set of persistent and shared parameters that will be sent to any and all specified roles' attributes. And since attributes are business-specific, it is entirely to the implementing project to manage and handle any such parameters.

Attribute functions may return or resolve with a thruthy value if all conditions succeed, meaning that the role is active for the specified user, or a falsy value if the conditions are not met, meaning that the role is not active for the specified user. If an attribute throws an error, the condition will fail and the role will not be available.

An inactive role discards all inheriting roles for the specified user.

Any uncaught error thrown will emit an `error` event via the `RBAC` instance. The error will be extended with the specified `user`, current `role`, and `permissions`.


## Applications

The RBAC system is *not* about restricting users, but seeing if a user possess the required permissions or not. However, implementing an allow/deny system is quite trival. In fact, `rbac.check` resolves with a numeric value representing the depth or role inheritance that matched the desired permissions. Lower values have higher priority (i.e. weight). For example :

```javascript
function allowDeny(user, allowedPermissions, deniedPermissions, params) {
  function check(permissions) {
    // handle catch separately to prevent failing prematurely. The promise
    // will always resolve with a numeric value
    return permissions && rbac.check(user, permissions, params).then(function (allowed) {
      return allowed || Infinity;
    }).catch(function () {
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
      throw new Error('Restricted');  // reject next
    }
  });
}


allowDeny(user, 'writer', 'auditor').then(function () {
  console.log('User is a writer and NOT an auditor');
}, function () {
  console.log('User is a writer but auditors are restricted');
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
