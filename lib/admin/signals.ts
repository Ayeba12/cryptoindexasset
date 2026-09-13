import { CURRENCIES, record, type AdminState, type Currency } from "./model";

export const SIGNAL_DIRECTIONS = ["Watch", "Buy", "Sell"] as const;
export const SIGNAL_TIMEFRAMES = [
  "1 hour",
  "4 hours",
  "1 day",
  "1 week",
] as const;
export type SignalDraft = {
  title: string;
  asset: Currency;
  direction: (typeof SIGNAL_DIRECTIONS)[number];
  timeframe: (typeof SIGNAL_TIMEFRAMES)[number];
  analysis: string;
};
export type Signal = SignalDraft & {
  id: string;
  enabled: boolean;
  createdAt: string;
  status?: "Draft" | "Published" | "Withdrawn" | "Expired";
  author?: string;
  version?: number;
  expiresAt?: string | null;
  publishedAt?: string | null;
};


export function blankSignal(): SignalDraft {
  return {
    title: "",
    asset: "BTC",
    direction: "Watch",
    timeframe: "1 day",
    analysis: "",
  };
}

export function signalErrors(
  draft: SignalDraft,
): Partial<Record<keyof SignalDraft, string>> {
  const errors: Partial<Record<keyof SignalDraft, string>> = {};
  if (draft.title.trim().length < 4 || draft.title.trim().length > 100)
    errors.title = "Use 4 to 100 characters for the title.";
  if (!CURRENCIES.includes(draft.asset))
    errors.asset = "Choose a supported asset.";
  if (!SIGNAL_DIRECTIONS.includes(draft.direction))
    errors.direction = "Choose Watch, Buy or Sell.";
  if (!SIGNAL_TIMEFRAMES.includes(draft.timeframe))
    errors.timeframe = "Choose a supported timeframe.";
  if (draft.analysis.trim().length < 20 || draft.analysis.trim().length > 1500)
    errors.analysis =
      "Use 20 to 1,500 characters. Explain the reasoning and risks.";
  return errors;
}

/** Preview only. Production writes need server authorization and a database transaction. */
export function addPreviewSignal(
  state: AdminState,
  draft: SignalDraft,
  id: string,
  at: string,
) {
  if (Object.keys(signalErrors(draft)).length)
    throw new Error("Check the signal fields before saving.");
  if (!id || state.signals.some((signal) => signal.id === id))
    throw new Error("This signal was already added.");
  state.signals.unshift({
    ...draft,
    title: draft.title.trim(),
    analysis: draft.analysis.trim(),
    id,
    createdAt: at,
    enabled: false,
  });
  record(state, "Signal created", id, "Hidden preview signal created", at);
  return state;
}
