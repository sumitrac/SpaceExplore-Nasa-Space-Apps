import { useId, useState } from "react";
import { WATER_BILL } from "../data/facts.js";

// Peak-season (summer) bill for one 60-day period, from SPU's published tiered rates.
// Rates come from facts.js only; nothing here is estimated.

const money = (v) => v.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function peakCharge(ccf, tiers = WATER_BILL.peak.tiers) {
  let prev = 0;
  return tiers.map((t) => {
    const used = Math.max(0, Math.min(ccf, t.upTo) - prev);
    const row = { ...t, from: prev, used, cost: used * t.perCcf };
    prev = t.upTo;
    return row;
  });
}

export default function WaterBillCard() {
  const id = useId();
  const [input, setInput] = useState("20");
  const ccf = Math.max(0, Number(input) || 0);
  const rows = peakCharge(ccf);
  const usage = rows.reduce((s, r) => s + r.cost, 0);
  const months = WATER_BILL.billingDays / 30;
  const base = WATER_BILL.baseMonthly * months;
  const total = usage + base;
  const top = rows[rows.length - 1];
  const tier3Limit = rows[rows.length - 2].upTo;
  const tier2Rate = rows[rows.length - 2].perCcf;
  // What the same water above 36 CCF would cost at the tier-2 price instead.
  const tier3Extra = top.used * (top.perCcf - tier2Rate);

  return (
    <div className="household bill-card">
      <h4>What it means for your water bill</h4>
      <p className="control-help">
        Seattle Public Utilities residential rates inside Seattle, as of {WATER_BILL.asOf}. Summer
        (peak season, {WATER_BILL.peak.label}) is billed per {WATER_BILL.billingDays} days in three
        tiers.
      </p>

      <label className="bill-input" htmlFor={id}>
        <span>Your summer use per {WATER_BILL.billingDays} days</span>
        <span className="bill-input-field">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min="0"
            max="200"
            step="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          CCF
        </span>
      </label>
      <p className="control-help">
        Your bill lists use in CCF. One CCF is {WATER_BILL.gallonsPerCcf} gallons, so {ccf.toLocaleString()} CCF is{" "}
        {(ccf * WATER_BILL.gallonsPerCcf).toLocaleString()} gallons.
      </p>

      <div className="bill-table-wrap">
        <table className="bill-table">
          <caption className="visually-hidden">Peak-season charge for {ccf} CCF over {WATER_BILL.billingDays} days</caption>
          <thead>
            <tr>
              <th scope="col">Peak tier</th>
              <th scope="col">Rate</th>
              <th scope="col">Your CCF</th>
              <th scope="col">Charge</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className={r.used > 0 ? undefined : "is-empty"}>
                <th scope="row">{r.label}</th>
                <td>{money(r.perCcf)}/CCF</td>
                <td>{r.used.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
                <td>{money(r.cost)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" colSpan={3}>
                Base service charge, {months} months × {money(WATER_BILL.baseMonthly)} ({WATER_BILL.meter} meter)
              </th>
              <td>{money(base)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>Total for {WATER_BILL.billingDays} summer days</th>
              <td>{money(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="household-result" aria-live="polite">
        {top.used > 0 ? (
          <>
            {top.used.toLocaleString("en-US", { maximumFractionDigits: 2 })} CCF of your use falls in the{" "}
            {money(top.perCcf)} tier. Staying under {tier3Limit} CCF avoids the {money(top.perCcf)} tier; at
            the {money(tier2Rate)} price that water would cost {money(tier3Extra)} less.
          </>
        ) : (
          <>Staying under {tier3Limit} CCF avoids the {money(top.perCcf)} tier, and you are under it.</>
        )}
      </p>

      <p className="bill-note">
        About {WATER_BILL.cityTax.pct}% of SPU’s water revenue goes to the City’s general fund as a
        utility tax; it is already included in these rates.
      </p>
      <p className="bill-note">
        Rates and taxes are set by the city, not the weather. Our data shows the season Seattle
        already pays the most for is getting drier.
      </p>
      <p className="footnote">
        Sources: <a href={WATER_BILL.source.url}>{WATER_BILL.source.label}</a>;{" "}
        <a href={WATER_BILL.cityTax.source.url}>{WATER_BILL.cityTax.source.label}</a>. Off-peak water
        ({WATER_BILL.offPeak.label}) is {money(WATER_BILL.offPeak.perCcf)}/CCF.
      </p>
    </div>
  );
}
