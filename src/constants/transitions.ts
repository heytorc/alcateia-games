export const transitionIds = ["static", "netflix", "tunnel", "sign", "laser", "blinds", "line"] as const;

export type TransitionId = (typeof transitionIds)[number];

export const DEFAULT_TRANSITION: TransitionId = "laser";

export const isTransitionId = (value: unknown): value is TransitionId =>
  typeof value === "string" && (transitionIds as readonly string[]).includes(value);
