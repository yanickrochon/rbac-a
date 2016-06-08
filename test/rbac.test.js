'use strict';


describe('Test RBAC', function () {
  const RBAC = require('../lib/rbac');
  const Provider = require('../lib/provider');
  const AttributesManager = require('../lib/attributes-manager');


  describe('RBAC as EventEmitter', function () {
    const EventEmitter = require('events');

    let rbac;

    beforeEach(function () {
      rbac = new RBAC({ provider: new Provider() });
    });

    afterEach(function () {
      rbac = undefined;
    });

    it('should extend standard EventEmitter', function () {
      rbac.should.be.instanceOf(EventEmitter);
    });

  });


  describe('Testing constructor', function () {

    it('should fail with missing Provider', function () {
      (RBAC.prototype.provider === null).should.be.true();

      (function () { new RBAC(); }).should.throw('Invalid or missing provider');
    });

    it('should fail with invalid or missing Provider', function () {
      [
        undefined, null, false, true,
        NaN, Infinity, -1, 0, 1,
        '', 'Foo',
        function () {}, {}, [], /./, new Date(), Promise.resolve()
      ].forEach(function (provider) {
        (function () { new RBAC({ provider: provider }); }).should.throw('Invalid or missing provider');
      });
    });

    it('should fail with invalid AttributesManager', function () {
      [
        undefined, null, false, true,
        NaN, Infinity, -1, 0, 1,
        '', 'Foo',
        function () {}, {}, [], /./, new Date(), Promise.resolve()
      ].forEach(function (attrManager) {
        (function () { new RBAC({ provider: new Provider(), attributes: attrManager }); }).should.throw('Invalid attributes manager');
      });
    });

  });


  describe('Testing provider', function () {

    class MockProvider extends Provider {
      getRoles(user) {}
      getPermissions(role) {}
      getAttributes(role) {}
    }

    it('should create standardized instances', function () {
      const defaultProvider = RBAC.prototype.provider;
      let provider = new MockProvider();

      RBAC.prototype.provider = provider;

      let rbac1 = new RBAC();
      let rbac2 = new RBAC();

      rbac1.provider.should.equal(provider);
      rbac1.provider.should.equal(rbac2.provider);

      RBAC.prototype.provider = defaultProvider;
    });

  });


  describe('Testing attributes', function () {

    it('should create default attribute manager', function () {
      let rbac = new RBAC({ provider: new Provider() });

      rbac.attributes.should.be.instanceOf(AttributesManager);
    });

    it('should allow setting custom attributes manager', function () {
      let attributes = new AttributesManager();

      let rbac1 = new RBAC({ provider: new Provider() });
      let rbac2 = new RBAC({ provider: new Provider(), attributes: attributes });

      rbac1.attributes.should.not.equal(rbac2.attributes);
      rbac2.attributes.should.equal(attributes);
    });

    it('should create standardized instances', function () {
      const defaultAttributes = RBAC.prototype.attributes;
      let attributes = new AttributesManager();

      RBAC.prototype.attributes = attributes;

      let rbac1 = new RBAC({ provider: new Provider() });
      let rbac2 = new RBAC({ provider: new Provider() });

      rbac1.attributes.should.equal(attributes);
      rbac1.attributes.should.equal(rbac2.attributes);

      RBAC.prototype.attributes = defaultAttributes;
    });

  });


  describe('Testing checking permissions', function () {

    class MockProvider extends Provider {
      constructor(testUser) {
        super();

        this.testUser = testUser;
      }
      getRoles(user) {
        user.should.equal(this.testUser);
        return {
          'tester': {
            'dummy': null
          }
        };
      }
      getPermissions(role) {
        if (role === 'tester') {
          return ['test', 'read'];
        } else if (role === 'dummy') {
          return ['idle'];
        }
      }
      getAttributes(role) {
        if (role === 'tester') {
          return ['testAttribute'];
        } else if (role === 'dummy') {
          return ['dummyAttribute'];
        }
      }
    }


    it('should check basic permission', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });

      provider.getAttributes = function () {};  // ignore attributes

      return rbac.check(testUser, 'test').then(function (priority) {
        priority.should.equal(1);
      }).then(function () {
        return rbac.check(testUser, 'idle').then(function (priority) {
          priority.should.equal(2);
        });
      });
    });

    it('should check basic permission (no attributes manager)', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });

      provider.getAttributes = function () {};  // ignore attributes

      return rbac.check(testUser, 'test').then(function (priority) {
        priority.should.equal(1);
      }).then(function () {
        return rbac.check(testUser, 'idle').then(function (priority) {
          priority.should.equal(2);
        });
      });
    });

    it('should fail if attribute unavailable', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });

      rbac.attributes.set(function testAttribute(user, role, params) {
        user.should.equal('tester');
        role.should.equal('tester');
        (typeof params).should.equal('undefined');
        return false;
      });

      return rbac.check(testUser, 'test').then(function (priority) {
        priority.should.be.NaN();
      }).then(function () {
        return rbac.check(testUser, 'idle').then(function (priority) {
        priority.should.be.NaN();
        });
      });
    });

    it('should check if attribute is available', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });
      const testParams = { foo: 'bar', buz: true };
      let testAttrCalled = false;
      let dummyAttrCalled = false;

      rbac.attributes.set(function testAttribute(user, role, params) {
        user.should.equal('tester');
        role.should.equal('tester');
        params.should.equal(testParams);
        testAttrCalled = true;
        return true;
      });

      rbac.attributes.set(function dummyAttribute(user, role, params) {
        user.should.equal('tester');
        role.should.equal('dummy');
        params.should.equal(testParams);
        dummyAttrCalled = true;
        return true;
      });

      return rbac.check(testUser, 'test', testParams).then(function (priority) {
        priority.should.equal(1);

        testAttrCalled.should.be.true();

        return rbac.check(testUser, ['test'], testParams).then(function (priority) {
          priority.should.equal(1);

          return rbac.check(testUser, [['test']], testParams).then(function (priority) {
            priority.should.equal(1);
          });
        });
      }).then(function () {

        return rbac.check(testUser, 'idle', testParams).then(function (priority) {
          priority.should.equal(2);

          dummyAttrCalled.should.be.true();

          return rbac.check(testUser, 'idle', testParams).then(function (priority) {
            priority.should.equal(2);

            return rbac.check(testUser, 'idle', testParams).then(function (priority) {
              priority.should.equal(2);
            });
          });
        });
      });
    });

    it('should check if at least one valid permission', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });

      provider.getAttributes = function () {};  // ignore attributes

      return rbac.check(testUser, 'test, missing').then(function (priority) {
        priority.should.equal(1);
      }).then(function () {
        return rbac.check(testUser, 'idle, missing').then(function (priority) {
          priority.should.equal(2);
        });
      });
    });

    it('should check if all are valid permissions', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });

      provider.getAttributes = function () {};  // ignore attributes

      return rbac.check(testUser, 'test && idle').then(function (priority) {
        priority.should.equal(1);
      });
    });

    it('should fail if missing role', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });

      provider.getRoles = function () {
        return {
          'foo': null
        };
      };

      return rbac.check(testUser, 'bar').then(function (priority) {
        priority.should.be.NaN();
      }).then(function () {
        return rbac.check(testUser, 'test && missing').then(function (priority) {
          priority.should.be.NaN();
        });
      });
    });

    it('should fail if missing permission', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });

      provider.getAttributes = function () {};  // ignore attributes

      return rbac.check(testUser, 'missing').then(function (priority) {
        priority.should.be.NaN();
      });
    });


    it('should emit error when checking roles', function () {
      const provider = new MockProvider();
      const rbac = new RBAC({ provider: provider });
      let errorThrown = false;

      provider.getRoles = function (user) {
        if (user === 'tester') {
          throw new Error('Test');
        } else {
          return Promise.reject();  // do not throw anything...
        }
      };

      rbac.on('error', function (err) {
        errorThrown = true;
      });

      return rbac.check('tester', 'test').then(function (priority) {
        priority.should.be.NaN();

        errorThrown.should.be.true();

        return rbac.check('missingUser', 'test').then(function (priority) {
          priority.should.be.NaN();
        });
      });
    });

    it('should emit error when checking attributes', function () {
      const provider = new MockProvider();
      const rbac = new RBAC({ provider: provider });
      let errorThrown = false;

      provider.getRoles = function (user) {
        return {
          'tester': {
            'dummy': null
          }
        };
      };

      rbac.attributes.validate = function (attrName, user, role, params) {
        if (user === 'tester') {
          throw new Error('Test');
        } else {
          return Promise.reject();  // do not throw anything...
        }
      };

      rbac.on('error', function (err) {
        errorThrown = true;
      });

      return rbac.check('tester', 'test').then(function (priority) {
        priority.should.be.NaN();

        errorThrown.should.be.true();

        return rbac.check('missingUser', 'test').then(function (priority) {
          priority.should.be.NaN();
        });
      });
    });

    it('should emit error when checking permissions', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });
      let errorThrown = false;

      provider.getPermissions = function (role) {
        if (role === 'tester') {
          throw new Error('Test');
        } else {
          return Promise.reject();  // do not throw anything...
        }
      };

      rbac.attributes.set(function testAttribute(user, role, params) {
        return true;
      });

      rbac.attributes.set(function dummyAttribute(user, role, params) {
        return true;
      });


      rbac.on('error', function (err) {
        errorThrown = true;
      });

      return rbac.check(testUser, 'test').then(function (priority) {
        priority.should.be.NaN();

        errorThrown.should.be.true();
      });
    });

    it('should fail if invalid permission', function () {
      const provider = new MockProvider();
      const rbac = new RBAC({ provider: provider });
      const invalid = [
        // invalid types
        undefined, null, false, true,
        -1, 0, 1, NaN, Infinity,
        {}, function () {}, /./, new Date()
      ];

      // simple permission
      invalid.forEach(function (permissions) {
        (function invalidPermission() { rbac.check('user', permissions); }).should.throw();
      });

      // permission group (OR)
      (function invalidPermissionGroup() { rbac.check('user', ''); }).should.throw();
      (function invalidPermissionGroup() { rbac.check('user', ','); }).should.throw();
      (function invalidPermissionGroup() { rbac.check('user', []); }).should.throw();
      invalid.forEach(function (permissions) {
        (function invalidPermissionGroup() { rbac.check('user', [permissions]); }).should.throw();
        (function invalidPermissionGroup() { rbac.check('user', [permissions,permissions]); }).should.throw();
      });

      // permission group (AND)
      (function invalidPermissionGroup() { rbac.check('user', '&&'); }).should.throw();
      (function invalidPermissionGroup() { rbac.check('user', ['&&']); }).should.throw();
      invalid.forEach(function (permissions) {
        (function invalidPermissionGroup() { rbac.check('user', [[permissions]]); }).should.throw();
        (function invalidPermissionGroup() { rbac.check('user', [[permissions,permissions]]); }).should.throw();
      });
    });


  });

});
