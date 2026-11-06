import { expect, test } from 'vitest';
import {
  CLIP_DIM,
  CLIP_MEAN,
  CLIP_SIZE,
  CLIP_STD,
  coerceEmbedding,
  l2normalize,
  rgbaToClipTensor,
} from '../supabase/functions/_shared/clip-math.mjs';

test('un aplat rouge devient un tenseur CLIP 1x3x224x224', () => {
  const pixels = 2 * 2;
  const rgba = new Uint8Array(pixels * 4);
  for (let i = 0; i < pixels; i += 1) {
    rgba[i * 4] = 255;
    rgba[i * 4 + 3] = 255;
  }
  const tensor = rgbaToClipTensor(rgba, 2, 2, 4);
  expect(tensor.length).toBe(3 * CLIP_SIZE * CLIP_SIZE);
  const expectedR = (1 - CLIP_MEAN[0]) / CLIP_STD[0];
  const expectedG = (0 - CLIP_MEAN[1]) / CLIP_STD[1];
  expect(Math.abs(tensor[0] - expectedR)).toBeLessThan(1e-5);
  expect(Math.abs(tensor[CLIP_SIZE * CLIP_SIZE] - expectedG)).toBeLessThan(1e-5);
  expect(tensor[0]).toBeGreaterThan(tensor[CLIP_SIZE * CLIP_SIZE]);
});

test('coerceEmbedding normalise un vecteur de 512', () => {
  const raw = Array.from({ length: CLIP_DIM }, (_, i) => (i === 0 ? 3 : 0));
  const vec = coerceEmbedding([raw]);
  expect(vec).toBeTruthy();
  expect(vec.length).toBe(CLIP_DIM);
  const norm = Math.hypot(...vec);
  expect(Math.abs(norm - 1)).toBeLessThan(1e-6);
  expect(Math.abs(vec[0] - 1)).toBeLessThan(1e-6);
  expect(coerceEmbedding([1, 2, 3])).toBeNull();
  expect(l2normalize([0, 0, 0])).toHaveLength(3);
});
