export const CHARACTER_TRADE_ROOT_IDS = {
  current: 'currentcharactertrades',
  past: 'pastcharactertrades',
} as const;

export type CharacterTradeRootId =
  (typeof CHARACTER_TRADE_ROOT_IDS)[keyof typeof CHARACTER_TRADE_ROOT_IDS];

/** Auction list rows on the character trade overview page (tr[2], tr[3], …). */
export const getAuctionListRowXPath = (rootId: CharacterTradeRootId): string =>
  `//*[@id="${rootId}"]/div[5]/div/div/div[5]/table/tbody/tr/td/div[2]/table/tbody/tr[position()>=2]`;

export const AUCTION_LIST_ROW_XPATH = getAuctionListRowXPath(
  CHARACTER_TRADE_ROOT_IDS.current
);

/** TC bid amount inside each auction list row. */
export const TC_IN_AUCTION_ROW_XPATH =
  './/td/div/table/tbody/tr/td/div/div[2]/div[3]/div[6]/div[2]/b';

/** XPath for TC on a specific character auction (details page). */
export const getAuctionDetailsTcXPath = (
  rootId: CharacterTradeRootId
): string =>
  `//*[@id="${rootId}"]/div[5]/div/div/div[3]/table/tbody/tr/td/div[2]/table/tbody/tr/td/div/table/tbody/tr/td/div/div[2]/div[3]/div[6]/div[2]/b`;

export const getActiveCharacterTradeRootId = (
  doc: Document = document
): CharacterTradeRootId | null => {
  if (doc.getElementById(CHARACTER_TRADE_ROOT_IDS.current)) {
    return CHARACTER_TRADE_ROOT_IDS.current;
  }
  if (doc.getElementById(CHARACTER_TRADE_ROOT_IDS.past)) {
    return CHARACTER_TRADE_ROOT_IDS.past;
  }
  return null;
};

/** TC amounts inside ShortAuctionDataValue containers (bids on list and details pages). */
export const getTcElementsFromShortAuctionDataValues = (
  doc: Document = document
): Element[] => {
  const tcElements: Element[] = [];
  const containers = doc.querySelectorAll('.ShortAuctionDataValue');

  for (const container of containers) {
    const hasTcCoin = container.querySelector(
      'img.VSCCoinImages[src*="tibiacoin"]'
    );
    if (!hasTcCoin) continue;

    const amount = container.querySelector(':scope > b');
    if (amount) tcElements.push(amount);
  }

  return tcElements;
};
