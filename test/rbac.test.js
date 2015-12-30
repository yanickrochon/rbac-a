'use strict';


describe('Test RBAC', function () {
  const RBAC = require('../lib/rbac');
  const Provider = require('../lib/provider');
  const AttributesManager = require('../lib/attributes-manager');


  describe('RBAC as EventEmitter', function () {
    const PromiseEventEmitter = require('promise-events');
    const EventEmitter = require('events');

    let rbac;

    beforeEach(function () {
      rbac = new RBAC();
    });

    afterEach(function () {
      rbac = undefined;
    });


    it('should extend promise-events', function () {
      rbac.should.be.instanceOf(PromiseEventEmitter);
    });

    it('should extend standard EventEmitter', function () {
      rbac.should.be.instanceOf(EventEmitter);
    });

  });


  describe('Testing constructor', function () {

    it('should fail with invalid AttributesManager', function () {
      [
        undefined, null, false, true,
        NaN, Infinity, -1, 0, 1,
        '', 'Foo',
        function () {}, {}, [], /./, new Date(), Promise.resolve()
      ].forEach(function (attrManager) {
        (function () { new RBAC(attrManager); }).should.throw('Invalid attributes manager');
      });
    });

  });


  describe('Testing provider', function () {

    class MockProvider extends Provider {
      getRoles(user) {}
      getPermissions(role) {}
      getAttributes(role) {}
    }

    it('should add providers', function () {
      let rbac = new RBAC();

      rbac.addProvider(new Provider());
      rbac.addProvider(new MockProvider());

      rbac._providers.should.have.lengthOf(2);
    });

    it('should not add same provider twice', function () {
      let rbac = new RBAC();
      let provider = new MockProvider();

      rbac.addProvider(provider);
      rbac.addProvider(provider);

      rbac._providers.should.have.lengthOf(1);
      rbac._providers[0].should.equal(provider);
    })

    it('should fail if invalid provider', function () {
      [
        undefined, null, false, true,
        NaN, Infinity, -1, 0, 1,
        '', 'Foo',
        function () {}, {}, [], /./, new Date(), Promise.resolve()
      ].forEach(function (provider) {
        (function () {
          let rbac = new RBAC();
          rbac.addProvider(provider);
        }).should.throw('Invalid provider');
      });
    });

    it('should create standardized instances', function () {
      let provider = new MockProvider();

      RBAC.prototype._providers = [provider];

      let rbac1 = new RBAC();
      let rbac2 = new RBAC();

      rbac1._providers.should.have.lengthOf(1);
      rbac1._providers[0].should.equal(provider);
      rbac1._providers.should.deepEqual(rbac2._providers);

      RBAC.prototype._providers = null;
    });

  });


  describe('Testing attributes', function () {

    it('should get the attribute manager', function () {
      let rbac = new RBAC();

      rbac.getAttributesManager().should.equal(rbac._attributes);
    });

    it('should allow setting custom attributes manager', function () {
      let attributes = new AttributesManager();

      let rbac1 = new RBAC();
      let rbac2 = new RBAC(attributes);

      rbac1.getAttributesManager().should.not.equal(rbac2.getAttributesManager());
      rbac2.getAttributesManager().should.equal(attributes);
    });

    it('should create standardized instances', function () {
      let attributes = new AttributesManager();

      RBAC.prototype._attributes = attributes;

      let rbac1 = new RBAC();
      let rbac2 = new RBAC();

      rbac1._attributes.should.equal(attributes);
      rbac1._attributes.should.equal(rbac2._attributes);

      RBAC.prototype._attributes = null;
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


    it('should fail if no provider', function () {
      const rbac = new RBAC();
      const testUser = 'tester';

      return rbac.check(testUser, 'test').then(function (priority) {
        priority.should.be.NaN();
      }).then(function () {
        return rbac.check(testUser, 'idle').then(function (priority) {
          priority.should.be.NaN();
        });
      });
    });


    it('should check basic permission', function () {
      const rbac = new RBAC();
      const testUser = 'tester';
      const provider = new MockProvider(testUser);

      provider.getAttributes = function () {};  // ignore attributes

      rbac.addProvider(provider);

      return rbac.check(testUser, 'test').then(function (priority) {
        priority.should.equal(1);
      }).then(function () {
        return rbac.check(testUser, 'idle').then(function (priority) {
          priority.should.equal(2);
        });
      });
    });

    it('should check basic permission (no attributes manager)', function () {
      const rbac = new RBAC();
      const testUser = 'tester';
      const provider = new MockProvider(testUser);

      provider.getAttributes = function () {};  // ignore attributes

      rbac._attributes = null;  // reset
      rbac.addProvider(provider);

      return rbac.check(testUser, 'test').then(function (priority) {
        priority.should.equal(1);
      }).then(function () {
        return rbac.check(testUser, 'idle').then(function (priority) {
          priority.should.equal(2);
        });
      });
    });

    it('should fail if attribute unavailable', function () {
      const rbac = new RBAC();
      const testUser = 'tester';
      const provider = new MockProvider(testUser);

      rbac.getAttributesManager().set(function testAttribute(user, role, params) {
        user.should.equal('tester');
        role.should.equal('tester');
        (typeof params).should.equal('undefined');
        return false;
      });

      rbac.addProvider(provider);

      return rbac.check(testUser, 'test').then(function (priority) {
        priority.should.be.NaN();
      }).then(function () {
        return rbac.check(testUser, 'idle').then(function (priority) {
        priority.should.be.NaN();
        });
      });
    });

    it('should check if attribute is available', function () {
      const rbac = new RBAC();
      const testUser = 'tester';
      const testParams = { foo: 'bar', buz: true };
      const provider = new MockProvider(testUser);
      let testAttrCalled = false;
      let dummyAttrCalled = false;

      rbac.getAttributesManager().set(function testAttribute(user, role, params) {
        user.should.equal('tester');
        role.should.equal('tester');
        params.should.equal(testParams);
        testAttrCalled = true;
        return true;
      });

      rbac.getAttributesManager().set(function dummyAttribute(user, role, params) {
        user.should.equal('tester');
        role.should.equal('dummy');
        params.should.equal(testParams);
        dummyAttrCalled = true;
        return true;
      });

      rbac.addProvider(provider);

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

    it('should check if at least one valid role', function () {
      const rbac = new RBAC();
      const testUser = 'tester';
      const provider = new MockProvider(testUser);

      provider.getAttributes = function () {};  // ignore attributes

      rbac.addProvider(provider);

      return rbac.check(testUser, 'test, missing').then(function (priority) {
        priority.should.equal(1);
      }).then(function () {
        return rbac.check(testUser, 'idle, missing').then(function (priority) {
          priority.should.equal(2);
        });
      });
    });

    it('should fail if missing role', function () {
      const rbac = new RBAC();
      const testUser = 'tester';
      const provider = new MockProvider(testUser);

      provider.getRoles = function () {
        return {
          'foo': null
        };
      };

     rbac.addProvider(provider);

      return rbac.check(testUser, 'bar').then(function (priority) {
        priority.should.be.NaN();
      }).then(function () {
        return rbac.check(testUser, 'test && missing').then(function (priority) {
          priority.should.be.NaN();
        });
      });
    });

    it('should fail if missing permission', function () {
      const rbac = new RBAC();
      const testUser = 'tester';
      const provider = new MockProvider(testUser);

      provider.getAttributes = function () {};  // ignore attributes

      rbac._attributes = null;  // reset
      rbac.addProvider(provider);

      return rbac.check(testUser, 'missing').then(function (priority) {
        priority.should.be.NaN();
      });
    });


    it('should emit error when checking roles', function () {
      const rbac = new RBAC();
      const provider = new MockProvider();
      let errorThrown = false;

      provider.getRoles = function (user) {
        if (user === 'tester') {
          throw new Error('Test');
        } else {
          return Promise.reject();  // do not throw anything...
        }
      };

      rbac.addProvider(provider);

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
      const rbac = new RBAC();
      const provider = new MockProvider();
      let errorThrown = false;

      provider.getRoles = function (user) {
        return {
          'tester': {
            'dummy': null
          }
        };
      };

      rbac.getAttributesManager().validate = function (attrName, user, role, params) {
        if (user === 'tester') {
          throw new Error('Test');
        } else {
          return Promise.reject();  // do not throw anything...
        }
      };

      rbac.addProvider(provider);

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
      const rbac = new RBAC();
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      let errorThrown = false;

      provider.getPermissions = function (role) {
        if (role === 'tester') {
          throw new Error('Test');
        } else {
          return Promise.reject();  // do not throw anything...
        }
      };

      rbac.getAttributesManager().set(function testAttribute(user, role, params) {
        return true;
      });

      rbac.getAttributesManager().set(function dummyAttribute(user, role, params) {
        return true;
      });


      rbac.addProvider(provider);

      rbac.on('error', function (err) {
        errorThrown = true;
      });

      return rbac.check(testUser, 'test').then(function (priority) {
        priority.should.be.NaN();

        errorThrown.should.be.true();
      });
    });

    it('should fail if invalid permission', function () {
      const rbac = new RBAC();
      const provider = new MockProvider();
      const invalid = [
        // invalid types
        undefined, null, false, true,
        -1, 0, 1, NaN, Infinity,
        {}, function () {}, /./, new Date()
      ];
      
      rbac.addProvider(provider);

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