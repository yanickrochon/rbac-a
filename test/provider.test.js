
describe('Test Provider', function () {

  const Provider = require('../lib/provider');


  it('should throw "Not implemented"', function () {
    var provider = new Provider();

    expect(function () { provider.getRoles(); }).toThrow('Not implemented');
    expect(function () { provider.getPermissions(); }).toThrow('Not implemented');
    expect(function () { provider.getAttributes(); }).toThrow('Not implemented');
  });


});