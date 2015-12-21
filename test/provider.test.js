
describe('Test Provider', function () {

  const Provider = require('../lib/provider');


  it('should throw "Not implemented"', function () {
    var provider = new Provider();

    (function () { provider.getRoles(); }).should.throw('Not implemented');
    (function () { provider.getPermissions(); }).should.throw('Not implemented');
    (function () { provider.getAttributes(); }).should.throw('Not implemented');
  });


});