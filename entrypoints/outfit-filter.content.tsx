import React from 'react';
import ReactDOM from 'react-dom/client';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createIntegratedUi } from 'wxt/utils/content-script-ui/integrated';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { applyOutfitFilter } from './lib/auction-outfits';
import {
  STORAGE_KEY_ENABLED_OUTFIT_FILTERS,
  getEnabledOutfitFilters,
} from './lib/outfit-storage';
import OutfitFilter from './OutfitFilter';

const OUTFIT_FILTER_WRAPPER_ID = 'tibia-prices-outfit-filter-wrapper';

const isAuctionListPage = (): boolean => {
  const url = new URL(document.URL);
  return (
    url.pathname.includes('charactertrade') &&
    url.searchParams.get('subtopic') === 'currentcharactertrades' &&
    url.searchParams.get('page') !== 'details'
  );
};

const getAuctionRoot = (): Element | null =>
  document.getElementById('currentcharactertrades');

const evaluateXPath = (doc: Document, xpath: string): Element[] => {
  const result = doc.evaluate(
    xpath,
    doc,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  const nodes: Element[] = [];
  for (let i = 0; i < result.snapshotLength; i++) {
    const node = result.snapshotItem(i);
    if (node && node.nodeType === Node.ELEMENT_NODE) nodes.push(node as Element);
  }
  return nodes;
};

/** Parent of the auction results block (same layout as auction row XPath). */
const XPATH_LIST_MOUNT_CONTAINER =
  '//*[@id="currentcharactertrades"]/div[5]/div/div';

const getListMountContainer = (): Element | null => {
  const nodes = evaluateXPath(document, XPATH_LIST_MOUNT_CONTAINER);
  return nodes[0] ?? getAuctionRoot();
};

const getInsertTarget = (): Element | null => {
  const container = getListMountContainer();
  if (!container) return null;

  let wrapper = document.getElementById(OUTFIT_FILTER_WRAPPER_ID);
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = OUTFIT_FILTER_WRAPPER_ID;
    container.insertBefore(wrapper, container.firstChild);
  }
  return wrapper;
};

const runOutfitFilter = (ctx: ContentScriptContext): void => {
  if (!isAuctionListPage()) return;
  if (document.getElementById('tibia-prices-outfit-filter')) return;

  const anchorElement = getInsertTarget();
  if (!anchorElement) return;

  const handleFilterChange = (enabledIds: string[]): void => {
    applyOutfitFilter(enabledIds);
  };

  const ui = createIntegratedUi(ctx, {
    position: 'inline',
    anchor: () => anchorElement,
    append: 'first',
    onMount: (wrapper) => {
      const root = ReactDOM.createRoot(wrapper);
      root.render(<OutfitFilter onFilterChange={handleFilterChange} />);
      return root;
    },
    onRemove: (root) => {
      root?.unmount();
    },
  });

  ui.mount();
};

const debounce = (fn: () => void, ms: number): (() => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn();
    }, ms);
  };
};

export default defineContentScript({
  matches: ['*://www.tibia.com/charactertrade/*'],
  main(ctx) {
    const applyStoredFilter = (): void => {
      if (!isAuctionListPage()) return;
      getEnabledOutfitFilters().then(applyOutfitFilter);
    };

    const run = (): void => {
      if (!getAuctionRoot()) {
        ctx.setTimeout(run, 300);
        return;
      }
      if (isAuctionListPage()) {
        runOutfitFilter(ctx);
        applyStoredFilter();
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }

    const debouncedApply = debounce(applyStoredFilter, 150);

    const observer = new MutationObserver(() => {
      if (document.getElementById('currentcharactertrades')) {
        debouncedApply();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (STORAGE_KEY_ENABLED_OUTFIT_FILTERS in changes) {
        applyStoredFilter();
      }
    });
  },
});
