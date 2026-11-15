# Good and bad tests

## Good: behaviour through the interface

```typescript
test("user can check out with a valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

- It tests behaviour a caller cares about.
- It uses the public interface only.
- It survives internal refactors.
- Its name says what, not how.
- It makes one logical assertion.

## Bad: coupled to the implementation

```typescript
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

Red flags:

- mocking internal collaborators
- testing private methods
- asserting on call counts or order
- breaking on a refactor that changed no behaviour
- a name that describes how, not what
- checking through a side channel instead of the interface

## Bad: checking through a side channel

```typescript
// Bypasses the interface
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// Through the interface
test("createUser makes the user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

Both can run against a real database. The second one checks the guarantee a
caller relies on, so it survives a change of schema.

## Bad: tautological

```typescript
// The expected value is computed the way the code computes it
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// The expected value is an independent literal
test("calculateTotal sums line items", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```

---

Adapted from Matt Pocock's `tdd` skill, MIT licence.
