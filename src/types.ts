export type ElectionType = "federal" | "state" | "local" | "by-election";

export type Election = {
  id: string;              // e.g. "2022-federal", "2024-newcastle-local"
  name: string;             // "2022 Federal Election"
  date: string;              // ISO date
  type: ElectionType;
  division: string;          // electorate or ward name at time of election
  parentType?: "federal" | "state" | "local"; // for by-elections, which level
};

export type ContestResult = {
  electionId: string;
  contestName: string;       // e.g. "House of Representatives" or ward/mayoral
  party: string;              // "GRN", "ALP", "LNP", "IND", etc.
  votes: number;
  percentage: number;         // first preference %
  division?: string;          // electorate or ward name at time of election for this booth
  boothName?: string;
};

export type PollingPlaceType = "ordinary" | "pre-poll" | "postal" | "absent" | "other-dec";

export type BoothGroup = {
  slug: string;           // e.g. "tighes-hill"
  displayName: string;    // e.g. "Tighes Hill Public"
  rawNames: string[];     // e.g. ["Tighes Hill Public", "Newcastle TAFE"]
};

export type PollingPlace = {
  id: string;
  name: string;
  division: string;           // current division/ward
  lga?: string;                 // "City of Newcastle" | "Lake Macquarie City Council"
  lat: number;
  lng: number;
  results: ContestResult[];    // all historical results, all election types
  type?: PollingPlaceType;
  rawNames?: string[];
};
