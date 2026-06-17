export const STORAGE_KEY_ENABLED_OUTFIT_FILTERS =
  'tibiaPrices:enabledOutfitFilters';

export const getEnabledOutfitFilters = (): Promise<string[]> =>
  browser.storage.local.get(STORAGE_KEY_ENABLED_OUTFIT_FILTERS).then((v) => {
    const raw = v[STORAGE_KEY_ENABLED_OUTFIT_FILTERS];
    if (!Array.isArray(raw)) return [];
    return raw.filter((id): id is string => typeof id === 'string');
  });

export const setEnabledOutfitFilters = (ids: string[]): Promise<void> =>
  browser.storage.local.set({ [STORAGE_KEY_ENABLED_OUTFIT_FILTERS]: ids });
