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
      },


      "root": {
         "permissions": ["foo"],
         "inherited": ["base"]
      },
      "base": {
         "permissions": ['foo']
      }

   },

   "users": {
      "john": ["worker"],
      "bill": ["supervisor"],
      "jane": ["director"],

      "admin": ["root"]
   }
});

const attributes = new AttributesManager();
attributes.set('restricted', function (context) {
   // only true if unrestricted above
   const isUnrestricted = context.activeAttributes.indexOf('unrestricted') !== -1;
   const isForcedUnrestricted = context.params.unrestricted;

   return isUnrestricted || isForcedUnrestricted;
});
attributes.set('unrestricted', function (context) {
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
         expect( isNaN(access) ).toBeFalsy();
      });
   });

   it('should allow user john if param is passed', function () {
      return rbac.check('john', 'read', { unrestricted: true }).then(function (access) {
         expect( isNaN(access) ).toBeFalsy();
      });
   });

   it('should return highest permission', function () {
      return rbac.check('admin', 'foo', { unrestricted: true }).then(function (access) {
         expect( access ).toBe(1);
      });

   });

});