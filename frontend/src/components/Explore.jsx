import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../state/AppState.jsx";
import { trendTest } from "../lib/stats.js";
import {
  availableVariables,
  BASELINES,
  baselineValue,
  dayToDate,
  formatValue,
  monthlyProfile,
  normalProfile,
  SEASONS,
  seasonalSeries,
  VARIABLES,
  waterYears,
} from "../lib/series.js";
import YearChart from "./charts/YearChart.jsx";
import MonthChart from "./charts/MonthChart.jsx";
import SignificanceBadge from "./SignificanceBadge.jsx";
import InvestigateYourData from "./InvestigateYourData.jsx";

const MELT_TICKS = [60, 91, 121, 152, 182, 213];

function downloadCsv(filename, rows) {
  const text = rows.map((r) => r.join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Segmented({ legend, options, value, onChange }) {
  return (
    <fieldset className="segmented">
      <legend>{legend}</legend>
      <div>
        {options.map(([id, label, note]) => (
          <label key={id} className={id === value ? "is-on" : undefined}>
            <input type="radio" checked={id === value} onChange={() => onChange(id)} />
            {label}
            {note && <span className="seg-note">{note}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Explore() {
  const { data, exploreRequest } = useAppState();
  const allYears = waterYears(data);
  const firstYear = allYears[0];
  const lastYear = allYears[allYears.length - 1];

  const [varId, setVarId] = useState("swe");
  const [season, setSeason] = useState("wy");
  const [range, setRange] = useState([lastYear - 19, lastYear]);
  const [baselineMode, setBaselineMode] = useState("normal");
  const [view, setView] = useState("values");
  const [compareA, setCompareA] = useState(lastYear);
  const [compareB, setCompareB] = useState(null);

  // Opened from a glance card or story chapter.
  useEffect(() => {
    if (!exploreRequest) return;
    setVarId(exploreRequest.varId);
    setSeason(exploreRequest.season);
    if (exploreRequest.compareYear) {
      setCompareA(exploreRequest.compareYear);
      setCompareB(null);
      setRange([firstYear, lastYear]);
    }
  }, [exploreRequest]);

  const variables = availableVariables(data);
  const v = VARIABLES[varId];
  const seasonId = v.seasons.includes(season) ? season : v.seasons[0];

  function chooseVariable(id) {
    setVarId(id);
    if (!VARIABLES[id].seasons.includes(season)) setSeason(VARIABLES[id].seasons[0]);
  }

  const full = useMemo(() => seasonalSeries(data, varId, seasonId), [data, varId, seasonId]);
  const series = full.filter((p) => p.year >= range[0] && p.year <= range[1]);
  const baseline = baselineValue(full, baselineMode, range);
  const trend = useMemo(() => trendTest(series.map((p) => p.year), series.map((p) => p.value)), [series]);

  const ratioOK = baseline > 0 && (v.unit === "mm" || v.unit === "cfs");
  const describe = (p) => {
    if (varId === "meltOut") {
      const d = Math.round(p.value - baseline);
      return `${Math.abs(d)} days ${d < 0 ? "earlier" : "later"} than normal`;
    }
    if (ratioOK) return `${Math.round((100 * p.value) / baseline)}% of ${BASELINES[baselineMode].short}`;
    const d = p.value - baseline;
    return `${d >= 0 ? "+" : "−"}${formatValue(varId, Math.abs(d))} vs. ${BASELINES[baselineMode].short}`;
  };

  const shown =
    view === "difference" && varId !== "meltOut"
      ? series.map((p) => ({ ...p, value: ratioOK ? (100 * p.value) / baseline - 100 : p.value - baseline, raw: p.value }))
      : series;
  const shownTrend = view === "difference" && varId !== "meltOut" ? trendTest(shown.map((p) => p.year), shown.map((p) => p.value)) : trend;
  const diffUnit = ratioOK ? "%" : v.unit;

  // Amber marks the years that were notably worse than normal.
  const isLow = v.worseWhen
    ? (p) => {
        const raw = p.raw ?? p.value;
        if (varId === "meltOut") return raw < baseline - 14;
        if (v.worseWhen === "down") return raw < 0.7 * baseline;
        if (varId === "tair") return raw > baseline + 1;
        return raw > baseline + 10;
      }
    : null;

  const seasonLabel = `${SEASONS[seasonId].label.toLowerCase()} (${SEASONS[seasonId].note})`;
  const title = `${v.aggLabel(seasonId)}, ${varId === "meltOut" ? "each year" : seasonLabel}`;

  // Compare two years month by month.
  const canCompare = varId !== "meltOut";
  const snowiest = full.length ? [...full].sort((a, b) => b.value - a.value)[0].year : firstYear;
  const yearB = compareB ?? snowiest;
  const compareLines = canCompare
    ? [
        { id: "normal", label: "Normal", values: normalProfile(data, varId) || [], tone: "normal" },
        { id: "a", label: String(compareA), values: monthlyProfile(data, varId, compareA) || [], tone: "a" },
        { id: "b", label: String(yearB), values: monthlyProfile(data, varId, yearB) || [], tone: "b" },
      ]
    : [];

  const presets = [
    ["Last 20 years", [lastYear - 19, lastYear]],
    ["Last 30 years", [lastYear - 29, lastYear]],
    ["Full record", [firstYear, lastYear]],
  ];

  return (
    <section id="explore" className="section explore" aria-labelledby="explore-title">
      <h2 id="explore-title">Explore the data</h2>
      <p className="section-intro">
        Choose what to look at. The trend test reruns every time you change something.
      </p>

      <div className="explore-layout">
        <div className="controls">
          <fieldset className="chips">
            <legend>Measure</legend>
            <div>
              {variables.map((id) => (
                <label key={id} className={id === varId ? "is-on" : undefined}>
                  <input type="radio" name="measure" checked={id === varId} onChange={() => chooseVariable(id)} />
                  {VARIABLES[id].label}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="control-help">{v.explain}</p>

          {v.seasons.length > 1 && (
            <Segmented
              legend="Season"
              value={seasonId}
              onChange={setSeason}
              options={v.seasons.map((id) => [id, SEASONS[id].label, SEASONS[id].note])}
            />
          )}

          <fieldset className="range">
            <legend>Years</legend>
            <div className="range-presets">
              {presets.map(([label, r]) => (
                <button
                  key={label}
                  type="button"
                  className={r[0] === range[0] && r[1] === range[1] ? "is-on" : undefined}
                  onClick={() => setRange([Math.max(firstYear, r[0]), r[1]])}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="range-selects">
              <label>
                From
                <select value={range[0]} onChange={(e) => setRange([Number(e.target.value), range[1]])}>
                  {allYears.filter((y) => y < range[1]).map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </label>
              <label>
                To
                <select value={range[1]} onChange={(e) => setRange([range[0], Number(e.target.value)])}>
                  {allYears.filter((y) => y > range[0]).map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <label className="select-row">
            Compare with
            <select value={baselineMode} onChange={(e) => setBaselineMode(e.target.value)}>
              {Object.entries(BASELINES).map(([id, b]) => (
                <option key={id} value={id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>

          {varId !== "meltOut" && (
            <Segmented
              legend="Show"
              value={view}
              onChange={setView}
              options={[
                ["values", "Values"],
                ["difference", ratioOK ? "% above or below normal" : "Difference from normal"],
              ]}
            />
          )}
        </div>

        <div className="explore-main">
          <h3 className="chart-title">{title}</h3>
          <YearChart
            series={shown}
            mode={v.chart === "line" ? "line" : v.chart === "dots" ? "dots" : "bars"}
            zero={varId !== "meltOut" && varId !== "tair" && view === "values"}
            baseline={view === "difference" && varId !== "meltOut" ? 0 : baseline}
            baselineLabel={BASELINES[baselineMode].label}
            trend={shownTrend}
            isLow={isLow}
            yTicks={varId === "meltOut" ? MELT_TICKS : null}
            yTickFormat={(t) =>
              varId === "meltOut"
                ? dayToDate(t).split(" ")[0]
                : view === "difference"
                ? `${t > 0 ? "+" : ""}${t}${diffUnit === "%" ? "%" : ""}`
                : t.toLocaleString("en-US")
            }
            formatTooltip={(p) => {
              const raw = { year: p.year, value: p.raw ?? p.value };
              return (
                <>
                  <span>{formatValue(varId, raw.value)}</span>
                  <span>{describe(raw)}</span>
                </>
              );
            }}
            ariaLabel={`${title}, ${range[0]} to ${range[1]}.`}
            unitLabel={varId === "meltOut" ? null : view === "difference" ? (ratioOK ? "% vs normal" : v.unit) : v.unit}
          />

          <SignificanceBadge varId={varId} label={v.aggLabel(seasonId)} trend={trend} baseline={baseline} range={range} />

          <div className="explore-actions">
            <details className="data-table">
              <summary>Show the numbers</summary>
              <div className="table-scroll">
                <table>
                  <caption className="visually-hidden">{title}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Water year</th>
                      <th scope="col">{v.aggLabel(seasonId)}</th>
                      <th scope="col">Compared with normal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((p) => (
                      <tr key={p.year}>
                        <th scope="row">{p.year}</th>
                        <td>{formatValue(varId, p.value)}</td>
                        <td>{describe(p)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                downloadCsv(`${data.id}-${varId}-${seasonId}-${range[0]}-${range[1]}.csv`, [
                  ["water_year", `${varId}_${seasonId}${v.unit ? `_${v.unit.replace("°", "deg")}` : "_day_of_year"}`],
                  ...series.map((p) => [p.year, p.value.toFixed(2)]),
                ])
              }
            >
              Download these numbers (CSV)
            </button>
          </div>
        </div>
      </div>

      <InvestigateYourData />

      {canCompare && (
        <div className="compare" id="compare">
          <h3>Compare two years, month by month</h3>
          <p className="control-help">{v.long}, in each month of the water year.</p>
          <div className="compare-controls">
            <label>
              Year
              <select value={compareA} onChange={(e) => setCompareA(Number(e.target.value))}>
                {allYears.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
            <label>
              against
              <select value={yearB} onChange={(e) => setCompareB(Number(e.target.value))}>
                {allYears.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>
          <MonthChart
            lines={compareLines}
            format={(val) => formatValue(varId, val)}
            ariaLabel={`${v.label} by month for ${compareA}, ${yearB} and a normal year.`}
            unitLabel={v.unit}
          />
        </div>
      )}
    </section>
  );
}
