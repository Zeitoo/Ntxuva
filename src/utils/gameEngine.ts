/**
 * NTXUVA – Game Engine  (pure functions, no React)
 *
 * Key rules implemented here:
 *
 * 1. Phase is PER-PLAYER.
 *    getPhaseForPlayer(board, player):
 *      Phase 1 → player has ≥ 1 house with > 1 piece.  Must pick > 1 house.
 *      Phase 2 → player has NO house with > 1 piece.   Free to pick any ≥ 1 house.
 *
 * 2. Continuation (Phase 1 only) – "pick 1" rule.
 *    When the last placed piece lands on a NON-EMPTY house:
 *      – Take exactly ONE piece from that house (house count decreases by 1).
 *      – Continue distributing with that 1 piece.
 *    When the last placed piece lands on an EMPTY house → stop, check capture.
 *
 *    Example verified against the manual:
 *      inner row: [0,0,0,1,0,2,0,0]
 *      Pick col5 (2). Distribute left:
 *        col4 ← 1 (was 0).  col3 ← 1 (was 1 → now 2 → pick 1 → 1).  col2 ← 1 (was 0). STOP.
 *      Result: [0,0,1,1,1,0,0,0]  ✓
 *
 * 3. Phase 2 distribution.
 *    Pick 1 piece, move it exactly 1 step anti-clockwise. No continuation.
 *
 * 4. Game end.
 *    Over ONLY when a player's total piece count is 0.
 *    Never ends solely because of no valid moves.
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

export function initBoard(cols: ColCount): Board {
  return Array.from({ length: 4 }, () => Array<number>(cols).fill(2));
}

// ─────────────────────────────────────────────
// Per-player phase
// ─────────────────────────────────────────────

/**
 * Returns the phase for a specific player.
 *   1 → player has at least one house with > 1 piece (must pick > 1 house)
 *   2 → all of the player's houses have ≤ 1 piece   (free to pick any ≥ 1 house)
 */
export function getPhaseForPlayer(board: Board, player: Player): 1 | 2 {
  const { inner, outer } = PLAYER_ROWS[player];
  const cols = board[0].length;
  for (const row of [inner, outer]) {
    for (let col = 0; col < cols; col++) {
      if (board[row][col] > 1) return 1;
    }
  }
  return 2;
}

// ─────────────────────────────────────────────
// Anti-clockwise movement
// ─────────────────────────────────────────────

/**
 * Human circuit (rows 0–1):
 *   row 1 (inner/attack) → moves LEFT  (col--)
 *   at col 0 wraps to row 0 col 0
 *   row 0 (outer/defense) → moves RIGHT (col++)
 *   at last col wraps to row 1 last col
 */
function humanNextPos(row: number, col: number, cols: number): Position {
  if (row === 1) return col > 0 ? [1, col - 1] : [0, 0];
  return col < cols - 1 ? [0, col + 1] : [1, cols - 1];
}

/**
 * Computer circuit (rows 2–3):
 *   row 2 (inner/attack) → moves RIGHT (col++)
 *   at last col wraps to row 3 last col
 *   row 3 (outer/defense) → moves LEFT  (col--)
 *   at col 0 wraps to row 2 col 0
 */
function computerNextPos(row: number, col: number, cols: number): Position {
  if (row === 2) return col < cols - 1 ? [2, col + 1] : [3, cols - 1];
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
 * Returns all valid starting houses for `player` on the current board.
 *
 *  Phase 1 → only houses with > 1 piece on the player's rows.
 *  Phase 2 → any house with ≥ 1 piece on the player's rows.
 */
export function getValidMoves(board: Board, player: Player): Move[] {
  const phase = getPhaseForPlayer(board, player);
  const { inner, outer } = PLAYER_ROWS[player];
  const cols = board[0].length;
  const moves: Move[] = [];

  for (const row of [inner, outer]) {
    for (let col = 0; col < cols; col++) {
      const count = board[row][col];
      if (phase === 1 && count > 1) moves.push({ row, col });
      else if (phase === 2 && count >= 1) moves.push({ row, col });
    }
  }
  return moves;
}

// ─────────────────────────────────────────────
// Move execution
// ─────────────────────────────────────────────

/**
 * Execute a move and return the new board state plus capture information.
 *
 * Phase 1  ("pick 1" continuation):
 *   1. Pick ALL pieces from the starting house (house → 0).
 *   2. Distribute 1 piece per house anti-clockwise.
 *   3. When the last piece lands on a NON-EMPTY house (prevCount > 0):
 *        – Decrement that house by 1 (pick 1 piece back up).
 *        – Set pieces = 1 and continue from step 2.
 *   4. When the last piece lands on an EMPTY house (prevCount === 0):
 *        – Stop distribution.
 *        – Run capture check.
 *
 * Phase 2  (single-step free move):
 *   1. Remove 1 piece from the chosen house.
 *   2. Add it to the very next house in anti-clockwise order.
 *   3. No continuation.
 *   4. Run capture check on the destination.
 *
 * The circuit path guarantees termination: the original starting house
 * was set to 0 (Phase 1) or decremented (Phase 2), so the path will
 * eventually encounter an empty house.
 */
export function doMove(
  board: Board,
  player: Player,
  startRow: number,
  startCol: number,
): MoveResult {
  const nb: Board = board.map((r) => [...r]);
  const phase = getPhaseForPlayer(board, player);
  const cols = nb[0].length;

  const capturedPositions: Position[] = [];
  let captured = 0;
  let finalRow = startRow;
  let finalCol = startCol;

  if (phase === 2) {
    // ── Phase 2: single 1-step move ──────────────────────────────────────
    nb[startRow][startCol]--;                         // remove 1 piece
    const [nr, nc] = getNextPos(startRow, startCol, player, cols);
    const prevDest = nb[nr][nc];
    nb[nr][nc]++;
    finalRow = nr;
    finalCol = nc;

    if (prevDest === 0) {
      resolveCapture(nb, player, nr, nc, capturedPositions, (n) => { captured += n; });
    }
  } else {
    // ── Phase 1: pick-all distribute with "pick-1" continuation ──────────
    let pieces = nb[startRow][startCol];
    nb[startRow][startCol] = 0;
    let currRow = startRow;
    let currCol = startCol;

    while (pieces > 0) {
      const [nr, nc] = getNextPos(currRow, currCol, player, cols);
      currRow = nr;
      currCol = nc;

      const prevCount = nb[currRow][currCol];
      nb[currRow][currCol]++;
      pieces--;

      if (pieces === 0) {
        finalRow = currRow;
        finalCol = currCol;

        if (prevCount === 0) {
          // Landed on empty house → stop & check capture
          resolveCapture(nb, player, currRow, currCol, capturedPositions, (n) => {
            captured += n;
          });
        } else {
          // Landed on non-empty house → pick exactly 1 piece and continue
          nb[currRow][currCol]--;   // take 1 back (house retains prevCount)
          pieces = 1;
        }
      }
    }
  }

  return { board: nb, captured, capturedPositions, finalRow, finalCol };
}

// ─────────────────────────────────────────────
// Capture resolution
// ─────────────────────────────────────────────

/**
 * Applies capture rules §3.1 / §3.2a / §3.2b / §3.3 (manual).
 * Mutates `nb` in place.
 *
 * §3.1  Last piece in defense row          → no capture (strategic move).
 * §3.2a Last piece in empty inner-attack,
 *        opponent inner row > 0            → capture inner row.
 * §3.2b … and opponent outer row > 0       → also capture outer row.
 * §3.3  Opponent inner row = 0             → no capture (inoffensive attack).
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
  if (row !== innerAttack) return;   // §3.1

  const oppPlayer = (1 - player) as Player;
  const { inner: oppInner, outer: oppOuter } = PLAYER_ROWS[oppPlayer];
  const oppInnerCount = nb[oppInner][col];
  const oppOuterCount = nb[oppOuter][col];

  if (oppInnerCount === 0) return;   // §3.3

  // §3.2a
  addCaptured(oppInnerCount);
  capturedPositions.push([oppInner, col]);
  nb[oppInner][col] = 0;

  // §3.2b
  if (oppOuterCount > 0) {
    addCaptured(oppOuterCount);
    capturedPositions.push([oppOuter, col]);
    nb[oppOuter][col] = 0;
  }
}

// ─────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────

export function countPieces(board: Board, player: Player): number {
  const { inner, outer } = PLAYER_ROWS[player];
  return (
    board[inner].reduce((s, p) => s + p, 0) +
    board[outer].reduce((s, p) => s + p, 0)
  );
}

/**
 * The game ends ONLY when a player's total piece count reaches 0.
 * (No end triggered by "no valid moves" — if a player has pieces they
 *  always have at least one valid house to play.)
 */
export function checkGameEnd(board: Board): GameEndResult {
  const h = countPieces(board, 1);
  const c = countPieces(board, 0);
  if (h === 0 && c === 0) return { over: true, winner: null };
  if (h === 0)            return { over: true, winner: 0 };
  if (c === 0)            return { over: true, winner: 1 };
  return { over: false, winner: null };
}
