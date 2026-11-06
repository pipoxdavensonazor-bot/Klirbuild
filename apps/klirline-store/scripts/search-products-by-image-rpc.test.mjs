import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../supabase/migrations/20261106120000_visual_search_clip.sql",
);

const sql = readFileSync(migrationPath, "utf8");

function searchFunctionSql() {
  const start = sql.indexOf("CREATE OR REPLACE FUNCTION public.search_products_by_image");
  const end = sql.indexOf("COMMENT ON FUNCTION public.search_products_by_image");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end);
}

test("search_products_by_image reste SECURITY INVOKER et SQL stable", () => {
  const fn = searchFunctionSql();
  expect(fn).toMatch(/LANGUAGE sql/);
  expect(fn).toMatch(/STABLE/);
  expect(fn).toMatch(/SECURITY INVOKER/);
  expect(fn).not.toMatch(/SECURITY DEFINER/);
  expect(fn).not.toMatch(/\bEXECUTE\b/);
});

test("le shape expose sponsored et category_name, pas un alias sponsor", () => {
  const fn = searchFunctionSql();
  expect(fn).toMatch(/category_name text/);
  expect(fn).toMatch(/sponsored boolean/);
  expect(fn).toMatch(/c\.name AS category_name/);
  expect(fn).toMatch(/p\.sponsored/);
  expect(fn).not.toMatch(/\bsponsor boolean\b/);
  expect(fn).toMatch(/similarity double precision/);
});

test("LIMIT précède la lecture des colonnes toastées", () => {
  const fn = searchFunctionSql();
  const limitAt = fn.indexOf("LIMIT LEAST");
  const imagesAt = fn.indexOf("p.images");
  const descriptionAt = fn.indexOf("p.description");
  const aboutAt = fn.indexOf("p.about_items");
  const variantsAt = fn.indexOf("p.variants");
  expect(limitAt).toBeGreaterThan(-1);
  for (const at of [imagesAt, descriptionAt, aboutAt, variantsAt]) {
    expect(at).toBeGreaterThan(limitAt);
  }
  expect(fn).toMatch(/AS MATERIALIZED/);
  const narrow = fn.slice(0, limitAt);
  expect(narrow).not.toMatch(/p\.images/);
  expect(narrow).not.toMatch(/p\.description/);
  expect(narrow).not.toMatch(/p\.about_items/);
  expect(narrow).not.toMatch(/p\.variants/);
  expect(narrow).toMatch(/p\.seller_id IS NOT NULL/);
  expect(narrow).toMatch(/p\.published = true/);
});

test("les grants execute ne changent pas et le filtre publié reste après la jointure", () => {
  const fn = searchFunctionSql();
  const tail = fn.slice(fn.indexOf("FROM limited"));
  expect(tail).toMatch(/p\.seller_id IS NOT NULL/);
  expect(tail).toMatch(/p\.published = true/);
  expect(sql).toMatch(
    /GRANT EXECUTE ON FUNCTION public\.search_products_by_image\(vector, integer\) TO anon, authenticated;/,
  );
  expect(sql).toMatch(
    /GRANT EXECUTE ON FUNCTION public\.search_products_by_image\(vector, integer\) TO service_role;/,
  );
  expect(sql).not.toMatch(
    /GRANT EXECUTE ON FUNCTION public\.search_products_by_image\(vector, integer\) TO PUBLIC/,
  );
});
