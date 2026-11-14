import { useState } from "react";
import { WATERSHED, GALLONS_PER_ACRE_INCH } from "../data/facts.js";

const fmtBillions = (g) => (g / 1e9).toFixed(1);

export default function SnowBank() {
  const [inches, setInches] = useState(6.5);
  const gallons = inches * WATERSHED.acres * GALLONS_PER_ACRE_INCH;
  const dams = gallons / WATERSHED.masonryDamGallons;
  const whole = Math.floor(dams);
  const part = dams - whole;
  const icons = Math.max(1, Math.ceil(dams));

  return (
    <section id="snow-bank" className="section" aria-labelledby="bank-title">
      <h2 id="bank-title">The snow bank, in gallons</h2>
      <p className="section-intro">
        Snow is measured in inches of water. Spread over the whole Cedar watershed, every inch adds
        up fast.
      </p>

      <div className="bank">
        <label className="slider">
          <span className="slider-label">
            Missing snow water <strong>{inches.toFixed(1)} in</strong>
          </span>
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={inches}
            onChange={(e) => setInches(Number(e.target.value))}
            aria-valuetext={`${inches} inches`}
          />
        </label>

        <p className="bank-result" aria-live="polite">
          <span className="bank-number">{fmtBillions(gallons)} billion gallons</span>
          <span className="bank-compare">
            That’s {dams.toFixed(1)} times what Masonry Dam can hold.
          </span>
        </p>

        <div className="dams" aria-hidden="true">
          {Array.from({ length: icons }, (_, i) => {
            const fill = i < whole ? 1 : i === whole ? part : 0;
            return (
              <span key={i} className="dam">
                <span className="dam-fill" style={{ height: `${fill * 100}%` }} />
              </span>
            );
          })}
        </div>

        <p className="footnote">
          {WATERSHED.acres.toLocaleString()} acres × {GALLONS_PER_ACRE_INCH.toLocaleString()} gallons
          per acre-inch. Masonry Dam holds up to 16 billion gallons (Seattle Public Utilities).
        </p>
      </div>
    </section>
  );
}
