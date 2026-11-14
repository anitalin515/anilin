import { HighScoreData } from './types';

const HIGH_SCORE_KEY = 'patisserie_cake_stack_records_v1';

const DEFAULT_RECORDS: HighScoreData = {
  bestScore: 0,
  bestLayers: 0,
  bestCombo: 0,
};

export function loadHighScores(): HighScoreData {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    if (!raw) return { ...DEFAULT_RECORDS };
    const parsed = JSON.parse(raw) as Partial<HighScoreData>;
    return {
      bestScore: typeof parsed.bestScore === 'number' && parsed.bestScore >= 0 ? parsed.bestScore : 0,
      bestLayers:
        typeof parsed.bestLayers === 'number' && parsed.bestLayers >= 0 ? parsed.bestLayers : 0,
      bestCombo:
        typeof parsed.bestCombo === 'number' && parsed.bestCombo >= 0 ? parsed.bestCombo : 0,
    };
  } catch {
    return { ...DEFAULT_RECORDS };
  }
}

export function saveHighScores(
  score: number,
  layers: number,
  maxCombo: number
): { records: HighScoreData; isNewScoreRecord: boolean } {
  const prev = loadHighScores();
  const isNewScoreRecord = score > prev.bestScore && score > 0;
  const updated: HighScoreData = {
    bestScore: Math.max(prev.bestScore, score),
    bestLayers: Math.max(prev.bestLayers, layers),
    bestCombo: Math.max(prev.bestCombo, maxCombo),
  };

  try {
    localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }

  return { records: updated, isNewScoreRecord };
}
