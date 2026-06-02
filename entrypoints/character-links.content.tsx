import React from 'react';
import ReactDOM from 'react-dom/client';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createIntegratedUi } from 'wxt/utils/content-script-ui/integrated';
import { defineContentScript } from 'wxt/utils/define-content-script';
import CharacterLinks from './CharacterLinks';

const TIBIATIME_BASE = 'https://tibiatime.app/characters/';
const GUILDSTATS_BASE = 'https://guildstats.eu/character';
const CHAR_BAZAAR_BASE =
  'https://www.tibia.com/charactertrade/?subtopic=currentcharactertrades';

/** XPath to the "Name:" row in character page (first row of the profile table). */
const XPATH_CHARACTER_NAME_ROW =
  '//*[@id="characters"]/div[5]/div/div/div[1]/table/tbody/tr/td/div[2]/table/tbody/tr/td/div/table/tbody/tr[1]';

const isAuctionDetailsPage = (): boolean => {
  const url = new URL(document.URL);
  return (
    url.pathname.includes('charactertrade') &&
    url.searchParams.get('subtopic') === 'currentcharactertrades' &&
    url.searchParams.get('page') === 'details'
  );
};

const getCharacterNameFromUrl = (): string | null => {
  const params = new URL(document.URL).searchParams;
  const name = params.get('name');
  if (!name || !name.trim()) return null;
  return name.trim();
};

const evaluateXPath = (doc: Document, xpath: string, context?: Node): Node[] => {
  const contextNode = context ?? doc;
  const result = doc.evaluate(
    xpath,
    contextNode,
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

/** Get character name from page HTML when URL has no name param (e.g. subtopic=characters). */
const getCharacterNameFromPage = (): string | null => {
  const url = new URL(document.URL);
  if (url.searchParams.get('subtopic') !== 'characters') return null;
  const nodes = evaluateXPath(document, XPATH_CHARACTER_NAME_ROW);
  const row = nodes[0];
  if (!row || row.nodeType !== Node.ELEMENT_NODE) return null;
  const cells = (row as Element).querySelectorAll('td');
  const nameCell = cells[1];
  if (!nameCell) return null;
  const name = nameCell.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  return name.length > 0 ? name : null;
};

/** XPath to character name on auction details (full document). */
const XPATH_AUCTION_CHARACTER_NAME =
  '//*[@id="currentcharactertrades"]/div[5]/div/div/div[3]/table/tbody/tr/td/div[2]/table/tbody/tr/td/div/table/tbody/tr/td/div/div[1]/div[2]';

/** Relative XPath for character name inside auction root (any element with that class). */
const XPATH_AUCTION_NAME_RELATIVE =
  './/*[contains(@class,"AuctionCharacterName") or contains(@class,"CharacterName")]';

/** XPath to the container where quick links are mounted as first child (auction details). */
const XPATH_AUCTION_MOUNT_CONTAINER =
  '//*[@id="currentcharactertrades"]/div[5]/div/div';

const getAuctionRoot = (): Element | null =>
  document.getElementById('currentcharactertrades');

const getAuctionMountContainer = (): Element | null => {
  const nodes = evaluateXPath(document, XPATH_AUCTION_MOUNT_CONTAINER);
  const node = nodes[0];
  return node && node.nodeType === Node.ELEMENT_NODE ? (node as Element) : null;
};

/** Get character name from auction details page; all lookups scoped to auction root when present. */
const getCharacterNameFromAuctionDetails = (): string | null => {
  if (!isAuctionDetailsPage()) return null;
  const root = getAuctionRoot();
  const searchIn = root ?? document;
  const byClass =
    searchIn.querySelector?.('.AuctionCharacterName') ??
    searchIn.querySelector?.('[class*="AuctionCharacterName"]');
  let el: Element | undefined = byClass ?? undefined;
  if (!el && root) {
    const relativeNodes = evaluateXPath(
      document,
      XPATH_AUCTION_NAME_RELATIVE,
      root
    );
    el = relativeNodes[0] as Element | undefined;
  }
  if (!el)
    el = evaluateXPath(document, XPATH_AUCTION_CHARACTER_NAME)[0] as
      | Element
      | undefined;
  const name = el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  return name.length > 0 ? name : null;
};

const getCharacterName = (): string | null =>
  getCharacterNameFromAuctionDetails() ??
  getCharacterNameFromUrl() ??
  getCharacterNameFromPage();

const AUCTION_LINKS_WRAPPER_ID = 'tibia-prices-character-links-wrapper';

const getAuctionNameElement = (): Element | null => {
  const root = getAuctionRoot();
  const searchIn = root ?? document;
  const byClass =
    searchIn.querySelector?.('.AuctionCharacterName') ??
    searchIn.querySelector?.('[class*="AuctionCharacterName"]');
  if (byClass) return byClass;
  if (root) {
    const relative = evaluateXPath(
      document,
      XPATH_AUCTION_NAME_RELATIVE,
      root
    )[0];
    if (relative && relative.nodeType === Node.ELEMENT_NODE)
      return relative as Element;
  }
  const byXpath = evaluateXPath(document, XPATH_AUCTION_CHARACTER_NAME)[0];
  return byXpath && byXpath.nodeType === Node.ELEMENT_NODE
    ? (byXpath as Element)
    : null;
};

const getInsertTarget = (): Element | null => {
  if (isAuctionDetailsPage()) {
    const container = getAuctionMountContainer();
    if (!container) return null;
    let wrapper = document.getElementById(AUCTION_LINKS_WRAPPER_ID);
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = AUCTION_LINKS_WRAPPER_ID;
      container.insertBefore(wrapper, container.firstChild);
    }
    return wrapper;
  }
  const insertTarget =
    document.querySelector('.BoxContent') ??
    document.querySelector('#characters .BoxContent') ??
    document.querySelector('table.BoxContent') ??
    document.querySelector('.Content');
  return insertTarget ?? document.querySelector('#characters') ?? document.body;
};

const buildLinks = (): { label: string; href: string }[] => {
  const name = getCharacterName();
  if (!name) return [];

  const nameForQuery = name.replace(/\s+/g, '+');
  const charBazaarHref = `${CHAR_BAZAAR_BASE}&searchstring=${encodeURIComponent(name)}&searchtype=3`;
  const guildStatsHref = `${GUILDSTATS_BASE}?nick=${encodeURIComponent(name)}`;

  return [
    { label: 'TibiaTime', href: `${TIBIATIME_BASE}${nameForQuery}` },
    { label: 'GuildStats', href: guildStatsHref },
    { label: 'Char Bazaar', href: charBazaarHref },
  ];
};

const runCharacterLinks = (ctx: ContentScriptContext): void => {
  const name = getCharacterName();
  if (!name) return;

  if (document.getElementById('tibia-prices-character-links')) return;

  const links = buildLinks();
  const anchorElement = getInsertTarget();
  if (!anchorElement) return;

  const ui = createIntegratedUi(ctx, {
    position: 'inline',
    anchor: () => anchorElement,
    append: 'first',
    onMount: (wrapper) => {
      const root = ReactDOM.createRoot(wrapper);
      root.render(
        <>
          <CharacterLinks links={links} />
          <br />
          <br />
        </>,
      );
      return root;
    },
    onRemove: (root) => {
      root?.unmount();
    },
  });

  ui.mount();
};

const AUCTION_DETAILS_RETRY_MAX = 60;
const AUCTION_DETAILS_RETRY_MS = 500;
const AUCTION_ROOT_WAIT_MAX = 50;
const AUCTION_ROOT_WAIT_MS = 400;

const runWhenReady = (
  ctx: ContentScriptContext,
  auctionRetryCount = 0
): void => {
  const name = getCharacterName();
  if (!name) {
    if (
      isAuctionDetailsPage() &&
      auctionRetryCount < AUCTION_DETAILS_RETRY_MAX
    ) {
      ctx.setTimeout(
        () => runWhenReady(ctx, auctionRetryCount + 1),
        AUCTION_DETAILS_RETRY_MS
      );
    }
    return;
  }
  runCharacterLinks(ctx);
};

const isCharactertradePage = (): boolean =>
  new URL(document.URL).pathname.includes('charactertrade');

export default defineContentScript({
  matches: [
    '*://www.tibia.com/community*',
    '*://www.tibia.com/charactertrade/*',
  ],
  allFrames: true,
  main(ctx) {
    const run = (rootWaitCount = 0): void => {
      if (document.readyState !== 'complete') {
        ctx.setTimeout(() => run(0), 200);
        return;
      }
      if (isAuctionDetailsPage()) {
        const mountContainer = getAuctionMountContainer();
        if (!mountContainer && rootWaitCount < AUCTION_ROOT_WAIT_MAX) {
          ctx.setTimeout(
            () => run(rootWaitCount + 1),
            AUCTION_ROOT_WAIT_MS
          );
          return;
        }
      }
      runWhenReady(ctx);
    };

    const scheduleRun = (): void => {
      ctx.setTimeout(() => run(0), 100);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => scheduleRun());
    } else {
      scheduleRun();
    }

    window.addEventListener('pageshow', (ev) => {
      if ('persisted' in ev && ev.persisted) scheduleRun();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') scheduleRun();
    });

    if (isCharactertradePage()) {
      const debouncedRun = ((): (() => void) => {
        let timeoutId: ReturnType<ContentScriptContext['setTimeout']> | null =
          null;
        return () => {
          if (timeoutId !== null) clearTimeout(timeoutId);
          timeoutId = ctx.setTimeout(() => {
            timeoutId = null;
            run(0);
          }, 150);
        };
      })();
      const observer = new MutationObserver(() => debouncedRun());
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        characterDataOldValue: true,
      });
    }
  },
});
