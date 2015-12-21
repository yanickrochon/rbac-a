'use strict';

const EventEmitter = require('promise-events');

const Provider = require('./provider');
const AttributesManager = require('./attributes-manager');


const RBAC = module.exports = class RBAC extends EventEmitter {

  constructor(attributesManager) {
    if (attributesManager && !(attributesManager instanceof AttributesManager)) {
      throw new TypeError('Invalid attributes manager');
    }

    super();

    this._attributes = attributesManager || this._attributes || new AttributesManager();
    this._providers = this._providers || [];
  }


  /**
  Add a roles, permissions and attributes provider

  @param provider {Provider}   an implementation of the Provider interface
  */
  addProvider(provider) {
    if (provider && !(provider instanceof Provider)) {
      throw new TypeError('Invalid provider name');
    }

    this._providers.push(provider);
  }


  /**
  Set an attribute. See AttributesManager for more information.

  @param attribute {function}
  @return {boolean}
  */
  setAttribute(attribute) {
    return this._attributes.set(attribute);
  }


  /**
  Check the user for the given permissions. The method will return
  a Promise resolving if the user has sufficient access to the
  specified permissions, or reject otherwise. Promise resolved or
  rejected values are undefined.

  @param user {mixed}
  @param permissions {string|Array<string>}
  @param params {Object} (optional)
  @return Promise
  */
  check(user, permissions, params) {
    if (!this._providers && !this._providers.length) {
      return Promise.reject();
    }

    // TODO : get list of user roles from all providers
    // TODO : from each role, test against all providers individually
    // TODO : resolve on first match
  }

}

RBAC.prototype._attributes = null;
RBAC.prototype._providers = null;