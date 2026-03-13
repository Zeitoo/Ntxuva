/**
 * NTXUVA – Game Engine
 * Pure functions. No React, no side-effects.
 *
 * Board rows:
 *   0 = human defense (outer)
 *   1 = human attack  (inner)  ← pieces circulate LEFT here
 *   2 = computer attack (inner) ← pieces circulate RIGHT here
 *   3 = computer defense (outer)
 */

import type {
  Board,
  ColCount,
  GameEndResult,
  Move,
  MoveResult,
  Player,
  Position,
} from '../types/GameTypes';
import { PLAYER_ROWS } from '../types/GameTypes';

// ─────────────────────────────────────────────
// Initialisation
// ─────────────────────────────────────────────

/** Fresh board: 4 rows × cols columns, 2 pieces per house. */
export function initBoard(cols: ColCount): Board {
  return Array.from({ length: 4 }, () => Array<number>(cols).fill(2));
}

// ─────────────────────────────────────────────
// Phase detection
// ─────────────────────────────────────────────

/**
 * Phase 1: at least one house still holds more than 1 piece.
 * Phase 2: every house holds 0 or 1 piece. Each piece moves individually.
 */
export function getPhase(board: Board): 1 | 2 {
  for (const row of board) {
    for (const pieces of row) {
      if (pieces > 1) return 1;
    }
  }
  return 2;
}

// ─────────────────────────────────────────────
// Anti-clockwise movement helpers
// ─────────────────────────────────────────────

/**
 * Human anti-clockwise path  (rows 0–1):
 *   inner row (1): col → col-1; at col 0 wrap to outer row col 0
 *   outer row (0): col → col+1; at last col wrap to inner row last col
 */
function humanNextPos(row: number, col: number, cols: number): Position {
  if (row === 1) {
    return col > 0 ? [1, col - 1] : [0, 0];
  }
  return col < cols - 1 ? [0, col + 1] : [1, cols - 1];
}

/**
 * Computer anti-clockwise path (rows 2–3):
 *   inner row (2): col → col+1; at last col wrap to outer row last col
 *   outer row (3): col → col-1; at col 0 wrap to inner row col 0
 */
function computerNextPos(row: number, col: number, cols: number): Position {
  if (row === 2) {
    return col < cols - 1 ? [2, col + 1] : [3, cols - 1];
  }
  return col > 0 ? [3, col - 1] : [2, 0];
}

function getNextPos(row: number, col: number, player: Player, cols: number): Position {
  return player === 1
    ? humanNextPos(row, col, cols)
    : computerNextPos(row, col, cols);
}

// ─────────────────────────────────────────────
// Valid-move enumeration
// ─────────────────────────────────────────────

/**
 * Returns all valid starting houses for the player given the current phase.
 * Phase 1: any house on the player's side with > 1 piece.
 * Phase 2: any house on the player's side with exactly 1 piece.
 */
export function getValidMoves(board: Board, player: Player): Move[] {
  const phase = getPhase(board);
  const { inner, outer } = PLAYER_ROWS[player];
  const cols = board[0].length;
  const moves: Move[] = [];

  for (const row of [inner, outer]) {
    for (let col = 0; col < cols; col++) {
      const count = board[row][col];
      if (phase === 1 && count > 1) moves.push({ row, col });
      else if (phase === 2 && count === 1) moves.push({ row, col });
    }
  }
  return moves;
}

// ─────────────────────────────────────────────
// Move execution
// ─────────────────────────────────────────────

/**
 * Execute a move and return the resulting board + capture info.
 *
 * Phase 1 distribution rules:
 *   • Pick up all pieces from the chosen house (house → 0).
 *   • Distribute one piece per house in anti-clockwise order.
 *   • If the LAST piece lands in a NON-EMPTY house → continuation:
 *       pick up all pieces from that house and keep distributing.
 *   • If the LAST piece lands in an EMPTY house → stop; check capture.
 *
 * Phase 2 rule:
 *   • The chosen house has exactly 1 piece; move it exactly 1 step.
 *   • No continuation regardless of the destination.
 *   • Capture only if destination was empty and is the inner-attack row.
 *
 * Capture rules (manual §3.2, §3.3):
 *   §3.2a  last piece → empty inner-attack house,
 *           opponent's inner row at same col has pieces  → capture inner.
 *   §3.2b  same as above AND opponent's outer row also has pieces → capture both.
 *   §3.3a/b opponent's inner row is empty → no capture (inoffensive).
 *   §3.1   last piece → defense row → no capture (strategic / defensive move).
 */
export function doMove(
  board: Board,
  player: Player,
  startRow: number,
  startCol: number,
): MoveResult {
  // Deep-copy to avoid mutating caller's state
  const nb: Board = board.map((r) => [...r]);
  const phase = getPhase(board);
  const cols = nb[0].length;

  let pieces = nb[startRow][startCol];
  nb[startRow][startCol] = 0;

  let currRow = startRow;
  let currCol = startCol;
  let finalRow = startRow;
  let finalCol = startCol;

  const capturedPositions: Position[] = [];
  let captured = 0;

  while (pieces > 0) {
    const [nextRow, nextCol] = getNextPos(currRow, currCol, player, cols);
    currRow = nextRow;
    currCol = nextCol;

    const prevCount = nb[currRow][currCol]; // count BEFORE placing the piece
    nb[currRow][currCol]++;
    pieces--;

    if (pieces === 0) {
      finalRow = currRow;
      finalCol = currCol;

      if (prevCount === 0) {
        // ── Last piece landed in an EMPTY house ──────────────────────────
        resolveCapture(nb, player, finalRow, finalCol, capturedPositions, (n) => {
          captured += n;
        });
      } else if (phase === 1) {
        // ── Phase-1 continuation: non-empty landing ──────────────────────
        // Pick up all pieces from this house and continue distributing.
        pieces = nb[currRow][currCol];
        nb[currRow][currCol] = 0;
      }
      // Phase 2 + non-empty landing → just stop, no capture.
    }
  }

  return { board: nb, captured, capturedPositions, finalRow, finalCol };
}

/**
 * Mutates `nb` to apply capture rules when the last piece landed
 * in an empty house at (row, col).
 */
function resolveCapture(
  nb: Board,
  player: Player,
  row: number,
  col: number,
  capturedPositions: Position[],
  addCaptured: (n: number) => void,
): void {
  const { inner: innerAttack } = PLAYER_ROWS[player];
  if (row !== innerAttack) return; // §3.1 – defensive move, no capture

  const { inner: oppInnerRow, outer: oppOuterRow } = PLAYER_ROWS[(1 - player) as Player];
  const oppInnerCount = nb[oppInnerRow][col];
  const oppOuterCount = nb[oppOuterRow][col];

  if (oppInnerCount === 0) return; // §3.3a / §3.3b – inoffensive attack

  // §3.2a – capture opponent's inner (attack) row
  addCaptured(oppInnerCount);
  capturedPositions.push([oppInnerRow, col]);
  nb[oppInnerRow][col] = 0;

  if (oppOuterCount > 0) {
    // §3.2b – also capture opponent's outer (defense) row
    addCaptured(oppOuterCount);
    capturedPositions.push([oppOuterRow, col]);
    nb[oppOuterRow][col] = 0;
  }
}

// ─────────────────────────────────────────────
// Utility / end-condition helpers
// ─────────────────────────────────────────────

/** Sum of all pieces belonging to a player. */
export function countPieces(board: Board, player: Player): number {
  const { inner, outer } = PLAYER_ROWS[player];
  return (
    board[inner].reduce((s, p) => s + p, 0) +
    board[outer].reduce((s, p) => s + p, 0)
  );
}

/**
 * Check if the game is over.
 * The game ends when a player has 0 pieces, or when a player has no valid moves.
 */
export function checkGameEnd(board: Board): GameEndResult {
  const humanPieces = countPieces(board, 1);
  const compPieces = countPieces(board, 0);

  if (humanPieces === 0 && compPieces === 0) return { over: true, winner: null };
  if (humanPieces === 0) return { over: true, winner: 0 };
  if (compPieces === 0) return { over: true, winner: 1 };

  const humanMoves = getValidMoves(board, 1);
  const compMoves = getValidMoves(board, 0);

  if (humanMoves.length === 0 && compMoves.length === 0) return { over: true, winner: null };
  if (humanMoves.length === 0) return { over: true, winner: 0 };
  if (compMoves.length === 0) return { over: true, winner: 1 };

  return { over: false, winner: null };
}
