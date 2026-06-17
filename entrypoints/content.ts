const STORAGE_KEY_PRICE_PER_250_PLN = 'tibiaPrices:pricePer250TcPln';
const STORAGE_KEY_PRICE_PER_250_EUR = 'tibiaPrices:pricePer250TcEur';
const STORAGE_KEY_LEGACY_PLN = 'tibiaPrices:pricePer250Tc';
const DEFAULT_PRICE_PLN = 40;
const DEFAULT_PRICE_EUR = 0;

import {
  CHARACTER_TRADE_ROOT_IDS,
  getActiveCharacterTradeRootId,
  getAuctionDetailsTcXPath,
  getAuctionListRowXPath,
  getTcElementsFromShortAuctionDataValues,
  TC_IN_AUCTION_ROW_XPATH,
} from './lib/auction-dom';

type PricesPer250 = { pln: number; eur: number };

const getPricesPer250 = (): Promise<PricesPer250> =>
  browser.storage.local
    .get([
      STORAGE_KEY_PRICE_PER_250_PLN,
      STORAGE_KEY_PRICE_PER_250_EUR,
      STORAGE_KEY_LEGACY_PLN,
    ])
    .then((v) => {
      const rawPln = v[STORAGE_KEY_PRICE_PER_250_PLN];
      const rawEur = v[STORAGE_KEY_PRICE_PER_250_EUR];
      const legacy = v[STORAGE_KEY_LEGACY_PLN];
      const pln: number =
        typeof rawPln === 'number' && Number.isFinite(rawPln)
          ? rawPln
          : typeof legacy === 'number' && Number.isFinite(legacy)
            ? legacy
            : DEFAULT_PRICE_PLN;
      const eur: number =
        typeof rawEur === 'number' && Number.isFinite(rawEur) && rawEur > 0
          ? rawEur
          : DEFAULT_PRICE_EUR;
      return { pln, eur };
    });

const parseTcFromText = (text: string): number | null => {
  const cleaned = text.replace(/\s/g, '').replace(/,/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
};

const tcToAmount = (tc: number, pricePer250: number): number =>
  (tc / 250) * pricePer250;

const HINT_CLASS = 'tibia-prices-pln-hint';

const formatHintText = (pln: number, eur: number): string =>
  eur > 0
    ? `(${pln.toFixed(2)} PLN / ${eur.toFixed(2)} EUR)`
    : `(${pln.toFixed(2)} PLN)`;

const isOurHintNode = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE &&
  (node as Element).classList.contains(HINT_CLASS);

const shouldReactToMutations = (mutations: MutationRecord[]): boolean => {
  for (const mutation of mutations) {
    if (mutation.type === 'characterData') {
      if (mutation.target.parentElement?.closest(`.${HINT_CLASS}`)) continue;
      return true;
    }

    for (const node of mutation.addedNodes) {
      if (!isOurHintNode(node)) return true;
    }
    for (const node of mutation.removedNodes) {
      if (!isOurHintNode(node)) return true;
    }
  }

  return false;
};

const evaluateXPath = (doc: Document, xpath: string): Node[] => {
  const result = doc.evaluate(
    xpath,
    doc,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  const nodes: Node[] = [];
  for (let i = 0; i < result.snapshotLength; i++) {
    const node = result.snapshotItem(i);
    if (node) nodes.push(node);
  }
  return nodes;
};

const injectPriceHint = (
  tcElement: Element,
  tc: number,
  pln: number,
  eur: number
): void => {
  const hintText = formatHintText(pln, eur);
  const existing = tcElement.nextElementSibling;

  if (existing?.classList.contains(HINT_CLASS)) {
    const lastTc = existing.getAttribute('data-tibia-prices-tc');
    const lastHint = existing.getAttribute('data-tibia-prices-hint');
    if (lastTc === String(tc) && lastHint === hintText) return;

    existing.textContent = hintText;
    existing.setAttribute('data-tibia-prices-tc', String(tc));
    existing.setAttribute('data-tibia-prices-hint', hintText);
    return;
  }

  const span = document.createElement('span');
  span.className = HINT_CLASS;
  span.setAttribute('data-tibia-prices-tc', String(tc));
  span.setAttribute('data-tibia-prices-hint', hintText);
  span.style.cssText =
    'color:#8b6914;margin-left:0.25em;font-size:0.75em;font-weight:600;white-space:nowrap;';
  span.textContent = hintText;
  tcElement.parentNode?.insertBefore(span, tcElement.nextSibling);
};

let lastConversionFingerprint = '';
let lastConversionPricesKey = '';

const getTcElementsOnAuctionList = (): Element[] => {
  const tcElements: Element[] = [];

  for (const rootId of Object.values(CHARACTER_TRADE_ROOT_IDS)) {
    const rows = evaluateXPath(document, getAuctionListRowXPath(rootId));
    for (const row of rows) {
      if (row.nodeType !== Node.ELEMENT_NODE) continue;
      const result = document.evaluate(
        TC_IN_AUCTION_ROW_XPATH,
        row,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      for (let i = 0; i < result.snapshotLength; i++) {
        const node = result.snapshotItem(i);
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          tcElements.push(node as Element);
        }
      }
    }
  }

  return tcElements;
};

const getTcElementsForConversion = (): Element[] => {
  const isDetails = document.URL.includes('page=details');
  const rootId = getActiveCharacterTradeRootId();
  const fromShortAuction = getTcElementsFromShortAuctionDataValues();

  if (isDetails && rootId) {
    const fromXPath = evaluateXPath(
      document,
      getAuctionDetailsTcXPath(rootId)
    ) as Element[];
    return [...new Set([...fromXPath, ...fromShortAuction])];
  }

  const fromRows = getTcElementsOnAuctionList();
  return [...new Set([...fromRows, ...fromShortAuction])];
};

const runConversion = (prices: PricesPer250): void => {
  const nodes = getTcElementsForConversion();
  const fingerprint = nodes
    .map((node) => (node.textContent ?? '').trim())
    .join('|');
  const pricesKey = `${prices.pln}:${prices.eur}`;

  if (
    fingerprint === lastConversionFingerprint &&
    pricesKey === lastConversionPricesKey
  ) {
    return;
  }

  lastConversionFingerprint = fingerprint;
  lastConversionPricesKey = pricesKey;

  for (const node of nodes) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as Element;
    const tc = parseTcFromText(el.textContent ?? '');
    if (tc === null || tc <= 0) continue;
    const pln = tcToAmount(tc, prices.pln);
    const eur = prices.eur > 0 ? tcToAmount(tc, prices.eur) : 0;
    injectPriceHint(el, tc, pln, eur);
  }
};

const runWhenReady = (): void => {
  getPricesPer250().then((prices) => {
    runConversion(prices);
  });
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
  main() {
    const run = (): void => {
      if (!getActiveCharacterTradeRootId()) {
        setTimeout(run, 300);
        return;
      }
      runWhenReady();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }

    const debouncedRunWhenReady = debounce(() => {
      if (getActiveCharacterTradeRootId()) {
        runWhenReady();
      }
    }, 150);

    const observer = new MutationObserver((mutations) => {
      if (!shouldReactToMutations(mutations)) return;
      debouncedRunWhenReady();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true,
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (
        STORAGE_KEY_PRICE_PER_250_PLN in changes ||
        STORAGE_KEY_PRICE_PER_250_EUR in changes
      ) {
        lastConversionPricesKey = '';
        runWhenReady();
      }
    });
  },
});
