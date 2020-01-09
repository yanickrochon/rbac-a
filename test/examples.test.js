describe('Testing RBAC-A with real examples', function () {
   const RBAC = require('../lib/rbac');
   const JsonProvider = require('../lib/providers/json');
   const AttributesManager = require('../lib/attributes-manager');

   const provider = new JsonProvider({
      "roles": {
         "worker": {
            "permissions": ["read"],
            "attributes": ["restricted"]
         },
         "supervisor": {
            "permissions": ["read", "write"],
            "attributes": ["restricted"]
         },
         "director": {
            "inherited": ["supervisor"],
            "attributes": ["unrestricted"]
         }
      },

      "users": {
         "john": ["worker"],
         "bill": ["supervisor"],
         "jane": ["director"]
      }
   });

   const attributes = new AttributesManager();
   attributes.set('restricted', function () {
      return false;
   });
   attributes.set('unrestricted', function () {
      return true;
   });

   const rbac = new RBAC({ 
      provider: provider,
      attributes: attributes
   });


   it('should not allow user john for read', function () {
      return rbac.check('john', 'read').then(function (access) {
         expect( isNaN(access) ).toBeTruthy();
      });
   });

   it('should not allow bill john for read', function () {
      return rbac.check('bill', 'read').then(function (access) {
         expect( isNaN(access) ).toBeTruthy();
      });
   });

   it('should allow user jane for read', function () {
      return rbac.check('jane', 'read').then(function (access) {
         expect( isNaN(access) ).toBeTruthy();
      });
   });

});