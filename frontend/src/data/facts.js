// Every number shown on the site lives here, next to where it came from.
// Update these when your NASA analysis is finished.

export const WATERSHED = {
  acres: 90638, // Seattle Public Utilities
  peopleServed: "1.6 million",
  shareOfSeattleWater: "about 70%",
  drinkingShareOfFlow: "18%",
  masonryDamGallons: 16e9, // "can hold back up to 16 billion gallons"
  chesterMorseLakeElevationM: 474, // ~1,556 ft at the Overflow Dike, SPU 2026
};

export const TOLT = {
  acres: 12500, // Tolt River Watershed, 8,400 acres city-owned (SPU)
};

// What a water bill is measured in.
export const GALLONS_PER_CCF = 748; // 1 CCF = 100 cubic feet (SPU)

export const WATER_BILL_FACTS = [
  {
    title: "Summer water costs more",
    body:
      "Seattle charges peak-season rates from May 16 to September 15, with three price tiers that rise as you use more.",
  },
  {
    title: "The top tier came from a drought",
    body:
      "The third, most expensive tier was brought back during the 2001 drought to discourage extra summer use.",
  },
  {
    title: "Snow isn’t the main driver of rates",
    body:
      "Most rate increases come from inflation, labor, construction and big capital projects. Low-snow years add pressure on summer supply rather than setting the price.",
  },
];

// Seattle Public Utilities inside-Seattle residential drinking water rates, as of 2026.
// Peak tiers are per 60-day billing period. Used by the water bill card in Impact.jsx.
export const WATER_BILL = {
  asOf: "2026",
  billingDays: 60,
  baseMonthly: 21.35, // service charge per month, 3/4" and smaller meter
  meter: '3/4"',
  offPeak: { label: "Sept 16 – May 15", perCcf: 5.82 },
  peak: {
    label: "May 16 – Sept 15",
    tiers: [
      { upTo: 10, perCcf: 5.98, label: "First 10 CCF" },
      { upTo: 36, perCcf: 7.39, label: "Next 26 CCF" },
      { upTo: Infinity, perCcf: 11.8, label: "Over 36 CCF" },
    ],
  },
  gallonsPerCcf: 748,
  source: {
    label: "Seattle Public Utilities, Residential Drinking Water Rates",
    url: "https://seattle.gov/utilities/your-services/accounts-and-payments/rates/water/residential-water-rates",
  },
  cityTax: {
    pct: 15.54, // City utility tax on SPU's gross water income, effective 1/1/2011
    effective: "January 1, 2011",
    includedInRates: true, // built into the rates above, not added to the bill
    source: {
      label: "Seattle Public Utilities, response to panel on City taxes (March 28, 2014)",
      url: "https://seattle.gov/Documents/Departments/SPU/March282014ResponsetoPanelCitytaxes.pdf",
    },
  },
};

// 1 acre-inch of water = 27,154 gallons
export const GALLONS_PER_ACRE_INCH = 27154;

// Illustrative model for the hero scene (not a forecast).
export const SNOWLINE_MODEL = {
  todayM: 600, // rough present-day winter snow line used for the drawing
  metersPerDegreeC: 150, // standard lapse rate, ~6.5 °C per km
  snowpackLossPerDegreeC: 0.2, // ~20% less April 1 snowpack per 1 °C (UW, 2009)
};

export const PATH_STEPS = [
  {
    title: "Snow piles up",
    body:
      "Winter storms bury the upper Cedar River Watershed, 35 miles southeast of Seattle. That snow is a reservoir nobody had to build.",
  },
  {
    title: "Spring melt",
    body:
      "From April into June the snow melts a little each day, feeding streams long after the rain stops.",
  },
  {
    title: "Chester Morse Lake",
    body:
      "Meltwater and rain collect in Chester Morse Lake and the Masonry Pool, behind a dam that holds up to 16 billion gallons.",
  },
  {
    title: "The Cedar River",
    body:
      "Only 18% of the river’s yearly flow becomes drinking water. The rest stays in the river for salmon, Lake Washington, and the Ballard Locks.",
  },
  {
    title: "Your tap",
    body:
      "The Cedar supplies about 70% of the drinking water for 1.6 million people in the Seattle area.",
  },
];
