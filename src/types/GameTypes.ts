/**
 * NTXUVA – Game Types
 *
 * Board layout (4 rows × ColCount columns):
 *
 *   Row 3 ──── Computer DEFENSE  (outer / back)
 *   Row 2 ──── Computer ATTACK   (inner / front, closest to human)
 *   ─── divider ───────────────────────────────────────
 *   Row 1 ──── Human ATTACK      (inner / front, closest to computer)
 *   Row 0 ──── Human DEFENSE     (outer / back)
 *
 * Anti-clockwise circulation per player:
 *   Human    : row 1 moves LEFT → wraps to row 0 → moves RIGHT → wraps to row 1
 *   Computer : row 2 moves RIGHT → wraps to row 3 → moves LEFT → wraps to row 2
 */

/** 0 = computer, 1 = human */
export type Player = 0 | 1;

/** Supported column counts */
export type ColCount = 7 | 16 | 22;

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameStatus = 'playing' | 'won' | 'lost' | 'tie';

/** Mutable 2D board – number[4][ColCount] */
export type Board = number[][];

/** [row, col] tuple */
export type Position = [number, number];

/** A selectable starting house for a move */
export interface Move {
  readonly row: number;
  readonly col: number;
}

export interface MoveResult {
  readonly board: Board;
  readonly captured: number;
  readonly capturedPositions: ReadonlyArray<Position>;
  readonly finalRow: number;
  readonly finalCol: number;
}

export interface GameEndResult {
  readonly over: boolean;
  readonly winner: Player | null;
}

export interface GameSettings {
  readonly cols: ColCount;
  readonly difficulty: Difficulty;
}

/** Row indices for a player's inner (attack) and outer (defense) rows */
export interface PlayerRows {
  readonly inner: number; // attack row
  readonly outer: number; // defense row
}

export const PLAYER_ROWS: Record<Player, PlayerRows> = {
  1: { inner: 1, outer: 0 }, // human
  0: { inner: 2, outer: 3 }, // computer
} as const;
