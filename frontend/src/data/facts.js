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

export const WINTER_2026 = [
  {
    date: "Dec 8–11, 2025",
    title: "Rain where snow should be",
    body:
      "A warm atmospheric river soaks the Cascades. On December 11 the Cedar River breaks its all-time flood record.",
  },
  {
    date: "Apr 8, 2026",
    title: "Statewide drought",
    body:
      "Washington declares a drought emergency. Snowpack in Seattle’s watersheds is about half of normal.",
  },
  {
    date: "Early May 2026",
    title: "A third of the usual snow",
    body:
      "Statewide snowpack drops to 33% of the 1991–2020 median. Many central Cascade basins sit below 20%.",
  },
  {
    date: "Late June 2026",
    title: "Melted out early",
    body:
      "Snow is gone from every monitoring station in the state, about three weeks earlier than normal.",
  },
];

export const NASA_DATA_INTRO =
  "Snow, temperature, rain and runoff come from NASA. River flow comes from USGS stream gauges.";

export const NASA_DATA = [
  {
    name: "NLDAS-2 (via Giovanni)",
    measures: "Snow water, snowfall, rainfall, runoff, baseflow and air temperature, monthly since 1979.",
  },
  {
    name: "Daymet (via AppEEARS)",
    measures: "Daily snow water and precipitation on a 1 km grid since 1980.",
  },
  {
    name: "MODIS snow cover (via AppEEARS)",
    measures: "Where the ground is snowy, every day since 2000, at 500 m.",
  },
  {
    name: "USGS stream gauges",
    measures: "Daily river flow for the Cedar and Tolt rivers (not NASA, used to check the NASA runoff).",
  },
];

export const METHODS = [
  {
    title: "Water years",
    body: "Each year runs October to September and is named for the year it ends, so one winter’s snow stays in one year.",
  },
  {
    title: "Normal",
    body: "“Normal” is the median of 1991–2020, the standard climate period. Using the median keeps one extreme year from skewing it.",
  },
  {
    title: "Is a trend real?",
    body: "We use the Mann-Kendall test, which asks whether values rise or fall consistently over time, and call a trend real when p < 0.05. Sen’s slope gives its size. Both are standard in hydrology and robust to extreme years.",
  },
  {
    title: "Limits",
    body: "NLDAS cells are about 12 km wide, so values describe the whole watershed, not one slope. Mann-Kendall assumes years are independent; strong year-to-year memory can overstate significance.",
  },
];

export const SOURCES = [
  {
    label: "Seattle Public Utilities: Water system",
    url: "https://www.seattle.gov/utilities/your-services/water/water-system",
  },
  {
    label: "Seattle Public Utilities: Water supply conditions",
    url: "https://seattle.gov/utilities/your-services/water/water-supply-conditions",
  },
  {
    label: "WA State Climate Office: December 2025 weather events",
    url: "https://climate.uw.edu/2026/01/12/december-notable-weather-events/",
  },
  {
    label: "WA State Climate Office: April 2026 snowpack and drought",
    url: "https://climate.uw.edu/2026/05/12/april-2026-snowpack-and-drought-summary/",
  },
  {
    label: "Seattle Public Utilities: Residential water rates",
    url: "https://seattle.gov/utilities/your-services/accounts-and-payments/rates/water/residential-water-rates",
  },
  {
    label: "Seattle Public Utilities: Peak-season and third-tier rates",
    url: "https://www.seattle.gov/utilities/services/water/water-rates/master-meter-residential",
  },
  {
    label: "NACWA 2021: Why Seattle utility rates are rising",
    url: "https://www.nacwa.org/news-publications/news-detail/2021/05/11/seattle-council-approves-plan-to-raise-water-sewage-waste-and-drainage-rates-more-than-20-by-2026",
  },
  {
    label: "Mote et al. 2008: Has spring snowpack declined in the Washington Cascades?",
    url: "https://hess.copernicus.org/articles/12/193/2008/",
  },
  {
    label: "University of Washington 2009: Warming is affecting Cascades snowpack",
    url: "https://www.washington.edu/news/2009/05/14/any-way-you-slice-it-warming-climate-is-affecting-cascades-snowpack-2/",
  },
];
