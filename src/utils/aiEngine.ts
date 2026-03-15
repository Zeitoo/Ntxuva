/**
 * NTXUVA – Advanced AI Engine
 *
 * Features
 * --------
 * Easy   → random move
 * Medium → best capture move
 * Hard   → iterative deepening search with:
 *           - alpha-beta pruning
 *           - transposition table
 *           - zobrist hashing
 *           - move ordering
 *           - killer moves heuristic
 *           - history heuristic
 *
 * Computer = Player 0
 */

import type { Board, Difficulty, Move } from "../types/GameTypes";
import { checkGameEnd, countPieces, doMove, getValidMoves } from "./gameEngine";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const HARD_TIME_LIMIT = 5000; // ms
const MAX_PIECES = 48;
const MAX_TT_SIZE = 200000;
const MAX_KILLERS = 2;

// ─────────────────────────────────────────────
// ZOBRIST HASHING
// ─────────────────────────────────────────────

let zobrist: number[][][] = [];

function rand64(): number {
	return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

function initZobrist(board: Board) {
	const rows = board.length;
	const cols = board[0].length;

	zobrist = Array.from({ length: rows }, () =>
		Array.from({ length: cols }, () =>
			Array.from({ length: MAX_PIECES + 1 }, rand64)
		)
	);
}

function hashBoard(board: Board): number {
	let h = 0;

	for (let r = 0; r < board.length; r++) {
		for (let c = 0; c < board[r].length; c++) {
			const pieces = board[r][c];

			if (pieces <= MAX_PIECES) {
				h ^= zobrist[r][c][pieces];
			}
		}
	}

	return h;
}

// ─────────────────────────────────────────────
// TRANSPOSITION TABLE
// ─────────────────────────────────────────────

type TTEntry = {
	depth: number;
	score: number;
};

const TT = new Map<number, TTEntry>();

// ─────────────────────────────────────────────
// HEURISTICS
// ─────────────────────────────────────────────

const history: number[][][] = [];
const killerMoves: Move[][] = [];

function initHeuristics(board: Board) {
	const rows = board.length;
	const cols = board[0].length;

	for (let r = 0; r < rows; r++) {
		history[r] = [];

		for (let c = 0; c < cols; c++) {
			history[r][c] = [0, 0];
		}
	}

	for (let d = 0; d < 50; d++) {
		killerMoves[d] = [];
	}
}

// ─────────────────────────────────────────────
// BOARD EVALUATION
// ─────────────────────────────────────────────

function scoreBoard(board: Board): number {
	return countPieces(board, 0) - countPieces(board, 1);
}

// ─────────────────────────────────────────────
// MOVE ORDERING
// ─────────────────────────────────────────────

function orderMoves(
	board: Board,
	player: 0 | 1,
	moves: Move[],
	depth: number
): Move[] {
	return moves
		.map((move) => {
			let score = 0;

			const { captured } = doMove(board, player, move.row, move.col);

			score += captured * 1000;

			const killers = killerMoves[depth] || [];

			if (killers.some((k) => k.row === move.row && k.col === move.col)) {
				score += 900;
			}

			score += history[move.row]?.[move.col]?.[player] ?? 0;

			return { move, score };
		})
		.sort((a, b) => b.score - a.score)
		.map((m) => m.move);
}

// ─────────────────────────────────────────────
// MINIMAX WITH ALPHA-BETA
// ─────────────────────────────────────────────

function minimax(
	board: Board,
	depth: number,
	isMax: boolean,
	alpha: number,
	beta: number,
	ply: number,
	endTime: number
): number {
	if (Date.now() > endTime) {
		throw new Error("timeout");
	}

	const { over, winner } = checkGameEnd(board);

	if (over) {
		if (winner === 0) return 10000 + depth;
		if (winner === 1) return -10000 - depth;

		return 0;
	}

	if (depth === 0) {
		return scoreBoard(board);
	}

	const key = hashBoard(board);

	const cached = TT.get(key);

	if (cached && cached.depth >= depth) {
		return cached.score;
	}

	const player = isMax ? 0 : 1;

	let moves = getValidMoves(board, player);

	if (moves.length === 0) {
		return scoreBoard(board);
	}

	moves = orderMoves(board, player, moves, ply);

	let best = isMax ? -Infinity : Infinity;

	for (const move of moves) {
		const { board: nb } = doMove(board, player, move.row, move.col);

		const val = minimax(
			nb,
			depth - 1,
			!isMax,
			alpha,
			beta,
			ply + 1,
			endTime
		);

		if (isMax) {
			if (val > best) best = val;

			alpha = Math.max(alpha, best);

			if (beta <= alpha) {
				killerMoves[ply] ||= [];

				if (
					!killerMoves[ply].some(
						(k) => k.row === move.row && k.col === move.col
					)
				) {
					killerMoves[ply].push(move);

					if (killerMoves[ply].length > MAX_KILLERS) {
						killerMoves[ply].shift();
					}
				}

				history[move.row][move.col][player] += depth * depth;

				break;
			}
		} else {
			if (val < best) best = val;

			beta = Math.min(beta, best);

			if (beta <= alpha) {
				killerMoves[ply] ||= [];

				if (
					!killerMoves[ply].some(
						(k) => k.row === move.row && k.col === move.col
					)
				) {
					killerMoves[ply].push(move);

					if (killerMoves[ply].length > MAX_KILLERS) {
						killerMoves[ply].shift();
					}
				}

				history[move.row][move.col][player] += depth * depth;

				break;
			}
		}
	}

	TT.set(key, { depth, score: best });

	if (TT.size > MAX_TT_SIZE) {
		TT.clear();
	}

	return best;
}

// ─────────────────────────────────────────────
// ITERATIVE DEEPENING
// ─────────────────────────────────────────────

function iterativeSearch(board: Board, timeLimit: number): Move | null {
	const endTime = Date.now() + timeLimit;

	let moves = getValidMoves(board, 0);

	if (moves.length === 0) return null;

	moves = orderMoves(board, 0, moves, 0);

	let bestMove = moves[0];

	let depth = 1;

	try {
		while (true) {
			let bestScore = -Infinity;

			let currentBest = bestMove;

			for (const move of moves) {
				const { board: nb } = doMove(board, 0, move.row, move.col);

				const score = minimax(
					nb,
					depth - 1,
					false,
					-Infinity,
					Infinity,
					1,
					endTime
				);

				if (score > bestScore) {
					bestScore = score;

					currentBest = move;
				}
			}

			bestMove = currentBest;

			depth++;
		}
	} catch {
		// timeout
	}

	return bestMove;
}

// ─────────────────────────────────────────────
// PUBLIC INTERFACE
// ─────────────────────────────────────────────

export function getAIMove(board: Board, difficulty: Difficulty): Move | null {
	if (!zobrist.length) {
		initZobrist(board);
		initHeuristics(board);
	}

	const moves = getValidMoves(board, 0);

	if (moves.length === 0) return null;

	// EASY

	if (difficulty === "easy") {
		return moves[Math.floor(Math.random() * moves.length)];
	}

	// MEDIUM

	let bestMove = moves[0];
	let maxCapture = -1;

	for (const move of moves) {
		const { captured } = doMove(board, 0, move.row, move.col);

		if (captured > maxCapture) {
			maxCapture = captured;

			bestMove = move;
		}
	}

	if (difficulty === "medium") {
		return bestMove;
	}

	// HARD

	return iterativeSearch(board, HARD_TIME_LIMIT);
}
