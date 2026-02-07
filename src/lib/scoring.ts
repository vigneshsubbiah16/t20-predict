const STAKE = 100;
const STARTING_BANKROLL = 10000;

export { STAKE, STARTING_BANKROLL };

/**
 * Calculate P&L based on implied odds from confidence.
 * Win: +stake * (1/confidence - 1)
 * Loss: -stake
 */
export function calculatePnl(confidence: number, isCorrect: boolean): number {
  if (!isCorrect) return -STAKE;
  const impliedOdds = 1 / confidence;
  const profit = STAKE * (impliedOdds - 1);
  return Math.round(profit * 100) / 100;
}

/**
 * Calculate Brier score: (predicted_prob - actual)^2
 * actual = 1.0 if correct, 0.0 if incorrect
 * Lower is better (0 = perfect calibration)
 */
export function calculateBrierScore(confidence: number, isCorrect: boolean): number {
  const actual = isCorrect ? 1.0 : 0.0;
  const brier = Math.pow(confidence - actual, 2);
  return Math.round(brier * 10000) / 10000;
}
