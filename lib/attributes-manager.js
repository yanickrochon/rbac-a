'use strict';

/**
Attributes Manager

This class encapsulate attributes definition and validation.

Usage

  var roleValid = attributesManager.validate(attribute, user, role, params);

*/
const AttributesManager = module.exports = class AttributesManager {

  constructor() {
    this._attributes = this._attributes || {};
  }

  /**
  Define an attribute. The returned value is self for chaining.

  @param attribute {function}
  @return {AttributesManager}
  */
  set(attribute) {
    if (typeof attribute !== 'function') {
      throw new TypeError('Attribute should be a function');
    } else if (!attribute.name) {
      throw new TypeError('Attribute cannot be anonymous');
    }

    this._attributes[attribute.name] = attribute;
    return this;
  }

  /**
  Undefine an attribute, by name or function and return removed
  attribute function if one was found.

  @param attribute {string|function}
  @return {boolean}
  */
  remove(attribute) {
    var removed;

    if (typeof attribute === 'function') {
      removed = Object.keys(this._attributes).reduce((found, name) => {
        if (this._attributes[name] === attribute) {
          found = this._attributes[name];
          delete this._attributes[name];
        }

        return found;
      }, removed);
    } else if (typeof attribute === 'string') {
      removed = this._attributes[attribute];
      delete this._attributes[attribute];
    } else {
      throw new TypeError('Attribute must be a string or a function');
    }

    return removed;
  }


  /**
  Validate the attribute with the specified user, role and parameters.
  The method will return a truthy value if the attribute valid, or a
  falsy otherwise.

  The method may also return a promise resolivng to the expected returne
  value, or reject. A rejected promise should be considered falsy.

  If the specified attribute does not exist, false is returned.

  @param attribute {string}
  @param user {mixed}
  @param role {string}
  @param params {Object}
  @return
  */
  validate(attribute, user, role, params) {
    if (typeof attribute !== 'string') {
      throw new TypeError('Invalid attribute name');
    } else if (!attribute) {
      throw new TypeError('Missing attribute name');
    } else if (!this._attributes[attribute]) {
      //throw new TypeError('Unknown attribute : ' + attribute);
      return false;
    }

    return this._attributes[attribute](user, role, params);
  }

}


AttributesManager.prototype._attributes = null;