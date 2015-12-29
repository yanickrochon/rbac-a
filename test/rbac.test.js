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
    /*
    const rules = {
      'admin': {
        'permissions': ['chuck.norris']
      },
      'tester': {
        'permissions': ['test','read']
      },
      'guest': {
        'permissions': ['read']
      },
      'dummy': {
        'permissions': ['idle']
      }
    };
    const users = {
      'super': {'admin':1, 'tester':2, 'guest':3, 'dummy':4},
      'admin': {'admin': 1, 'guest': 2},
      'tester': {'tester': 1, 'dummy': 2},
      'guest': {'guest': 1},
      'dummy': {'dummy': 1}
    }
    */

    it('should check basic permission', function () {
      let rbac = new RBAC();
      let testUser = 'tester';
      let testPermission = 'test';

      class MockProvider extends Provider {
        getRoles(user) {
          user.should.equal(testUser);
          return {'tester': 1, 'dummy': 2};
        }
        getPermissions(role) {
          if (role === 'tester') {
            return ['test', 'read'];
          } else if (role === 'dummy') {
            return ['idle'];
          } else {
            throw new Error('Invalid role : ' + role);
          }
        }
        getAttributes(role) {}    // do not test attributes now
      }

      rbac.addProvider(new MockProvider());

      return rbac.check(testUser, testPermission).then(function (priority) {
        priority.should.equal(1);
      });

    });

    it('should fail if attribute unavailable', function () {
      let rbac = new RBAC();
      let testUser = 'tester';
      let testPermission = 'test';

      class MockProvider extends Provider {
        getRoles(user) {
          user.should.equal(testUser);
          return {'tester': 1, 'dummy': 2};
        }
        getPermissions(role) {
          if (role === 'tester') {
            return ['test', 'read'];
          } else if (role === 'dummy') {
            return ['idle'];
          } else {
            throw new Error('Invalid role : ' + role);
          }
        }
        getAttributes(role) {
          if (role === 'tester') {
            return ['testAttribute'];
          } else if (role === 'dummy') {
            return ['dummyAttribute'];
          } else {
            throw new Error('Invalid role : ' + role);
          }
        }    // do not test attributes now
      }

      rbac.addProvider(new MockProvider());

      return rbac.check(testUser, testPermission).then(function (priority) {
        priority.should.be.NaN();
      });
    });

    it('should check if attribute is available');

    it('should fail if missing role');

    it('should fail if missing permission');

  });

});