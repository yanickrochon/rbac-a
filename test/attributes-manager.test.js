

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
      expect( attributes._attributes ).toEqual({});
    });

    it('should validate to false', function () {
      expect( attributes.validate('test') ).toBeFalsy();
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
      expect( attributes._attributes ).not.toHaveProperty('addedProperty');

      expect( attributes.set(function addedProperty() {})._attributes ).toHaveProperty('addedProperty');
      expect( attributes._attributes.addedProperty ).toBeInstanceOf(Function);

    });

    it('should fail with invalid attribute type', function () {
      [
        undefined, null, false, true,
        NaN, -1, 0, 1, Infinity, '', 'Hello',
        /./, new Date(), {}, []
      ].forEach(function (attr) {
        expect(function () { attributes.set(attr); }).toThrow('Attribute handler should be a function');
      });
    });

    it('should fail with anonymous attributes', function () {
      expect(function () { attributes.set(function () {}); }).toThrow('Attribute cannot be anonymous or empty');
    });

    it('should remove attributes by name', function () {
      function removePropertyByName() {};
      function dummyValidator() {};

      attributes.set(dummyValidator);

      expect( attributes._attributes ).not.toHaveProperty('removePropertyByName');
      expect( attributes.set(removePropertyByName)._attributes ).toHaveProperty('removePropertyByName' );
      expect( attributes._attributes.removePropertyByName ).toBeInstanceOf(Function);
      expect( attributes.remove('removePropertyByName') ).toEqual(removePropertyByName);
      expect( attributes._attributes ).not.toHaveProperty('removePropertyByName');

      expect( attributes._attributes ).toHaveProperty('dummyValidator');
      expect( attributes._attributes.dummyValidator ).toBeInstanceOf(Function);
    });

    it('should remove attributes by value', function () {
      function removePropertyByValue() {};
      function dummyValidator() {};

      attributes.set(dummyValidator);

      expect( attributes._attributes ).not.toHaveProperty('removePropertyByValue');
      expect( attributes.set(removePropertyByValue)._attributes ).toHaveProperty('removePropertyByValue');
      expect( attributes._attributes.removePropertyByValue ).toBeInstanceOf(Function);
      expect( attributes.remove(removePropertyByValue) ).toEqual(removePropertyByValue);
      expect( attributes._attributes ).not.toHaveProperty('removePropertyByValue');

      expect( attributes._attributes ).toHaveProperty('dummyValidator');
      expect( attributes._attributes.dummyValidator ).toBeInstanceOf(Function);
    });

    it('should fail with invalid attribute type', function () {
      [
        undefined, null, false, true,
        NaN, -1, 0, 1, Infinity,
        /./, new Date(), {}, []
      ].forEach(function (attr) {
        expect(function () { attributes.remove(attr); }).toThrow('Attribute must be a string or a function');
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

      const context = {
        user: user,
        role: role,
        params: params
      };

      const validated = 'validated';

      function attributeValidator(context) {
        expect( user ).toEqual(context.user);
        expect( role ).toEqual(context.role);
        expect( params ).toEqual(context.params);

        return validated;
      }

      attributes.set(attributeValidator);

      expect( attributes.validate('attributeValidator', context) ).toEqual(validated);
    });

    it('should fail with invalid type', function () {
      [
        undefined, null, false, true,
        NaN, -1, 0, 1, Infinity,
        /./, new Date(), {}, []
      ].forEach(function (attr) {
        expect(function () { attributes.validate(attr); }).toThrow('Attribute should be a string');
      });
    });

    it('should fail with empty attribute name', function () {
      expect(function () { attributes.validate(''); }).toThrow('Attribute name cannot be empty');
    });

    it('should ignore missing attributes', function () {
      attributes._options.ignoreMissingAttributes = true;

      expect( attributes.validate('missingAttribute') ).toEqual(false);
    });

    it('should throw on missing attributes', function () {
      attributes._options.ignoreMissingAttributes = false;

      expect(function () { attributes.validate('missingAttribute'); }).toThrow('Unknown attribute : missingAttribute');
    });

  });


});