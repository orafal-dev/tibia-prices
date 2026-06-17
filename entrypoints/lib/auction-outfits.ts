import { getOutfitById } from './outfits';
import { AUCTION_LIST_ROW_XPATH } from './auction-dom';

const AUCTION_ROW_XPATH = AUCTION_LIST_ROW_XPATH;

const HIDDEN_CLASS = 'tibia-prices-outfit-hidden';

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

const getOutfitFileName = (src: string): string | null => {
  const match = src.match(/\/outfits\/([^/?#]+)$/);
  return match?.[1] ?? null;
};

const getRowOutfitFiles = (row: Element): string[] => {
  const images = row.querySelectorAll('img.AuctionOutfitImage, .AuctionOutfit img');
  const files: string[] = [];
  images.forEach((img) => {
    const src = img.getAttribute('src') ?? '';
    const fileName = getOutfitFileName(src);
    if (fileName) files.push(fileName);
  });
  return files;
};

const getEnabledImageFiles = (enabledFilterIds: string[]): Set<string> => {
  const files = new Set<string>();
  for (const id of enabledFilterIds) {
    const outfit = getOutfitById(id);
    if (!outfit) continue;
    for (const file of outfit.imageFiles) files.add(file);
  }
  return files;
};

const rowMatchesOutfitFilter = (
  row: Element,
  enabledImageFiles: Set<string>
): boolean => {
  const rowFiles = getRowOutfitFiles(row);
  return rowFiles.some((file) => enabledImageFiles.has(file));
};

export const getAuctionListRows = (): Element[] => evaluateXPath(document, AUCTION_ROW_XPATH);

export const applyOutfitFilter = (enabledFilterIds: string[]): void => {
  const rows = getAuctionListRows();
  const isFilterActive = enabledFilterIds.length > 0;

  if (!isFilterActive) {
    for (const row of rows) {
      row.classList.remove(HIDDEN_CLASS);
      row.style.removeProperty('display');
    }
    return;
  }

  const enabledImageFiles = getEnabledImageFiles(enabledFilterIds);

  for (const row of rows) {
    const matches = rowMatchesOutfitFilter(row, enabledImageFiles);
    if (matches) {
      row.classList.remove(HIDDEN_CLASS);
      row.style.removeProperty('display');
    } else {
      row.classList.add(HIDDEN_CLASS);
      row.style.display = 'none';
    }
  }
};
