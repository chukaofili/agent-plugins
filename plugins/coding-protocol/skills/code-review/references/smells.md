# The smell baseline

A fixed set of code smells from Fowler's *Refactoring* (chapter 3) that the
Standards axis checks even when a repo documents nothing.

- **The repo wins.** A documented repo rule always overrides this list.
  Where the repo endorses something below, drop the smell.
- **Always a judgement call.** Each one is a labelled heuristic ("possible
  Feature Envy"), never a hard violation. Skip anything tooling enforces.

Each reads *what it is* → *how to fix it*. Match it against the diff.

- **Mysterious Name:** a function, variable or type whose name doesn't say
  what it does or holds. → Rename it. If no honest name comes, the design is
  murky.
- **Duplicated Code:** the same shape of logic in more than one hunk or file
  of the change. → Extract the shared shape and call it from both.
- **Feature Envy:** a method that uses another object's data more than its
  own. → Move it onto the data it envies.
- **Data Clumps:** the same few fields or parameters keep travelling
  together. → Bundle them into one type and pass that.
- **Primitive Obsession:** a primitive or string standing in for a domain
  concept. → Give the concept its own small type.
- **Repeated Switches:** the same `switch` or `if` cascade on the same type,
  in several places. → Polymorphism, or one map both places share.
- **Shotgun Surgery:** one logical change forces scattered edits across many
  files. → Gather what changes together into one module.
- **Divergent Change:** one file or module edited for several unrelated
  reasons. → Split it so each part changes for one reason.
- **Speculative Generality:** abstractions, parameters or hooks for needs
  the spec doesn't have. → Delete them. Inline back until a real need shows.
- **Message Chains:** long `a.b().c().d()` navigation the caller shouldn't
  depend on. → Hide the walk behind one method on the first object.
- **Middle Man:** a class or function that mostly passes calls on. → Cut it
  and call the real target.
- **Refused Bequest:** a subclass that ignores or overrides most of what it
  inherits. → Drop the inheritance and use composition.

For the words "module", "interface" and "seam" in a finding, use the
vocabulary in `codebase-design`.

---

Adapted from Matt Pocock's `code-review` skill, MIT licence.
