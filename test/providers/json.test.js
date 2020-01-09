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
      'root': ['admin'],
      //'bob': ['director'],
      'joe': ['director', 'reader'],
      'jim': ['missingRole']
      //'guest': ['guest']
    }
  };


  it('should be an instance of Provider', function () {
    const provider = new JsonProvider();

    expect( provider ).toBeInstanceOf(Provider);
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

      expect( provider.getRoles('joe') ).toEqual(expected);
    });

    it('should ignore missing user', function () {
      const expected = {};

      let provider = new JsonProvider(RULES);

      expect( provider.getRoles('missing') ).toEqual(expected);
    });

    it('should ignore missing roles', function () {
      const expected = {};

      let provider = new JsonProvider(RULES);

      expect( provider.getRoles('jim') ).toEqual(expected);
    });

    it('should skip if no rule', function () {
      const expected = {};

      let provider = new JsonProvider();
      provider._rules = null;

      expect( provider.getRoles('joe') ).toEqual(expected);
    });

  });


  describe('Testing getPermissions', function () {
    
    it('should return role permissions', function () {
      const expected = ['create'];

      let provider = new JsonProvider(RULES);

      expect( provider.getPermissions('writer') ).toEqual(expected);
    });

    it('should ignore missing role', function () {
      const expected = [];

      let provider = new JsonProvider(RULES);

      expect( provider.getPermissions('missingRole') ).toEqual(expected);
    });

  });


  describe('Testing getAttributes', function () {
    
    it('should return role attributes', function () {
      const expected = ['test'];

      let provider = new JsonProvider(RULES);

      expect( provider.getAttributes('director') ).toEqual(expected);
    });

    it('should ignore missing attribute', function () {
      const expected = [];

      let provider = new JsonProvider(RULES);

      expect( provider.getAttributes('missingAttribute') ).toEqual(expected);
    });

  });
  

});