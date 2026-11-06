import { expect, test } from 'vitest';
import { MAX_SEED_INDEX, resolveIndexPlan } from './index-plan.mjs';

test('les seeds restent plafonnés à 12 et ne sont ni publiés ni réassignés', () => {
  const plan = resolveIndexPlan(['--include-seeds', '--limit', '100']);
  expect(plan.includeSeeds).toBe(true);
  expect(plan.limit).toBe(MAX_SEED_INDEX);
  expect(plan.publish).toBe(false);
  expect(plan.assignSeller).toBe(false);
});

test('le catalogue vendeur n’inclut pas les seeds', () => {
  const plan = resolveIndexPlan(['--limit', '0']);
  expect(plan.includeSeeds).toBe(false);
  expect(plan.limit).toBeNull();
  expect(plan.publish).toBe(false);
  expect(plan.assignSeller).toBe(false);
});

test('--remote ne change pas la règle seed', () => {
  const plan = resolveIndexPlan(['--remote', '--include-seeds']);
  expect(plan.remote).toBe(true);
  expect(plan.limit).toBe(MAX_SEED_INDEX);
  expect(plan.publish).toBe(false);
});
