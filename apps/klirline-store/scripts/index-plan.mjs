/** At most this many seller-less seed rows may be embedded, and only on request. */
export const MAX_SEED_INDEX = 12;

/**
 * @param {string[]} argv
 */
export function resolveIndexPlan(argv) {
  const includeSeeds = argv.includes("--include-seeds");
  const remote = argv.includes("--remote");
  const limit = readLimit(argv);
  if (includeSeeds) {
    const requested = limit ?? MAX_SEED_INDEX;
    return {
      includeSeeds: true,
      remote,
      limit: Math.min(Math.max(requested, 1), MAX_SEED_INDEX),
      publish: false,
      assignSeller: false,
    };
  }
  return {
    includeSeeds: false,
    remote,
    limit: limit === 0 ? null : (limit ?? 500),
    publish: false,
    assignSeller: false,
  };
}

/**
 * @param {string[]} argv
 * @returns {number | null}
 */
function readLimit(argv) {
  const index = argv.indexOf("--limit");
  if (index === -1) return null;
  const value = Number(argv[index + 1]);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("--limit attend un entier ≥ 0 (0 = tout le catalogue publié).");
  }
  return Math.floor(value);
}
