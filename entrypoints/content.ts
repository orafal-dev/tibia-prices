const STORAGE_KEY_PRICE_PER_250 = 'tibiaPrices:pricePer250Tc';
const DEFAULT_PRICE_PER_250 = 40;

/** XPath for TC on auction list (overview) – all rows (tr[2], tr[3], …). */
const XPATH_TC_AUCTION_LIST =
  '//*[@id="currentcharactertrades"]/div[5]/div/div/div[4]/table/tbody/tr/td/div[2]/table/tbody/tr[position()>=2]/td/div/table/tbody/tr/td/div/div[2]/div[3]/div[6]/div[2]/b';

/** XPath for TC on specific character auction (details). */
const XPATH_TC_AUCTION_DETAILS =
  '//*[@id="currentcharactertrades"]/div[5]/div/div/div[3]/table/tbody/tr/td/div[2]/table/tbody/tr/td/div/table/tbody/tr/td/div/div[2]/div[3]/div[6]/div[2]/b';

const getPricePer250 = (): Promise<number> =>
  browser.storage.local.get(STORAGE_KEY_PRICE_PER_250).then((v) => {
    const n = v[STORAGE_KEY_PRICE_PER_250];
    return typeof n === 'number' && Number.isFinite(n) ? n : DEFAULT_PRICE_PER_250;
  });

const parseTcFromText = (text: string): number | null => {
  const cleaned = text.replace(/\s/g, '').replace(/,/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
};

const tcToPln = (tc: number, pricePer250: number): number =>
  (tc / 250) * pricePer250;

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

const injectPlnHint = (
  tcElement: Element,
  pln: number,
  pricePer250: number
): void => {
  const existing = tcElement.nextElementSibling;
  if (existing?.classList?.contains('tibia-prices-pln-hint')) {
    existing.remove();
  }
  const span = document.createElement('span');
  span.className = 'tibia-prices-pln-hint';
  span.style.cssText =
    'color:#7cb342;margin-left:0.25em;font-size:0.75em;font-weight:600;white-space:nowrap;';
  span.textContent = `(${pln.toFixed(2)} PLN)`;
  tcElement.parentNode?.insertBefore(span, tcElement.nextSibling);
};

const runConversion = (pricePer250: number): void => {
  const isDetails = document.URL.includes('page=details');
  const xpath = isDetails ? XPATH_TC_AUCTION_DETAILS : XPATH_TC_AUCTION_LIST;
  const nodes = evaluateXPath(document, xpath);

  for (const node of nodes) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as Element;
    const tc = parseTcFromText(el.textContent ?? '');
    if (tc === null || tc <= 0) continue;
    const pln = tcToPln(tc, pricePer250);
    injectPlnHint(el, pln, pricePer250);
  }
};

const runWhenReady = (): void => {
  getPricePer250().then((pricePer250) => {
    runConversion(pricePer250);
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
      const root = document.getElementById('currentcharactertrades');
      if (!root) {
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
      if (document.getElementById('currentcharactertrades')) {
        runWhenReady();
      }
    }, 150);

    const observer = new MutationObserver(() => {
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
      if (STORAGE_KEY_PRICE_PER_250 in changes) {
        runWhenReady();
      }
    });
  },
});
