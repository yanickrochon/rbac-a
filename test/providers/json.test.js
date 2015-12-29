

describe('Test JSON provider', function () {

  const Provider = require('../../lib/provider');
  const JsonProvider = require('../../lib/providers/json');


  it('should be an instance of Provider', function () {
    const provider = new JsonProvider();

    provider.should.be.instanceOf(Provider);
  });


  describe('Testing getRoles', function () {

    it('should return simple role');

    it('should return all roles');

    it('should return roles recursively');

    it('should ignore missing user');

    it('should ignore missing roles');

  });


  describe('Testing getPermissions', function () {
    
    it('should return role permissions');

    it('should ignore missing role');

  });


  describe('Testing getAttributes', function () {
    
    it('should return role attributes');

    it('should ignore missing role');

  });
  

});