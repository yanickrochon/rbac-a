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
      expect( rbac ).toBeInstanceOf(EventEmitter);
    });

  });


  describe('Testing constructor', function () {

    it('should fail with missing Provider', function () {
      expect( RBAC.prototype.provider === null ).toBeTruthy();

      expect(function () { new RBAC(); }).toThrow('Invalid or missing provider');
    });

    it('should fail with invalid or missing Provider', function () {
      [
        undefined, null, false, true,
        NaN, Infinity, -1, 0, 1,
        '', 'Foo',
        function () {}, {}, [], /./, new Date(), Promise.resolve()
      ].forEach(function (provider) {
        expect(function () { new RBAC({ provider: provider }); }).toThrow('Invalid or missing provider');
      });
    });

    it('should fail with invalid AttributesManager', function () {
      [
        undefined, null, false, true,
        NaN, Infinity, -1, 0, 1,
        '', 'Foo',
        function () {}, {}, [], /./, new Date(), Promise.resolve()
      ].forEach(function (attrManager) {
        expect(function () { new RBAC({ provider: new Provider(), attributes: attrManager }); }).toThrow('Invalid attributes manager');
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

      expect( rbac1.provider ).toEqual(provider);
      expect( rbac1.provider ).toEqual(rbac2.provider);

      RBAC.prototype.provider = defaultProvider;
    });

  });


  describe('Testing attributes', function () {

    it('should create default attribute manager', function () {
      let rbac = new RBAC({ provider: new Provider() });

      expect( rbac.attributes ).toBeInstanceOf(AttributesManager);

    });

    it('should allow setting custom attributes manager', function () {
      let attributes = new AttributesManager();

      let rbac1 = new RBAC({ provider: new Provider() });
      let rbac2 = new RBAC({ provider: new Provider(), attributes: attributes });

      expect( rbac1.attributes ).not.toBe(rbac2.attributes);
      expect( rbac2.attributes ).toBe(attributes);
    });

    it('should create standardized instances', function () {
      const defaultAttributes = RBAC.prototype.attributes;
      let attributes = new AttributesManager();

      RBAC.prototype.attributes = attributes;

      let rbac1 = new RBAC({ provider: new Provider() });
      let rbac2 = new RBAC({ provider: new Provider() });

      expect( rbac1.attributes ).toEqual(attributes);
      expect( rbac1.attributes ).toEqual(rbac2.attributes);

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
        expect( user ).toEqual(this.testUser);
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
        expect( priority ).toEqual(1);
      }).then(function () {
        return rbac.check(testUser, 'idle').then(function (priority) {
          expect( priority ).toEqual(2);
        });
      });
    });

    it('should check basic permission (no attributes manager)', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });

      provider.getAttributes = function () {};  // ignore attributes

      return rbac.check(testUser, 'test').then(function (priority) {
        expect( priority ).toEqual(1);
      }).then(function () {
        return rbac.check(testUser, 'idle').then(function (priority) {
          expect( priority ).toEqual(2);
        });
      });
    });

    it('should fail if attribute unavailable', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });

      rbac.attributes.set(function testAttribute(context) {
        expect( context.user ).toEqual('tester');
        expect( context.role ).toEqual('tester');
        expect( context.params ).toEqual( {} );
        return false;
      });

      return rbac.check(testUser, 'test').then(function (priority) {
        expect( priority ).toBeNaN();
      }).then(function () {
        return rbac.check(testUser, 'idle').then(function (priority) {
        expect( priority ).toBeNaN();
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

      rbac.attributes.set(function testAttribute(context) {
        expect( context.user ).toEqual('tester');
        expect( context.role ).toEqual('tester');
        expect( context.params ).toEqual(testParams);
        testAttrCalled = true;
        return true;
      });

      rbac.attributes.set(function dummyAttribute(context) {
        expect( context.user ).toEqual('tester');
        expect( context.role ).toEqual('dummy');
        expect( context.params ).toEqual(testParams);
        dummyAttrCalled = true;
        return true;
      });

      return rbac.check(testUser, 'test', testParams).then(function (priority) {
        expect( priority ).toEqual(1);

        expect( testAttrCalled ).toBeTruthy();

        return rbac.check(testUser, ['test'], testParams).then(function (priority) {
          expect( priority ).toEqual(1);

          return rbac.check(testUser, [['test']], testParams).then(function (priority) {
            expect( priority ).toEqual(1);
          });
        });
      }).then(function () {

        return rbac.check(testUser, 'idle', testParams).then(function (priority) {
          expect( priority ).toEqual(2);

          expect( dummyAttrCalled ).toBeTruthy();

          return rbac.check(testUser, 'idle', testParams).then(function (priority) {
            expect( priority ).toEqual(2);

            return rbac.check(testUser, 'idle', testParams).then(function (priority) {
              expect( priority ).toEqual(2);
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
        expect( priority ).toEqual(1);
      }).then(function () {
        return rbac.check(testUser, 'idle, missing').then(function (priority) {
          expect( priority ).toEqual(2);
        });
      });
    });

    it('should check if all are valid permissions', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });

      provider.getAttributes = function () {};  // ignore attributes

      return rbac.check(testUser, 'test && idle').then(function (priority) {
        expect( priority ).toEqual(1);
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
        expect( priority ).toBeNaN();
      }).then(function () {
        return rbac.check(testUser, 'test && missing').then(function (priority) {
          expect( priority ).toBeNaN();
        });
      });
    });

    it('should fail if missing permission', function () {
      const testUser = 'tester';
      const provider = new MockProvider(testUser);
      const rbac = new RBAC({ provider: provider });

      provider.getAttributes = function () {};  // ignore attributes

      return rbac.check(testUser, 'missing').then(function (priority) {
        expect( priority ).toBeNaN();
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
        expect( priority ).toBeNaN();

        expect( errorThrown ).toBeTruthy();

        return rbac.check('missingUser', 'test').then(function (priority) {
          expect( priority ).toBeNaN();
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
        expect( priority ).toBeNaN();

        expect( errorThrown ).toBeTruthy();

        return rbac.check('missingUser', 'test').then(function (priority) {
          expect( priority ).toBeNaN();
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
        expect( priority ).toBeNaN();

        expect( errorThrown ).toBeTruthy();
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
        expect(function invalidPermission() { rbac.check('user', permissions); }).toThrow();
      });

      // permission group (OR)
      expect(function invalidPermissionGroup() { rbac.check('user', ''); }).toThrow();
      expect(function invalidPermissionGroup() { rbac.check('user', ','); }).toThrow();
      expect(function invalidPermissionGroup() { rbac.check('user', []); }).toThrow();
      invalid.forEach(function (permissions) {
        expect(function invalidPermissionGroup() { rbac.check('user', [permissions]); }).toThrow();
        expect(function invalidPermissionGroup() { rbac.check('user', [permissions,permissions]); }).toThrow();
      });

      // permission group (AND)
      expect(function invalidPermissionGroup() { rbac.check('user', '&&'); }).toThrow();
      expect(function invalidPermissionGroup() { rbac.check('user', ['&&']); }).toThrow();
      invalid.forEach(function (permissions) {
        expect(function invalidPermissionGroup() { rbac.check('user', [[permissions]]); }).toThrow();
        expect(function invalidPermissionGroup() { rbac.check('user', [[permissions,permissions]]); }).toThrow();
      });
    });


  });

});
