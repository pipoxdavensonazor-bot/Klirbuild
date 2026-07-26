/*
  # Cleanup junk / test product listings

  Removes short nonsense names that pollute the live catalog
  (e.g. Diven, TRY, kEPI) while keeping curated seed products.
*/

DELETE FROM products
WHERE
  length(trim(name)) < 4
  OR lower(trim(name)) IN ('diven', 'try', 'kepi', 'test', 'demo', 'asdf', 'foo', 'bar', 'tmp', 'xxx')
  OR (
    length(trim(name)) <= 6
    AND position(' ' in trim(name)) = 0
    AND name = upper(name)
    AND name ~ '^[A-Za-z]+$'
  );
