

describe('Test Attributes Manager', function () {
  const Attributes = require('../lib/attributes-manager');


  describe('Testing default behaviour', function () {
    var attributes;

    before(function () {
      attributes = new Attributes();
    });

    after(function () {
      attributes = undefined;
    })

    it('should initialize with empty attributes', function () {
      attributes._attributes.should.eql({});
    });

    it('should validate to false', function () {
      attributes.validate('test').should.be.false;
    })

  });


  describe('Testing adding / removing attributes', function () {
    var attributes;

    before(function () {
      attributes = new Attributes();
    });

    after(function () {
      attributes = undefined;
    })

    it('should add attribute', function () {
      attributes._attributes.should.not.have.ownProperty('test');

      attributes.set(function test() {})._attributes.should.have.ownProperty('test').be.instanceOf(Function);
    })

  });


})