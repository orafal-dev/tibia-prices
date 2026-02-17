import { useState, useEffect } from 'react';
import './App.css';

const STORAGE_KEY_PRICE_PER_250 = 'tibiaPrices:pricePer250Tc';
const DEFAULT_PRICE_PER_250 = 40;
const MIN_PRICE = 0.01;
const MAX_PRICE = 9999;

const loadPrice = (): Promise<number> =>
  browser.storage.local.get(STORAGE_KEY_PRICE_PER_250).then((v) => {
    const n = v[STORAGE_KEY_PRICE_PER_250];
    return typeof n === 'number' && Number.isFinite(n) ? n : DEFAULT_PRICE_PER_250;
  });

const savePrice = (value: number): Promise<void> =>
  browser.storage.local.set({ [STORAGE_KEY_PRICE_PER_250]: value });

function App() {
  const [pricePer250, setPricePer250] = useState<number>(DEFAULT_PRICE_PER_250);
  const [inputValue, setInputValue] = useState<string>(String(DEFAULT_PRICE_PER_250));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPrice().then((v) => {
      setPricePer250(v);
      setInputValue(String(v));
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setSaved(false);
  };

  const handleBlur = () => {
    const parsed = Number.parseFloat(inputValue.replace(/,/g, '.'));
    if (!Number.isFinite(parsed)) {
      setInputValue(String(pricePer250));
      return;
    }
    const clamped = Math.max(MIN_PRICE, Math.min(MAX_PRICE, parsed));
    setPricePer250(clamped);
    setInputValue(String(clamped));
    savePrice(clamped).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="tibia-prices-popup">
      <h1 className="tibia-prices-title">Tibia TC → PLN</h1>
      <p className="tibia-prices-desc">Price per 250 Tibia Coins (PLN)</p>
      <div className="tibia-prices-row">
        <input
          type="number"
          inputMode="decimal"
          min={MIN_PRICE}
          max={MAX_PRICE}
          step={0.01}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="tibia-prices-input"
          aria-label="Price per 250 Tibia Coins in PLN"
        />
        <span className="tibia-prices-suffix">PLN</span>
      </div>
      {saved && <p className="tibia-prices-saved" aria-live="polite">Saved</p>}
      <p className="tibia-prices-hint">
        Changes apply on the character trade page immediately.
      </p>
    </div>
  );
}

export default App;
