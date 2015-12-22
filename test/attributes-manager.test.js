

describe('Test Attributes Manager', function () {
  const Attributes = require('../lib/attributes-manager');


  describe('Testing default behaviour', function () {
    var attributes;

    beforeEach(function () {
      attributes = new Attributes();
    });

    afterEach(function () {
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

    beforeEach(function () {
      attributes = new Attributes();
    });

    afterEach(function () {
      attributes = undefined;
    });

    it('should add attribute', function () {
      attributes._attributes.should.not.have.ownProperty('addedProperty');

      attributes.set(function addedProperty() {})._attributes.should.have.ownProperty('addedProperty').be.instanceOf(Function);
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

    it('should remove attributes by name', function () {
      function removePropertyByName() {};
      function dummyValidator() {};

      attributes.set(dummyValidator);

      attributes._attributes.should.not.have.ownProperty('removePropertyByName');
      attributes.set(removePropertyByName)._attributes.should.have.ownProperty('removePropertyByName').be.instanceOf(Function);
      attributes.remove('removePropertyByName').should.equal(removePropertyByName);
      attributes._attributes.should.not.have.ownProperty('removePropertyByName');

      attributes._attributes.should.have.ownProperty('dummyValidator').be.instanceOf(Function);
    });

    it('should remove attributes by value', function () {
      function removePropertyByValue() {};
      function dummyValidator() {};

      attributes.set(dummyValidator);

      attributes._attributes.should.not.have.ownProperty('removePropertyByValue');
      attributes.set(removePropertyByValue)._attributes.should.have.ownProperty('removePropertyByValue').be.instanceOf(Function);
      attributes.remove(removePropertyByValue).should.equal(removePropertyByValue);
      attributes._attributes.should.not.have.ownProperty('removePropertyByValue');

      attributes._attributes.should.have.ownProperty('dummyValidator').be.instanceOf(Function);
    });

    it('should fail with invalid attribute type', function () {
      [
        undefined, null, false, true,
        NaN, -1, 0, 1, Infinity,
        /./, new Date(), {}, []
      ].forEach(function (attr) {
        (function () { attributes.remove(attr); }).should.throw('Attribute must be a string or a function');
      });
    });

  });


  describe('Testing validation', function () {
    var attributes;

    beforeEach(function () {
      attributes = new Attributes();
    });

    afterEach(function () {
      attributes = undefined;
    });

    it('should validate', function () {
      const user = 123;
      const role = 'test';
      const params = { foo: 'bar' };
      const validated = 'validated';

      function attributeValidator(u, r, p) {
        user.should.equal(u);
        role.should.equal(r);
        params.should.equal(p);

        return validated;
      }

      attributes.set(attributeValidator);

      attributes.validate('attributeValidator', user, role, params).should.equal(validated);
    });

    it('should fail with invalid type', function () {
      [
        undefined, null, false, true,
        NaN, -1, 0, 1, Infinity,
        /./, new Date(), {}, []
      ].forEach(function (attr) {
        (function () { attributes.validate(attr); }).should.throw('Attribute should be a string');
      });
    });

    it('should fail with empty attribute name', function () {
      (function () { attributes.validate(''); }).should.throw('Attribute name cannot be empty');
    });

    it('should ignore missing attributes', function () {
      attributes.validate('missingAttribute').should.equal(false);
    });

  });


});