/**
 * The database code (`api.ts` and the Firebase library under it) is the
 * biggest piece of the app. It is fetched once, in the background, the first
 * time something asks for it. If that fails, for example with no signal, the
 * next ask tries again.
 */
type Data = typeof import('./api.ts');

let loading: Promise<Data> | null = null;

export function loadData(): Promise<Data> {
  loading ??= import('./api.ts').catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}
