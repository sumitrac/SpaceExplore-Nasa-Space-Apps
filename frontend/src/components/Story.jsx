import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "../state/AppState.jsx";
import { trendTest, median } from "../lib/stats.js";
import {
  baselineValue,
  dayToDate,
  formatSlope,
  formatValue,
  monthlyProfile,
  seasonalSeries,
  waterYears,
} from "../lib/series.js";
import YearChart from "./charts/YearChart.jsx";
import StackedYearBars from "./charts/StackedYearBars.jsx";
import MonthChart from "./charts/MonthChart.jsx";

const MELT_TICKS = [60, 91, 121, 152, 182, 213]; // Mar 1 … Aug 1

function trendSentence(varId, t, subject) {
  if (!t || t.tooFew) return null;
  const size = formatSlope(varId, t.slope);
  const p = t.p < 0.001 ? "p < 0.001" : `p = ${t.p.toFixed(t.significant ? 3 : 2)}`;
  return t.significant
    ? `${subject}: ${size}. That’s a real trend, not chance (${p}).`
    : `${subject}: ${size}, but a drift like this could still be chance (${p}).`;
}

function useStoryData(data) {
  return useMemo(() => {
    const years = waterYears(data);
    const first = years[0];
    const last = years[years.length - 1];

    const peak = seasonalSeries(data, "swe", "wy");
    const peakNormal = baselineValue(peak, "normal");
    const peakTrend = trendTest(peak.map((p) => p.year), peak.map((p) => p.value));
    const lowest = [...peak].sort((a, b) => a.value - b.value).slice(0, 2).map((p) => p.year);

    const melt = seasonalSeries(data, "meltOut", "wy");
    const meltTrend = trendTest(melt.map((p) => p.year), melt.map((p) => p.value));
    const meltNormal = baselineValue(melt, "normal");

    const rainShare = seasonalSeries(data, "rainShare", "winter");
    const rainTrend = trendTest(rainShare.map((p) => p.year), rainShare.map((p) => p.value));
    const rainSnow = years
      .map((year) => {
        const rain = monthlyProfile(data, "rain", year);
        const snow = monthlyProfile(data, "snow", year);
        if (!rain || !snow) return null;
        const idx = [1, 2, 3, 4, 5]; // Nov–Mar
        return { year, rain: idx.reduce((s, i) => s + rain[i], 0), snow: idx.reduce((s, i) => s + snow[i], 0) };
      })
      .filter(Boolean);

    const temp = seasonalSeries(data, "tair", "winter");
    const tempTrend = trendTest(temp.map((p) => p.year), temp.map((p) => p.value));

    const flowVar = data.monthly.streamflow ? "streamflow" : "runoff";
    const span = Math.min(15, Math.floor(years.length / 3));
    const earlyYears = years.slice(0, span);
    const recentYears = years.slice(-span);
    const avgProfile = (ys) => {
      const profs = ys.map((y) => monthlyProfile(data, flowVar, y)).filter(Boolean);
      return Array.from({ length: 12 }, (_, i) => median(profs.map((p) => p[i])));
    };
    const earlyFlow = avgProfile(earlyYears);
    const recentFlow = avgProfile(recentYears);
    const lateSum = (p) => p[9] + p[10] + p[11];
    const lateChange = (100 * (lateSum(recentFlow) - lateSum(earlyFlow))) / lateSum(earlyFlow);

    return {
      first, last, peak, peakNormal, peakTrend, lowest,
      melt, meltTrend, meltNormal,
      rainShare, rainTrend, rainSnow,
      temp, tempTrend,
      flowVar, earlyYears, recentYears, earlyFlow, recentFlow, lateChange,
    };
  }, [data]);
}

export default function Story() {
  const { data, openInExplore } = useAppState();
  const s = useStoryData(data);
  const [active, setActive] = useState(0);
  const stepRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(Number(entry.target.dataset.step));
        });
      },
      // On phones the pinned chart fills the top of the screen, so switch
      // chapters when the text reaches the lower part of the screen instead.
      { rootMargin: window.matchMedia("(max-width: 900px)").matches ? "-72% 0px -18% 0px" : "-45% 0px -50% 0px" }
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const pctOfNormal = (v) => `${Math.round((100 * v) / s.peakNormal)}% of normal`;

  const chapters = [
    {
      title: "Is there less snow?",
      body: (
        <>
          <p>
            Each bar is one winter’s peak snowpack in the {data.name} watershed, measured as the water
            it holds. The dashed line is a normal year. Low years are marked in amber.
          </p>
          <p className="finding">{trendSentence("swe", s.peakTrend, "Peak snowpack")}</p>
        </>
      ),
      explore: ["swe", "wy"],
      chart: (
        <YearChart
          series={s.peak}
          baseline={s.peakNormal}
          baselineLabel="Normal (1991–2020)"
          trend={s.peakTrend}
          isLow={(p) => p.value < 0.7 * s.peakNormal}
          annotations={s.lowest.map((y) => ({ year: y, text: `${y}: ${pctOfNormal(s.peak.find((p) => p.year === y).value)}` }))}
          yTickFormat={(v) => `${v} mm`}
          formatTooltip={(p) => (
            <>
              <span>{formatValue("swe", p.value)} of snow water</span>
              <span>{pctOfNormal(p.value)}</span>
            </>
          )}
          ariaLabel={`Bar chart of peak snowpack for each water year from ${s.first} to ${s.last}.`}
        />
      ),
    },
    {
      title: "Is it melting earlier?",
      // Melt-out needs daily snow data; hide this chapter when the watershed file has none.
      skip: s.melt.length < 8,
      body: (
        <>
          <p>
            Each dot is the day the snowpack dropped below 10% of its peak. Lower dots mean the snow
            was gone sooner, leaving less water for summer.
          </p>
          <p className="finding">{trendSentence("meltOut", s.meltTrend, "Melt-out date")}</p>
        </>
      ),
      explore: ["meltOut", "wy"],
      chart: (
        <YearChart
          series={s.melt}
          mode="dots"
          zero={false}
          baseline={s.meltNormal}
          baselineLabel={`Normal: ${dayToDate(s.meltNormal)}`}
          trend={s.meltTrend}
          isLow={(p) => p.value < s.meltNormal - 14}
          yTicks={MELT_TICKS}
          yTickFormat={(v) => dayToDate(v).split(" ")[0]}
          formatTooltip={(p) => (
            <>
              <span>Snow gone by {dayToDate(p.value)}</span>
              <span>
                {Math.abs(Math.round(p.value - s.meltNormal))} days {p.value < s.meltNormal ? "earlier" : "later"} than normal
              </span>
            </>
          )}
          ariaLabel="Dot chart of the snow melt-out date for each year."
        />
      ),
    },
    {
      title: "Is more falling as rain?",
      body: (
        <>
          <p>
            Winter (November to March) precipitation, split into snow and rain. When the same storm
            arrives a degree or two warmer, it runs straight into the rivers instead of waiting as
            snow.
          </p>
          <p className="finding">{trendSentence("rainShare", s.rainTrend, "Share falling as rain")}</p>
        </>
      ),
      explore: ["rainShare", "winter"],
      chart: <StackedYearBars rows={s.rainSnow} ariaLabel="Stacked bars of winter rain and snow for each year." unitLabel="mm" />,
    },
    {
      title: "Are winters warming?",
      body: (
        <>
          <p>
            Average winter temperature over the watershed sits close to freezing. That’s why small
            changes matter so much here: a little warmer, and snow becomes rain.
          </p>
          <p className="finding">{trendSentence("tair", s.tempTrend, "Winter temperature")}</p>
        </>
      ),
      explore: ["tair", "winter"],
      chart: (
        <YearChart
          series={s.temp}
          mode="line"
          zero={false}
          baseline={0}
          baselineLabel="Freezing (0 °C)"
          trend={s.tempTrend}
          isLow={(p) => p.value > 1}
          yTickFormat={(v) => `${v} °C`}
          formatTooltip={(p) => <span>Winter average {formatValue("tair", p.value)}</span>}
          ariaLabel="Line chart of average winter temperature for each year."
        />
      ),
    },
    {
      title: "What happens to the river?",
      body: (
        <>
          <p>
            Typical {s.flowVar === "streamflow" ? "river flow" : "runoff"} through the year, comparing
            {" "}{s.earlyYears[0]}–{s.earlyYears[s.earlyYears.length - 1]} with{" "}
            {s.recentYears[0]}–{s.recentYears[s.recentYears.length - 1]}. If less water were stored as
            snow, more would leave in winter and less would be left for late summer.
          </p>
          <p className="finding">
            Late-summer {s.flowVar === "streamflow" ? "flow" : "runoff"} is{" "}
            {Math.abs(Math.round(s.lateChange))}% {s.lateChange < 0 ? "lower" : "higher"} in recent
            years.
          </p>
        </>
      ),
      explore: [s.flowVar, "summer"],
      chart: (
        <MonthChart
          lines={[
            { id: "early", label: `${s.earlyYears[0]}–${s.earlyYears[s.earlyYears.length - 1]}`, values: s.earlyFlow, tone: "normal" },
            { id: "recent", label: `${s.recentYears[0]}–${s.recentYears[s.recentYears.length - 1]}`, values: s.recentFlow, tone: "a" },
          ]}
          shadeMonths={[9, 11]}
          shadeLabel="Late summer"
          format={(v) => formatValue(s.flowVar, v)}
          unitLabel={s.flowVar === "streamflow" ? "cfs" : "mm"}
          ariaLabel="Line chart comparing typical monthly river flow in early and recent years."
        />
      ),
    },
  ].filter((c) => !c.skip);

  const current = chapters[Math.min(active, chapters.length - 1)];

  return (
    <section id="story" className="section story-section" aria-labelledby="story-title">
      <h2 id="story-title">What’s changing in the {data.name} watershed</h2>
      <p className="section-intro">
        {chapters.length} questions, answered with {s.first}–{s.last} data. Scroll through them, and point at any
        year to see its numbers.
      </p>

      <div className="story">
        <div className="story-graphic" aria-live="polite">
          <p className="story-graphic-title">{current.title}</p>
          <div key={`${data.id}-${active}`} className="story-chart">
            {current.chart}
          </div>
        </div>

        <ol className="story-steps">
          {chapters.map((c, i) => (
            <li
              key={c.title}
              ref={(el) => (stepRefs.current[i] = el)}
              data-step={i}
              className={`story-step${i === active ? " is-active" : ""}`}
            >
              <h3>{c.title}</h3>
              {c.body}
              <button type="button" className="text-button" onClick={() => openInExplore(...c.explore)}>
                Explore this yourself
              </button>
            </li>
          ))}
          <li
            ref={(el) => (stepRefs.current[chapters.length] = el)}
            data-step={chapters.length - 1}
            className="story-step story-step-end"
          >
            <h3>So what does it mean downstream?</h3>
            <p>
              Late summer is when Seattle needs water most. See how late-summer flow has looked after
              low-snow winters, and what that could mean for your water bill.
            </p>
            <a className="button" href="#impact">
              See the downstream impact
            </a>
          </li>
        </ol>
      </div>
    </section>
  );
}
