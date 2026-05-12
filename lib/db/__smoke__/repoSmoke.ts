/**
 * Read-only smoke check for the repository layer.
 *
 * Intentionally non-destructive — calls only reads so it doesn't pollute the
 * device DB. A later iteration can add a separate create/update/delete smoke
 * that uses a `__smoke__` ID prefix and cleans up after itself.
 */

import { CategoriesRepo, SettingsRepo } from '../repositories';

export type RepoSmokeResult = {
  ok: boolean;
  categoryCount: number;
  seededAt: string | null;
  defaultChart: string;
  error?: string;
};

export async function smokeRepositories(): Promise<RepoSmokeResult> {
  try {
    const [cats, settings] = await Promise.all([
      CategoriesRepo.list(),
      SettingsRepo.get(),
    ]);
    return {
      ok: true,
      categoryCount: cats.length,
      seededAt: settings.seededAt,
      defaultChart: settings.defaultChart,
    };
  } catch (e) {
    return {
      ok: false,
      categoryCount: 0,
      seededAt: null,
      defaultChart: '',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
