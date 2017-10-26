# partial-promise-proxy

Combines a partially defined object with a function that returns a promise of the rest of the partial object. Any properties defined in the initial partial object will be available immediately, while other properties will wait for the resolution of the promise. (credit goes to [@brysgo](https://github.com/brysgo) for the idea)

## Usage
---
```typescript
function partialPromiseProxy(partialObject, partialFunc)
```
### Arguments
- `partialObject`: a javascript object that consists of the properties that should be available immediately
- `partialFunc`: a function that returns a promise for the remaining properties of the object
## Why would you ever want to do this?
---
When building out a GraphQL API that wraps a set of legacy services, its not uncommon to end up with a scenario that looks like this:
```typescript
const Address = new GraphQLObjectType({
  name: "address",
  fields: {
    country: { type: GraphQLString },
    city: { type: GraphQLString },
    streetName: { type: GraphQLString },
    streetNumber: { type: GraphQLString }
  }
});

const Customer = new GraphQLObjectType({
  name: "customer",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    firstName: { type: GraphQLString },
    lastName: { type: GraphQLString },
    address: { 
      type: Address,
      resolve: (customer, _, context) => {
        const { legacyAddressService } = context;
        const { id } = customer;
        return legacyAddressService.getAddress(id);
      } 
    }
  },
});

const customerSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'query',
    fields: {
      GetCustomer: {
        type: Customer,
        resolve: (_, args, context) => {
          const { legacyCustomerService } = context;
          const { id } = args;
          return legacyCustomerService.getCustomer(id);
        }
      }
    }
  })
});
```
In this instance, there is a `Customer` type with a nested `Address` type, where the resolution of both rely on different back-end systems. When resolving a query against `Customer` and `Address`, GraphQL will execute the call to the `legacyCustomerService`, but wait on the response before calling the `legacyAddressService`. Both legacy services only require the customer `id` argument passed in to `getCustomer` on the root query, so why can't we call both without waiting?

Because GraphQL can handle resolvers that return either the value or a promise of the value, we can create a partial proxy to the requested type where some fields resolve to their values, while some resolve to a promise which GraphQL will wait for. 

Changing the code above to use a `partial-promise-proxy` allows both legacy service calls to execute without waiting:
```typescript
const Address = new GraphQLObjectType({
  name: "address",
  fields: {
    country: { type: GraphQLString },
    city: { type: GraphQLString },
    streetName: { type: GraphQLString },
    streetNumber: { type: GraphQLString }
  }
});

const Customer = new GraphQLObjectType({
  name: "customer",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    firstName: { type: GraphQLString },
    lastName: { type: GraphQLString },
    address: { 
      type: Address,
      resolve: (customer, _, context) => {
        const { legacyAddressService } = context;
        const { id } = customer;
        return legacyAddressService.getAddress(id);
      } 
    }
  },
});

const customerSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'query',
    fields: {
      GetCustomer: {
        type: Customer,
        resolve: (_, args, context) => {
          const { legacyCustomerService } = context;
          const { id } = args;
          return partialPromiseProxy({ id }, () => legacyCustomerService.getCustomer(id)); // <-- wrap the promise in a partial proxy
        }
      }
    }
  })
});
```

Passing in `{ id }` to the partialPromiseProxy creates a proxy object where `id` will be available immediately, while any other properties that are accessed will return a promise that GraphQL will wait to resolve. 