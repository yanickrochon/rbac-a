

describe('Test Attributes Manager', function () {
  const Attributes = require('../lib/attributes-manager');


  describe('Testing default behaviour', function () {
    var attributes;

    before(function () {
      attributes = new Attributes();
    });

    after(function () {
      attributes = undefined;
    });

    it('should initialize with empty attributes', function () {
      attributes._attributes.should.eql({});
    });

    it('should validate to false', function () {
      attributes.validate('test').should.be.false;
    });

  });


  describe('Testing adding / removing attributes', function () {
    var attributes;

    before(function () {
      attributes = new Attributes();
    });

    after(function () {
      attributes = undefined;
    });

    it('should add attribute', function () {
      attributes._attributes.should.not.have.ownProperty('test');

      attributes.set(function test() {})._attributes.should.have.ownProperty('test').be.instanceOf(Function);
    });

    it('should fail with invalid attribute type', function () {
      [
        undefined, null, false, true,
        NaN, -1, 0, 1, Infinity, '', 'Hello',
        /./, new Date(), {}, []
      ].forEach(function (attr) {
        (function () { attributes.set(attr); }).should.throw('Attribute should be a function');
      });
    });

    it('should fail with anonymous attributes', function () {
      (function () { attributes.set(function () {}); }).should.throw('Attribute cannot be anonymous');
    });

    it('should remove attributes by name');

    it('should remove attributes by value');

    it('should fail with invalid attribute type');

  });


  describe('Testing validation', function () {
    var attributes;

    before(function () {
      attributes = new Attributes();
    });

    after(function () {
      attributes = undefined;
    });

    it('should validate');

    it('should fail with invalid type');

    it('should fail with empty attribute name');

    it('should ignore missing attributes');

  });


});