import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { PRICY_OUTFITS } from './lib/outfits';
import {
  getEnabledOutfitFilters,
  setEnabledOutfitFilters,
} from './lib/outfit-storage';

type OutfitFilterProps = {
  onFilterChange: (enabledIds: string[]) => void;
};

const OutfitFilter = ({ onFilterChange }: OutfitFilterProps): ReactElement => {
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getEnabledOutfitFilters().then((ids) => {
      setEnabledIds(ids);
      setLoaded(true);
      onFilterChange(ids);
    });
  }, [onFilterChange]);

  const handleToggle = useCallback(
    (outfitId: string) => {
      const next = enabledIds.includes(outfitId)
        ? enabledIds.filter((id) => id !== outfitId)
        : [...enabledIds, outfitId];
      setEnabledIds(next);
      void setEnabledOutfitFilters(next).then(() => onFilterChange(next));
    },
    [enabledIds, onFilterChange]
  );

  const handleKeyDown = useCallback(
    (outfitId: string) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle(outfitId);
      }
    },
    [handleToggle]
  );

  if (!loaded) return <></>;

  return (
    <div
      id="tibia-prices-outfit-filter"
      role="group"
      aria-label="Filter auctions by pricy outfits"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '8px',
      }}
    >
      {PRICY_OUTFITS.map((outfit) => {
        const enabled = enabledIds.includes(outfit.id);
        return (
          <button
            key={outfit.id}
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`${enabled ? 'Disable' : 'Enable'} ${outfit.label} filter`}
            title={`${outfit.label} filter`}
            tabIndex={0}
            onClick={() => handleToggle(outfit.id)}
            onKeyDown={handleKeyDown(outfit.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              padding: '2px',
              border: enabled ? '2px solid #5a4a32' : '2px solid #c4b08a',
              borderRadius: '4px',
              backgroundColor: enabled ? '#f1e0c6' : '#d4c0a1',
              boxShadow: enabled
                ? 'inset 0 0 0 1px #faf0d7'
                : 'inset 0 0 0 1px #e8d4b8',
              cursor: 'pointer',
              opacity: enabled ? 1 : 0.65,
            }}
          >
            <img
              src={outfit.toggleIconUrl}
              alt=""
              width={32}
              height={32}
              aria-hidden
              style={{ imageRendering: 'pixelated' }}
            />
          </button>
        );
      })}
    </div>
  );
};

export default OutfitFilter;
