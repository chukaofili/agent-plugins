# When to mock

Mock only what you don't own and can't run locally, such as a third-party
API: payments, email, SMS. That is the same line `testing` draws for
integration tests.

Don't mock:

- your own modules, classes or functions
- internal collaborators
- a database, queue or filesystem you can run in the test suite. Use a real
  one, or a local stand-in such as a test database or an in-memory
  filesystem.

Time and randomness aren't mocked so much as injected: pass a clock or a
seed in (see `testing` on the wall clock).

## Designing for it

**Pass dependencies in, don't create them.**

```typescript
// Easy to substitute
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to substitute
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**Prefer one function per external operation over a generic fetcher.**

```typescript
// Each operation is substituted on its own
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch("/orders", { method: "POST", body: data }),
};

// The mock needs conditional logic to fake it
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

Then each mock returns one shape, test setup has no branches, and you can see
which operations a test exercises.

---

Adapted from Matt Pocock's `tdd` skill, MIT licence.
