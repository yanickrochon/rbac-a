
const defaultOptions = {
  ignoreMissingAttributes: true
};


/**
Attributes Manager

This class encapsulate attributes definition and validation.

Usage

  var roleValid = attributesManager.validate(attribute, user, role, params);

*/
class AttributesManager {

  constructor(options) {
    this._attributes = this._attributes || {};
    this._options = Object.assign({}, defaultOptions, options || {});
  }

  /**
  Define an attribute. The returned value is self for chaining.

  @param attribute {function}
  @return {AttributesManager}
  */
  set(attribute, handler) {
    if (typeof attribute === 'function') {
      handler = attribute;
      attribute = handler.name;
    }

    if (typeof handler !== 'function') {
      throw new TypeError('Attribute handler should be a function');
    } else if (!attribute) {
      throw new TypeError('Attribute cannot be anonymous or empty');
    }

    this._attributes[attribute] = handler;
    return this;
  }

  /**
  Undefine an attribute, by name or function and return removed
  attribute function if one was found.

  @param attribute {string|function}
  @return {boolean}
  */
  remove(attribute) {
    let removed;

    if (typeof attribute === 'function') {
      removed = Object.keys(this._attributes).reduce((found, name) => {
        if (this._attributes[name] === attribute) {
          found = this._attributes[name];
          delete this._attributes[name];
        }

        return found;
      }, removed);
    } else if (typeof attribute === 'string' && attribute in this._attributes) {
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
  @param context {Object}
  @return {any}
  */
  validate(attribute, context) {
    if (typeof attribute !== 'string') {
      throw new TypeError('Attribute should be a string');
    } else if (!attribute) {
      throw new TypeError('Attribute name cannot be empty');
    } else if (!this._attributes[attribute]) {
      if (this._options.ignoreMissingAttributes) {
        return false;
      } else {
        throw new TypeError('Unknown attribute : ' + attribute);
      }
    }

    return this._attributes[attribute](context);
  }

}


AttributesManager.prototype._attributes = null;


module.exports = AttributesManager;