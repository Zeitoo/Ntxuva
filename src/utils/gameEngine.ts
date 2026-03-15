/**
 * NTXUVA – Game Engine  (pure functions, no React)
 *
 * ═══════════════════════════════════════════════════════════════
 * PHASE RULES (per-player, independent)
 * ═══════════════════════════════════════════════════════════════
 *
 * getPhaseForPlayer(board, player):
 *   Phase 1 → player has ≥ 1 house with > 1 piece.
 *             MUST start the move from a house with > 1 piece.
 *   Phase 2 → ALL of the player's houses have ≤ 1 piece.
 *             FREE to start from any house with ≥ 1 piece.
 *
 * ═══════════════════════════════════════════════════════════════
 * MOVE RULES (doMove)
 * ═══════════════════════════════════════════════════════════════
 *
 * PHASE 1 move  ("pick-all + pick-1 continuation"):
 *   1. Pick ALL pieces from the chosen house (house → 0). Carry N pieces.
 *   2. Distribute 1 piece per house anti-clockwise.
 *   3a. Last piece lands on EMPTY house (prevCount = 0):
 *       → STOP.  Run capture check.
 *   3b. Last piece lands on NON-EMPTY house (prevCount ≥ 1):
 *       → Pick-1: house retains prevCount (undo the +1), carry 1.
 *       → Continue distributing.  Repeat from step 2.
 *
 * PHASE 2 move  ("1-step + conditional Phase-1 continuation"):
 *   1. Pick 1 piece from chosen 1-piece house (house: 1 → 0). Carry 1.
 *   2. Move exactly 1 step anti-clockwise.
 *   3a. Destination was EMPTY (prevCount = 0):
 *       → STOP.  Run capture check.
 *       "A move always ends when we create a 1-piece house."
 *   3b. Destination had EXACTLY 1 piece (prevCount = 1):
 *       → Destination is now 2. Pick ALL 2 (house → 0). Carry 2.
 *       → Switch to Phase-1 pick-1 mode and continue.
 *       Rationale: the 1-step action created a 2-piece house, which
 *       immediately triggers the Phase-1 distribution rule within the
 *       SAME move (verified by the manual examples below).
 *
 * Verified examples (inner/attack row only shown; human moves LEFT):
 *
 *   Phase 2 example 1  [0,0,0,0,0,1,1] ──single move──► [0,0,0,1,1,0,0]
 *     col6(1)→col5(1→2) ──pick-ALL 2──► col4(+1) col3(empty) STOP
 *     Intermediate: [0,0,0,0,0,2,0] (after 1st step, before pick-ALL)
 *
 *   Phase 2 example 2  [0,0,0,0,1,1,1] ──single move──► [0,0,0,1,2,0,0]
 *     col6→col5(1→2) pick-ALL 2 → col4(1+1=2 not-last) col3(empty) STOP
 *     Intermediate: [0,0,0,0,1,2,0]
 *
 *   Phase 2 example 3  [0,0,0,1,0,1,1,0] ──single move──► [0,0,1,1,1,0,0,0]
 *     col6→col5(1→2) pick-ALL 2 → col4(+1) col3(1→2 pick-1 → 1) col2(empty) STOP
 *     Intermediates: [0,0,0,1,0,2,0,0]  →  [0,0,0,2,1,0,0,0]
 *
 *   Phase 1 example    [0,0,0,1,0,2,0,0] ──single move──► [0,0,1,1,1,0,0,0]
 *     col5(2) pick-all 2 → col4(+1) col3(1→2 pick-1 → 1) col2(empty) STOP
 *
 * ═══════════════════════════════════════════════════════════════
 * GAME END (checkGameEnd)
 * ═══════════════════════════════════════════════════════════════
 *   The game ends ONLY when a player's total piece count reaches 0.
 *   "No valid moves" is NOT a termination condition.
 *
 * ═══════════════════════════════════════════════════════════════
 * CAPTURE RULES  (§3.1 / §3.2a / §3.2b / §3.3 of the manual)
 * ═══════════════════════════════════════════════════════════════
 *   Only fires when the LAST piece lands on an EMPTY house on the
 *   player's ATTACK (inner) row.
 *   §3.1  Last piece in own defense row             → no capture.
 *   §3.2a Opponent's attack row at same col > 0     → capture it.
 *   §3.2b …and opponent's defense row > 0           → also capture it.
 *   §3.3  Opponent's attack row = 0                 → no capture.
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

function humanNextPos(row: number, col: number, cols: number): Position {
  if (row === 1) return col > 0 ? [1, col - 1] : [0, 0];
  return col < cols - 1 ? [0, col + 1] : [1, cols - 1];
}

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

  // ── Initial pick-up ──────────────────────────────────────────────────
  let pieces: number;
  let currRow = startRow;
  let currCol = startCol;

  if (phase === 1) {
    // Phase 1: pick ALL pieces from the starting house.
    pieces = nb[startRow][startCol];
    nb[startRow][startCol] = 0;
  } else {
    // Phase 2: pick exactly 1 piece from the starting 1-piece house.
    pieces = 1;
    nb[startRow][startCol]--; // 1 → 0
  }

  // ── Continuation-mode flag ───────────────────────────────────────────
  // Starts false for Phase-2 moves; true for Phase-1 moves.
  // After the Phase-2 first-step lands on a 1-piece house, we pick-ALL
  // (2 pieces) and switch to Phase-1 pick-1 mode for the rest of the move.
  let usePickOne = (phase === 1);

  // ── Distribution loop ────────────────────────────────────────────────
  while (pieces > 0) {
    const [nr, nc] = getNextPos(currRow, currCol, player, cols);
    currRow = nr;
    currCol = nc;

    const prevCount = nb[currRow][currCol];
    nb[currRow][currCol]++;
    pieces--;

    // Only act when this was the LAST piece in hand.
    if (pieces === 0) {
      finalRow = currRow;
      finalCol = currCol;

      if (prevCount === 0) {
        // ── Landed on EMPTY house ────────────────────────────────────
        // "A move always terminates when we create a 1-piece house."
        // → STOP.  Run capture check.
        resolveCapture(nb, player, currRow, currCol, capturedPositions, (n) => {
          captured += n;
        });
        // while loop exits naturally (pieces === 0 and not re-set).

      } else if (!usePickOne) {
        // ── Phase-2 first step landed on a NON-EMPTY house ──────────
        // prevCount ≥ 1.  In Phase-2 the player's entire circuit has
        // ≤ 1 piece per house, so prevCount can only equal 1 here.
        // The destination now holds 2 pieces; pick ALL and continue in
        // Phase-1 pick-1 mode.
        pieces = nb[currRow][currCol]; // = prevCount + 1  (= 2)
        nb[currRow][currCol] = 0;
        usePickOne = true;             // switch to Phase-1 pick-1 mode

      } else {
        // ── Phase-1 (or promoted Phase-2) pick-1 continuation ───────
        // Undo the +1: house stays at prevCount.  Carry 1 piece.
        nb[currRow][currCol]--; // prevCount + 1 → prevCount
        pieces = 1;
      }
    }
  }

  return { board: nb, captured, capturedPositions, finalRow, finalCol };
}

// ─────────────────────────────────────────────
// Capture resolution  (§3.1 / §3.2a / §3.2b / §3.3)
// ─────────────────────────────────────────────

function resolveCapture(
  nb: Board,
  player: Player,
  row: number,
  col: number,
  capturedPositions: Position[],
  addCaptured: (n: number) => void,
): void {
  const { inner: innerAttack } = PLAYER_ROWS[player];
  if (row !== innerAttack) return; // §3.1 – defensive move

  const oppPlayer = (1 - player) as Player;
  const { inner: oppInner, outer: oppOuter } = PLAYER_ROWS[oppPlayer];
  const oppInnerCount = nb[oppInner][col];
  const oppOuterCount = nb[oppOuter][col];

  if (oppInnerCount === 0) return; // §3.3 – inoffensive attack

  // §3.2a – capture opponent's attack row
  addCaptured(oppInnerCount);
  capturedPositions.push([oppInner, col]);
  nb[oppInner][col] = 0;

  // §3.2b – also capture opponent's defense row if non-empty
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
 * "No valid moves" does NOT end the game.
 */
export function checkGameEnd(board: Board): GameEndResult {
  const h = countPieces(board, 1);
  const c = countPieces(board, 0);
  if (h === 0 && c === 0) return { over: true, winner: null };
  if (h === 0)            return { over: true, winner: 0 };
  if (c === 0)            return { over: true, winner: 1 };
  return { over: false, winner: null };
}
