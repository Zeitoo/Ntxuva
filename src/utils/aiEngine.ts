/**
 * NTXUVA – AI Engine
 *
 * Three difficulty levels:
 *   easy   – random valid move.
 *   medium – prefer moves that capture the most pieces.
 *   hard   – minimax with alpha-beta pruning (depth 3).
 *
 * The AI always plays as Player 0 (computer).
 */

import type { Board, Difficulty, Move } from "../types/GameTypes";
import { checkGameEnd, countPieces, doMove, getValidMoves } from "./gameEngine";

// ─────────────────────────────────────────────
// Static evaluation
// ─────────────────────────────────────────────

/**
 * Static board score from the computer's perspective.
 * Positive → good for computer (player 0).
 */
function scoreBoard(board: Board): number {
	return countPieces(board, 0) - countPieces(board, 1);
}

// ─────────────────────────────────────────────
// Minimax with alpha-beta pruning
// ─────────────────────────────────────────────

/**
 * Returns the minimax value of `board` for the maximizing player (computer = 0).
 *
 * @param board       Current board state.
 * @param depth       Remaining search depth.
 * @param isMaximizing  true = computer's turn, false = human's turn.
 * @param alpha       Best value the maximizer can guarantee (–∞ initially).
 * @param beta        Best value the minimizer can guarantee (+∞ initially).
 */
function minimax(
	board: Board,
	depth: number,
	isMaximizing: boolean,
	alpha: number,
	beta: number
): number {
	const { over, winner } = checkGameEnd(board);
	if (over) {
		// Prefer faster wins / slower losses → incorporate depth
		if (winner === 0) return 10_000 + depth;
		if (winner === 1) return -10_000 - depth;
		return 0; // draw
	}
	if (depth === 0) return scoreBoard(board);

	const player = isMaximizing ? (0 as const) : (1 as const);
	const moves = getValidMoves(board, player);
	if (moves.length === 0) return scoreBoard(board);

	if (isMaximizing) {
		let best = -Infinity;
		for (const move of moves) {
			const { board: nb } = doMove(board, player, move.row, move.col);
			const val = minimax(nb, depth - 1, false, alpha, beta);
			if (val > best) best = val;
			if (best > alpha) alpha = best;
			if (beta <= alpha) break; // β-cutoff
		}
		return best;
	}

	let best = Infinity;
	for (const move of moves) {
		const { board: nb } = doMove(board, player, move.row, move.col);
		const val = minimax(nb, depth - 1, true, alpha, beta);
		if (val < best) best = val;
		if (best < beta) beta = best;
		if (beta <= alpha) break; // α-cutoff
	}
	return best;
}

// ─────────────────────────────────────────────
// Public interface
// ─────────────────────────────────────────────

/**
 * Select the best move for the computer (player 0).
 * Returns `null` if there are no valid moves.
 */

const depthMap = {
	easy: 1,
	medium: 4,
	hard: 10,
};

export function getAIMove(board: Board, difficulty: Difficulty): Move | null {
	const moves = getValidMoves(board, 0);
	if (moves.length === 0) return null;

	const depth = depthMap[difficulty];

	let bestScore = -Infinity;
	let bestMove: Move = moves[0];

	for (const move of moves) {
		const { board: nb } = doMove(board, 0, move.row, move.col);
		const score = minimax(nb, depth, false, -Infinity, Infinity);

		if (score > bestScore) {
			bestScore = score;
			bestMove = move;
		}
	}

	return bestMove;
}
