import { useEffect } from "react";
import { regionName, sentence, validationSentence } from "../lib/trends.js";

// Guided walkthroughs. Each step points at a card and builds its text from the loaded JSON,
// so the tour always says what the data says. Steps whose data is missing are skipped.

const val = (validation, metric, station) =>
  validation.find((v) => v.metric === metric && v.ground_label.startsWith(station));
const valId = (v) => `val-${v.metric}-${v.ground_label.split(" ")[0]}`;

export const TOURS = [
  {
    id: "summer",
    title: "Is Seattle’s summer water shrinking?",
    steps: (get, validation) => [
      get("cedar", "summer_runoff") && {
        region: "cedar", topic: "water", target: "card-summer_runoff",
        text: `Start with the Cedar River, about two thirds of Seattle’s water. In the NASA model, ${sentence(get("cedar", "summer_runoff")).replace(/^./, (c) => c.toLowerCase())}`,
      },
      val(validation, "summer_runoff", "Cedar River") && {
        region: "cedar", topic: "water", target: valId(val(validation, "summer_runoff", "Cedar River")),
        text: `Is that just the model? A real river gauge upstream of the reservoir checks it. ${validationSentence(val(validation, "summer_runoff", "Cedar River"))}`,
      },
      get("tolt", "summer_runoff") && {
        region: "tolt", topic: "water", target: "card-summer_runoff",
        text: `Now the South Fork Tolt, Seattle’s other source (only 2 grid cells, so a rougher signal). ${sentence(get("tolt", "summer_runoff"))}`,
      },
      get("cedar", "peak_swe") && {
        region: "cedar", topic: "water", target: "card-peak_swe",
        text: `Is it because of snow? ${sentence(get("cedar", "peak_swe"))} A trend detective checks every suspect before naming a cause.`,
      },
    ],
  },
  {
    id: "snow",
    title: "Is the snow disappearing?",
    steps: (get, validation) => [
      get("cedarupper", "peak_swe") && {
        region: "cedarupper", topic: "snow", target: "card-peak_swe",
        text: `The high Upper Cedar zone holds most of the snow. ${sentence(get("cedarupper", "peak_swe"))}`,
      },
      ...["Stampede Pass", "Olallie Meadows", "Rex River"].map((s) => {
        const v = val(validation, "peak_swe", s);
        return v && {
          region: "cedarupper", topic: "snow", target: valId(v),
          text: `Compare with a real snow station. ${validationSentence(v)} The model shows only about ${Math.round(v.model_to_ground_ratio * 100)}% of the snow measured at the station, because a 12 km grid cell averages high slopes with low valleys.`,
        };
      }),
      get("cedar", "rain_fraction") && {
        region: "cedar", topic: "snow", target: "card-rain_fraction",
        text: `Is more winter precipitation falling as rain? ${sentence(get("cedar", "rain_fraction"))}`,
      },
      get("cedar", "winter_temp") && {
        region: "cedar", topic: "temp", target: "card-winter_temp",
        text: `And winter temperature: ${sentence(get("cedar", "winter_temp")).replace(/^./, (c) => c.toLowerCase())} Reporting “no clear trend” honestly is part of the job.`,
      },
    ],
  },
];

export function buildSteps(tour, docs, validation) {
  const get = (r, v) => docs[`${r}/${v}`];
  return tour.steps(get, validation).filter(Boolean);
}

export function TourPanel({ tour, steps, index, onStep, onClose }) {
  const step = steps[index];
  useEffect(() => {
    if (!step) return;
    const el = document.getElementById(step.target);
    if (!el) return;
    el.classList.add("is-focus");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => el.classList.remove("is-focus");
  }, [step]);
  if (!step) return null;
  return (
    <aside className="tour" aria-live="polite" aria-label={`Guided tour: ${tour.title}`}>
      <p className="tour-kicker">Guided tour · {regionName(step.region)} · step {index + 1} of {steps.length}</p>
      <h3>{tour.title}</h3>
      <p>{step.text}</p>
      <div className="path-nav">
        <button onClick={() => onStep(index - 1)} disabled={index === 0}>Back</button>
        {index < steps.length - 1
          ? <button onClick={() => onStep(index + 1)}>Next</button>
          : <button onClick={onClose}>Finish</button>}
        <button onClick={onClose} className="tour-close">Close tour</button>
      </div>
    </aside>
  );
}
