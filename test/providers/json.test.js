'use strict';

describe('Test JSON provider', function () {

  const Provider = require('../../lib/provider');
  const JsonProvider = require('../../lib/providers/json');

  const RULES = {
    roles: {
      'guest': {
      },
      'reader': {
        permissions: ['read'],
        inherited: ['guest']
      },
      'writer': {
        permissions: ['create'],
        inherited: ['reader']
      },
      'editor': {
        permissions: ['update'],
        inherited: ['reader']
      },
      'director': {
        permissions: ['delete'],
        inherited: ['reader', 'editor'],
        attributes: ['test']
      },
      'admin': {
        permissions: ['manage'],
        inherited: ['director']
      }
    },
    users: {
      //'root': ['admin'],
      //'bob': ['director'],
      'joe': ['director', 'reader'],
      'jim': ['missingRole']
      //'guest': ['guest']
    }
  };


  it('should be an instance of Provider', function () {
    const provider = new JsonProvider();

    provider.should.be.instanceOf(Provider);
  });


  describe('Testing getRoles', function () {

    it('should return simple role', function () {
      const expected = {
        director: {
          editor: {}
        },
        reader: {
          guest: null
        }
      };

      let provider = new JsonProvider(RULES);

      provider.getRoles('joe').should.deepEqual(expected);
    });

    it('should ignore missing user', function () {
      const expected = {};

      let provider = new JsonProvider(RULES);

      provider.getRoles('missing').should.deepEqual(expected);
    });

    it('should ignore missing roles', function () {
      const expected = {};

      let provider = new JsonProvider(RULES);

      provider.getRoles('jim').should.deepEqual(expected);
    });

    it('should skip if no rule', function () {
      const expected = {};

      let provider = new JsonProvider();
      provider._rules = null;

      provider.getRoles('joe').should.deepEqual(expected);
    });

  });


  describe('Testing getPermissions', function () {
    
    it('should return role permissions', function () {
      const expected = ['create'];

      let provider = new JsonProvider(RULES);

      provider.getPermissions('writer').should.deepEqual(expected);
    });

    it('should ignore missing role', function () {
      const expected = [];

      let provider = new JsonProvider(RULES);

      provider.getPermissions('missingRole').should.deepEqual(expected);
    });

  });


  describe('Testing getAttributes', function () {
    
    it('should return role attributes', function () {
      const expected = ['test'];

      let provider = new JsonProvider(RULES);

      provider.getAttributes('director').should.deepEqual(expected);
    });

    it('should ignore missing attribute', function () {
      const expected = [];

      let provider = new JsonProvider(RULES);

      provider.getAttributes('missingAttribute').should.deepEqual(expected);
    });

  });
  

});