/**
 * NTXUVA – Complete single-file React artifact
 *
 * Updated rules (v2):
 *   1. Game ends ONLY when a player's total piece count = 0.
 *   2. Per-player phase:
 *      Phase 1 → this player has at least one house with >1 piece → MUST pick >1 house.
 *      Phase 2 → ALL of this player's houses have ≤1 piece → FREE to pick any house with ≥1.
 *   3. "Pick-1" continuation (Phase 1):
 *      When the last piece lands on a NON-EMPTY house:
 *        – Take exactly 1 piece back from that house (house keeps previous count).
 *        – Continue distributing that 1 piece anti-clockwise.
 *      Only stops when the last piece lands on an EMPTY house → capture check.
 *   4. Phase 2 move: single 1-step move, no continuation.
 *      If landing house was empty → capture check.
 *   5. Sounds via Web Audio API (procedural, no external files).
 *
 * Board layout (4 rows × cols columns):
 *   Row 3 ── Computer DEFENSE (outer / top)
 *   Row 2 ── Computer ATTACK  (inner)
 *   ── ◆ ◆ ◆ ────────────────────────────────
 *   Row 1 ── Human   ATTACK  (inner)        ← pieces circulate LEFT
 *   Row 0 ── Human   DEFENSE (outer / base)
 *
 * Capture rules (§3.1 / §3.2a / §3.2b / §3.3 of the official manual):
 *   §3.1  Last piece in own defense row          → no capture.
 *   §3.2a Last piece in empty own attack house,
 *          opponent's attack row same col > 0    → capture opponent attack.
 *   §3.2b …and opponent's defense row > 0       → also capture opponent defense.
 *   §3.3  Opponent's attack row at same col = 0  → no capture (inoffensive).
 */

import { useState, useCallback, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Row indices per player.
 * @type {Record<0|1, {inner:number, outer:number}>}
 */
const PLAYER_ROWS = {
	1: { inner: 1, outer: 0 }, // human:   attack=row1, defense=row0
	0: { inner: 2, outer: 3 }, // computer: attack=row2, defense=row3
};

// ═══════════════════════════════════════════════════════════════════
// GAME ENGINE (pure functions)
// ═══════════════════════════════════════════════════════════════════

/** @param {number} cols @returns {number[][]} */
function initBoard(cols) {
	return Array.from({ length: 4 }, () => Array(cols).fill(2));
}

/**
 * Per-player phase:
 *   1 → player has a house with >1 piece  (must pick >1)
 *   2 → all player's houses have ≤1 piece (free to pick any)
 * @param {number[][]} board @param {0|1} player @returns {1|2}
 */
function playerPhase(board, player) {
	const { inner, outer } = PLAYER_ROWS[player];
	for (const row of [inner, outer])
		for (const p of board[row]) if (p > 1) return 1;
	return 2;
}

/**
 * Anti-clockwise next position for the human (rows 0–1).
 * Row 1 → LEFT (col--); wraps to row 0 col 0.
 * Row 0 → RIGHT (col++); wraps to row 1 last col.
 * @param {number} row @param {number} col @param {number} cols @returns {[number,number]}
 */
function humanNext(row, col, cols) {
	if (row === 1) return col > 0 ? [1, col - 1] : [0, 0];
	return col < cols - 1 ? [0, col + 1] : [1, cols - 1];
}

/**
 * Anti-clockwise next position for the computer (rows 2–3).
 * Row 2 → RIGHT (col++); wraps to row 3 last col.
 * Row 3 → LEFT  (col--); wraps to row 2 col 0.
 * @param {number} row @param {number} col @param {number} cols @returns {[number,number]}
 */
function computerNext(row, col, cols) {
	if (row === 2) return col < cols - 1 ? [2, col + 1] : [3, cols - 1];
	return col > 0 ? [3, col - 1] : [2, 0];
}

/** @param {number} row @param {number} col @param {0|1} player @param {number} cols @returns {[number,number]} */
function nextPos(row, col, player, cols) {
	return player === 1
		? humanNext(row, col, cols)
		: computerNext(row, col, cols);
}

/**
 * Returns all valid starting moves for `player`.
 * Phase 1: houses with >1.  Phase 2: any house with ≥1.
 * @param {number[][]} board @param {0|1} player @returns {{row:number,col:number}[]}
 */
function getValidMoves(board, player) {
	const phase = playerPhase(board, player);
	const { inner, outer } = PLAYER_ROWS[player];
	const cols = board[0].length;
	const moves = [];
	for (const row of [inner, outer]) {
		for (let col = 0; col < cols; col++) {
			const p = board[row][col];
			if (phase === 1 && p > 1) moves.push({ row, col });
			else if (phase === 2 && p >= 1) moves.push({ row, col });
		}
	}
	return moves;
}

/**
 * Execute one move and return the result.
 *
 * Phase 1 – "pick-1" continuation:
 *   1. Pick ALL pieces from starting house (→ 0).
 *   2. Distribute one piece per house anti-clockwise.
 *   3a. Last piece lands on EMPTY house → run capture check.  STOP.
 *   3b. Last piece lands on NON-EMPTY house → take exactly 1 piece back
 *       (house stays at prevCount), carry 1 piece, continue from step 2.
 *
 * Phase 2 – single-step move:
 *   1. Remove 1 piece from chosen house.
 *   2. Add 1 piece to the very next house.
 *   3. If landing was empty → run capture check.  No continuation.
 *
 * Capture (§3.1/§3.2a/§3.2b/§3.3):
 *   Only when last piece lands in an EMPTY house on the player's ATTACK row.
 *   Captures opponent's attack row (and also defense row if non-empty).
 *
 * @param {number[][]} board
 * @param {0|1} player
 * @param {number} startRow
 * @param {number} startCol
 * @returns {{board:number[][], captured:number, capturedPositions:[number,number][], finalRow:number, finalCol:number}}
 */
function doMove(board, player, startRow, startCol) {
	const nb = board.map((r) => [...r]);
	const phase = playerPhase(board, player);
	const cols = nb[0].length;
	const capturedPositions = [];
	let captured = 0;
	let finalRow = startRow;
	let finalCol = startCol;

	const resolveCapture = (row, col) => {
		const { inner: myInner } = PLAYER_ROWS[player];
		if (row !== myInner) return; // §3.1 defensive move
		const opp = 1 - player;
		const { inner: oppInner, outer: oppOuter } = PLAYER_ROWS[opp];
		const oppInnerCount = nb[oppInner][col];
		if (oppInnerCount === 0) return; // §3.3 inoffensive
		// §3.2a
		captured += oppInnerCount;
		capturedPositions.push([oppInner, col]);
		nb[oppInner][col] = 0;
		// §3.2b
		const oppOuterCount = nb[oppOuter][col];
		if (oppOuterCount > 0) {
			captured += oppOuterCount;
			capturedPositions.push([oppOuter, col]);
			nb[oppOuter][col] = 0;
		}
	};

	if (phase === 2) {
		// Single-step move
		nb[startRow][startCol]--;
		const [nr, nc] = nextPos(startRow, startCol, player, cols);
		const prevDest = nb[nr][nc];
		nb[nr][nc]++;
		finalRow = nr;
		finalCol = nc;
		if (prevDest === 0) resolveCapture(nr, nc);
	} else {
		// Phase 1: pick ALL, distribute with pick-1 continuation
		let pieces = nb[startRow][startCol];
		nb[startRow][startCol] = 0;
		let currRow = startRow;
		let currCol = startCol;

		while (pieces > 0) {
			const [nr, nc] = nextPos(currRow, currCol, player, cols);
			currRow = nr;
			currCol = nc;

			const prevCount = nb[currRow][currCol];
			nb[currRow][currCol]++;
			pieces--;

			if (pieces === 0) {
				finalRow = currRow;
				finalCol = currCol;
				if (prevCount === 0) {
					// Empty house → stop & check capture
					resolveCapture(currRow, currCol);
				} else {
					// Non-empty house → pick exactly 1 piece back, continue
					nb[currRow][currCol]--; // house stays at prevCount
					pieces = 1;
				}
			}
		}
	}

	return { board: nb, captured, capturedPositions, finalRow, finalCol };
}

/** @param {number[][]} board @param {0|1} player @returns {number} */
function countPieces(board, player) {
	const { inner, outer } = PLAYER_ROWS[player];
	return (
		board[inner].reduce((s, p) => s + p, 0) +
		board[outer].reduce((s, p) => s + p, 0)
	);
}

/**
 * Game ends ONLY when a player has 0 pieces.
 * @param {number[][]} board
 * @returns {{over:boolean, winner:0|1|null}}
 */
function checkGameEnd(board) {
	const h = countPieces(board, 1);
	const c = countPieces(board, 0);
	if (h === 0 && c === 0) return { over: true, winner: null };
	if (h === 0) return { over: true, winner: 0 };
	if (c === 0) return { over: true, winner: 1 };
	return { over: false, winner: null };
}

// ═══════════════════════════════════════════════════════════════════
// AI ENGINE
// ═══════════════════════════════════════════════════════════════════

function scoreBoard(board) {
	return countPieces(board, 0) - countPieces(board, 1);
}

/**
 * Minimax with alpha-beta pruning (computer = player 0 = maximizing).
 * @param {number[][]} board @param {number} depth @param {boolean} isMax
 * @param {number} alpha @param {number} beta @returns {number}
 */
function minimax(board, depth, isMax, alpha, beta) {
	const { over, winner } = checkGameEnd(board);
	if (over) {
		if (winner === 0) return 10000 + depth;
		if (winner === 1) return -10000 - depth;
		return 0;
	}
	if (depth === 0) return scoreBoard(board);
	const pl = isMax ? 0 : 1;
	const moves = getValidMoves(board, pl);
	if (moves.length === 0) return scoreBoard(board);
	if (isMax) {
		let best = -Infinity;
		for (const m of moves) {
			const { board: nb } = doMove(board, pl, m.row, m.col);
			const v = minimax(nb, depth - 1, false, alpha, beta);
			if (v > best) best = v;
			if (best > alpha) alpha = best;
			if (beta <= alpha) break;
		}
		return best;
	}
	let best = Infinity;
	for (const m of moves) {
		const { board: nb } = doMove(board, pl, m.row, m.col);
		const v = minimax(nb, depth - 1, true, alpha, beta);
		if (v < best) best = v;
		if (best < beta) beta = best;
		if (beta <= alpha) break;
	}
	return best;
}

/**
 * Choose the AI's move.
 * @param {number[][]} board @param {'easy'|'medium'|'hard'} diff
 * @returns {{row:number,col:number}|null}
 */
function getAIMove(board, diff) {
	const moves = getValidMoves(board, 0);
	if (moves.length === 0) return null;
	if (diff === "easy") return moves[Math.floor(Math.random() * moves.length)];

	// Medium & Hard: first evaluate captures
	let bestCapture = -1;
	let bestCaptureMove = moves[0];
	for (const m of moves) {
		const { captured } = doMove(board, 0, m.row, m.col);
		if (captured > bestCapture) {
			bestCapture = captured;
			bestCaptureMove = m;
		}
	}
	if (diff === "medium") return bestCaptureMove;

	// Hard: minimax depth 3
	let best = -Infinity;
	let bestHard = moves[0];
	for (const m of moves) {
		const { board: nb } = doMove(board, 0, m.row, m.col);
		const s = minimax(nb, 3, false, -Infinity, Infinity);
		if (s > best) {
			best = s;
			bestHard = m;
		}
	}
	return bestHard;
}

// ═══════════════════════════════════════════════════════════════════
// SOUND ENGINE  (Web Audio API, procedural)
// ═══════════════════════════════════════════════════════════════════

/**
 * @param {React.MutableRefObject<AudioContext|null>} ctxRef
 * @param {boolean} enabled
 * @param {number} freq
 * @param {number} dur
 * @param {OscillatorType} type
 * @param {number} vol
 * @param {number} delay
 * @param {number|undefined} freqEnd
 */
function scheduleTone(
	ctxRef,
	enabled,
	freq,
	dur,
	type = "sine",
	vol = 0.25,
	delay = 0,
	freqEnd = undefined
) {
	if (!enabled) return;
	try {
		if (!ctxRef.current || ctxRef.current.state === "closed") {
			ctxRef.current = new AudioContext();
		}
		const ac = ctxRef.current;
		if (ac.state === "suspended") void ac.resume();
		const osc = ac.createOscillator();
		const gain = ac.createGain();
		osc.connect(gain);
		gain.connect(ac.destination);
		osc.type = type;
		const t0 = ac.currentTime + delay;
		osc.frequency.setValueAtTime(freq, t0);
		if (freqEnd !== undefined)
			osc.frequency.linearRampToValueAtTime(freqEnd, t0 + dur);
		gain.gain.setValueAtTime(vol, t0);
		gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		osc.start(t0);
		osc.stop(t0 + dur + 0.01);
	} catch (_) {
		/* ignore */
	}
}

function useSounds(enabled) {
	const ctxRef = useRef(null);
	const t = useCallback(
		(f, d, tp = "sine", v = 0.25, del = 0, fe = undefined) =>
			scheduleTone(ctxRef, enabled, f, d, tp, v, del, fe),
		[enabled]
	);

	return {
		/** Soft click on house selection */
		playSelect: () => {
			t(520, 0.06, "triangle", 0.18);
			t(380, 0.05, "triangle", 0.1, 0.04);
		},
		/** Woody knock when a piece is placed */
		playPlace: () => {
			t(280, 0.1, "triangle", 0.22);
			t(180, 0.08, "triangle", 0.12, 0.04);
		},
		/** Rising two-note cue for pick-1 continuation */
		playContinuation: () => {
			t(440, 0.1, "sine", 0.2);
			t(587, 0.12, "sine", 0.18, 0.09);
		},
		/** Sharp impact + rumble on capture */
		playCapture: () => {
			t(220, 0.04, "sawtooth", 0.35);
			t(160, 0.4, "square", 0.22, 0.03, 80);
			t(320, 0.25, "sine", 0.18, 0.08);
			t(480, 0.15, "sine", 0.1, 0.18);
		},
		/** Ascending fanfare on victory */
		playWin: () => {
			[523, 659, 784, 1047].forEach((f, i) =>
				t(f, 0.3, "sine", 0.28, i * 0.14)
			);
			[523, 784].forEach((f) => t(f, 0.6, "triangle", 0.12, 4 * 0.14));
		},
		/** Descending lament on defeat */
		playLose: () => {
			[392, 349, 294, 220].forEach((f, i) =>
				t(f, 0.4, "sine", 0.22, i * 0.16)
			);
		},
		/** Short ping while AI thinks */
		playAIThink: () => t(330, 0.08, "sine", 0.1),
	};
}

// ═══════════════════════════════════════════════════════════════════
// SEED DISPLAY
// ═══════════════════════════════════════════════════════════════════

function SeedGrid({ count, isComputer }) {
	const shown = Math.min(count, 16);
	const size = shown <= 4 ? 9 : shown <= 9 ? 7 : 5;
	const color = isComputer
		? "radial-gradient(circle at 35% 30%, #e8986a, #a04828)"
		: "radial-gradient(circle at 35% 30%, #f0d070, #c88820)";
	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				gap: 2,
				alignItems: "center",
				justifyContent: "center",
				width: "75%",
				height: "75%",
			}}>
			{Array.from({ length: shown }, (_, i) => (
				<div
					key={i}
					style={{
						width: size,
						height: size,
						borderRadius: "50%",
						background: color,
						boxShadow: "0 1px 2px rgba(0,0,0,0.5)",
						flexShrink: 0,
					}}
				/>
			))}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════
// HOUSE COMPONENT
// ═══════════════════════════════════════════════════════════════════

function House({
	pieces,
	clickable,
	highlighted,
	captured,
	lastMoved,
	isComputer,
	onClick,
}) {
	const [hovered, setHovered] = useState(false);
	let border, bg, shadow;

	if (captured) {
		bg = "radial-gradient(circle at 40% 35%, #5a1010, #200808)";
		border = "#e03030";
		shadow =
			"0 0 16px rgba(224,48,48,0.7), inset 0 2px 6px rgba(0,0,0,0.6)";
	} else if (highlighted) {
		bg = "radial-gradient(circle at 40% 35%, #5a3818, #2a1808)";
		border = "#f0c040";
		shadow =
			"0 0 18px rgba(240,192,64,0.6), inset 0 2px 4px rgba(0,0,0,0.4)";
	} else if (lastMoved) {
		bg = "radial-gradient(circle at 40% 35%, #183818, #081408)";
		border = "#40d060";
		shadow =
			"0 0 12px rgba(64,208,96,0.4), inset 0 2px 6px rgba(0,0,0,0.5)";
	} else if (clickable && hovered) {
		bg = "radial-gradient(circle at 40% 35%, #4a2c10, #200e04)";
		border = "#d4a020";
		shadow =
			"0 0 14px rgba(212,160,32,0.5), inset 0 2px 4px rgba(0,0,0,0.3)";
	} else if (clickable) {
		bg = "radial-gradient(circle at 40% 35%, #3a2010, #180a04)";
		border = "rgba(212,160,32,0.6)";
		shadow =
			"0 0 8px rgba(212,160,32,0.25), inset 0 2px 6px rgba(0,0,0,0.4)";
	} else {
		bg = "radial-gradient(circle at 40% 35%, #251508, #0e0704)";
		border = isComputer ? "#2a1208" : "#1a0c06";
		shadow = "inset 0 2px 8px rgba(0,0,0,0.6)";
	}

	return (
		<div
			onClick={clickable ? onClick : undefined}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				width: "100%",
				aspectRatio: "1",
				borderRadius: "50%",
				background: bg,
				border: `2px solid ${border}`,
				boxShadow: shadow,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				position: "relative",
				cursor: clickable ? "pointer" : "default",
				transition: "all 0.18s ease",
				transform:
					clickable && hovered
						? "scale(1.07)"
						: clickable
						? "scale(1.02)"
						: "scale(1)",
				userSelect: "none",
				minWidth: 16,
				minHeight: 16,
			}}>
			{pieces > 0 && (
				<SeedGrid
					count={pieces}
					isComputer={isComputer}
				/>
			)}
			<div
				style={{
					position: "absolute",
					bottom: 2,
					right: 3,
					fontSize: 8,
					color:
						pieces > 0
							? "rgba(255,255,255,0.55)"
							: "rgba(255,255,255,0.15)",
					fontWeight: "bold",
					fontFamily: "monospace",
				}}>
				{pieces}
			</div>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════
// ROW LABEL
// ═══════════════════════════════════════════════════════════════════

function RowLabel({ label, rgb }) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 8,
				margin: "3px 0",
			}}>
			<div
				style={{ flex: 1, height: 1, background: `rgba(${rgb},0.22)` }}
			/>
			<span
				style={{
					color: `rgba(${rgb},0.55)`,
					fontSize: 8,
					letterSpacing: "0.3em",
					whiteSpace: "nowrap",
					fontFamily: "monospace",
				}}>
				{label}
			</span>
			<div
				style={{ flex: 1, height: 1, background: `rgba(${rgb},0.22)` }}
			/>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════
// PHASE BADGE
// ═══════════════════════════════════════════════════════════════════

/**
 * Small pill showing the player's current phase with a tooltip.
 */
function PhaseBadge({ phase, isHuman }) {
	const rgb = isHuman ? "212,160,32" : "224,80,40";
	const color = isHuman ? "#d4a020" : "#e05030";
	return (
		<div
			title={
				phase === 1
					? "Obrigatório: casa com >1 peça"
					: "Livre: qualquer casa com peça"
			}
			style={{
				display: "inline-block",
				background: `rgba(${rgb},0.12)`,
				border: `1px solid rgba(${rgb},0.35)`,
				borderRadius: 10,
				padding: "2px 8px",
				fontSize: 9,
				fontWeight: "bold",
				color,
				letterSpacing: "0.15em",
				cursor: "help",
			}}>
			F{phase}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════
// BOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════

function Board({
	board,
	validMoves,
	highlighted,
	capturedCells,
	lastMoved,
	busy,
	onHouseClick,
}) {
	const cols = board[0].length;
	const gap = cols <= 8 ? 6 : cols <= 16 ? 4 : 3;
	const gridStyle = {
		display: "grid",
		gridTemplateColumns: `repeat(${cols}, 1fr)`,
		gap,
		marginBottom: 3,
	};
	const hasPos = (list, r, c) =>
		list.some(([pr, pc]) => pr === r && pc === c);

	const renderRow = (rowIdx, isComputer) => (
		<div style={gridStyle}>
			{board[rowIdx].map((pieces, col) => (
				<House
					key={col}
					pieces={pieces}
					clickable={
						!busy &&
						validMoves.some(
							(m) => m.row === rowIdx && m.col === col
						)
					}
					highlighted={hasPos(highlighted, rowIdx, col)}
					captured={hasPos(capturedCells, rowIdx, col)}
					lastMoved={
						lastMoved !== null &&
						lastMoved[0] === rowIdx &&
						lastMoved[1] === col
					}
					isComputer={isComputer}
					onClick={() => onHouseClick(rowIdx, col)}
				/>
			))}
		</div>
	);

	return (
		<div
			style={{
				background:
					"linear-gradient(180deg, #4a2208 0%, #6a3410 40%, #5a2c0e 70%, #4a2208 100%)",
				borderRadius: 18,
				border: "3px solid #7a4010",
				padding: "12px 14px",
				boxShadow:
					"0 10px 50px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,200,80,0.08)",
				overflowX: "auto",
			}}>
			{/* Column index header */}
			<div style={{ ...gridStyle, marginBottom: 5 }}>
				{Array.from({ length: cols }, (_, i) => (
					<div
						key={i}
						style={{
							textAlign: "center",
							color: "rgba(212,160,32,0.3)",
							fontSize: 8,
							fontFamily: "monospace",
						}}>
						{i + 1}
					</div>
				))}
			</div>

			{/* Computer rows (top) */}
			<RowLabel
				label="← COMPUTADOR DEFESA →"
				rgb="224,80,40"
			/>
			{renderRow(3, true)}
			<RowLabel
				label="← COMPUTADOR ATAQUE →"
				rgb="224,80,40"
			/>
			{renderRow(2, true)}

			{/* Centre divider */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 8,
					margin: "10px 0",
				}}>
				<div
					style={{
						flex: 1,
						height: 1,
						background:
							"linear-gradient(90deg,transparent,rgba(212,160,32,0.3),transparent)",
					}}
				/>
				<span
					style={{
						color: "rgba(212,160,32,0.4)",
						fontSize: 11,
						letterSpacing: "0.2em",
					}}>
					◆ ◆ ◆
				</span>
				<div
					style={{
						flex: 1,
						height: 1,
						background:
							"linear-gradient(90deg,transparent,rgba(212,160,32,0.3),transparent)",
					}}
				/>
			</div>

			{/* Human rows (bottom) */}
			<RowLabel
				label="← VOCÊ ATAQUE →"
				rgb="212,160,32"
			/>
			{renderRow(1, false)}
			<RowLabel
				label="← VOCÊ DEFESA →"
				rgb="212,160,32"
			/>
			{renderRow(0, false)}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════
// OPTION BUTTON (generic)
// ═══════════════════════════════════════════════════════════════════

function OptionBtn({ value, current, label, onChange }) {
	const active = value === current;
	return (
		<button
			onClick={() => onChange(value)}
			style={{
				background: active
					? "rgba(212,160,32,0.22)"
					: "rgba(212,160,32,0.06)",
				border: `1px solid ${
					active ? "rgba(212,160,32,0.7)" : "rgba(212,160,32,0.2)"
				}`,
				borderRadius: 6,
				color: active ? "#d4a020" : "#7a5025",
				padding: "5px 11px",
				fontSize: 11,
				cursor: "pointer",
				letterSpacing: "0.08em",
				fontWeight: active ? "bold" : "normal",
				transition: "all 0.2s",
				fontFamily: "inherit",
			}}>
			{label}
		</button>
	);
}

// ═══════════════════════════════════════════════════════════════════
// GAME LOGIC HOOK
// ═══════════════════════════════════════════════════════════════════

function useGameLogic(cols, difficulty, soundEnabled) {
	const [board, setBoard] = useState(() => initBoard(cols));
	const [turn, setTurn] = useState(1);
	const [capH, setCapH] = useState(0);
	const [capC, setCapC] = useState(0);
	const [status, setStatus] = useState("playing");
	const [hl, setHl] = useState([]);
	const [capCells, setCapCells] = useState([]);
	const [lastMoved, setLastMoved] = useState(null);
	const [msg, setMsg] = useState("Sua vez! Escolha uma casa.");
	const [busy, setBusy] = useState(false);
	const [log, setLog] = useState([]);

	const sounds = useSounds(soundEnabled);
	const addLog = useCallback(
		(t) => setLog((p) => [t, ...p].slice(0, 10)),
		[]
	);

	const applyResult = useCallback(
		(result, pl) => {
			setBoard(result.board);
			setLastMoved([result.finalRow, result.finalCol]);

			if (result.captured > 0) {
				const s = result.captured > 1 ? "s" : "";
				setCapCells(result.capturedPositions);
				sounds.playCapture();
				if (pl === 1) {
					setCapH((v) => v + result.captured);
					setMsg(`Você capturou ${result.captured} peça${s}! 🎉`);
					addLog(`🟡 Capturou ${result.captured} peça${s}`);
				} else {
					setCapC((v) => v + result.captured);
					setMsg(`Computador capturou ${result.captured} peça${s}!`);
					addLog(`🔴 Comp. capturou ${result.captured} peça${s}`);
				}
			} else {
				setCapCells([]);
				sounds.playPlace();
				setMsg(pl === 1 ? "Movimento realizado." : "Computador jogou.");
			}

			const end = checkGameEnd(result.board);
			if (end.over) {
				if (end.winner === 1) {
					setStatus("won");
					setMsg("🏆 Você ganhou! Parabéns!");
					sounds.playWin();
				} else if (end.winner === 0) {
					setStatus("lost");
					setMsg("💀 Computador venceu!");
					sounds.playLose();
				} else {
					setStatus("tie");
					setMsg("🤝 Empate!");
				}
				setBusy(false);
				setHl([]);
				return true;
			}
			return false;
		},
		[sounds, addLog]
	);

	// Human move
	const handleHumanMove = useCallback(
		(row, col) => {
			if (busy || turn !== 1 || status !== "playing") return;
			const valid = getValidMoves(board, 1);
			if (!valid.some((m) => m.row === row && m.col === col)) return;
			sounds.playSelect();
			setBusy(true);
			setHl([[row, col]]);
			setCapCells([]);
			const rowName = PLAYER_ROWS[1].inner === row ? "ataque" : "defesa";
			addLog(`🟡 ${rowName} col ${col + 1}`);
			setTimeout(() => {
				const result = doMove(board, 1, row, col);
				const ended = applyResult(result, 1);
				if (!ended) {
					setTurn(0);
					setMsg("Computador pensando…");
					setTimeout(() => {
						setHl([]);
						setCapCells([]);
						setBusy(false);
					}, 400);
				}
			}, 300);
		},
		[busy, turn, status, board, sounds, applyResult, addLog]
	);

	// AI move
	useEffect(() => {
		if (turn !== 0 || status !== "playing" || busy) return;
		const delay = difficulty === "hard" ? 1100 : 800;
		const t = setTimeout(() => {
			sounds.playAIThink();
			const aiMove = getAIMove(board, difficulty);
			if (!aiMove) {
				setTurn(1);
				setMsg("Computador sem movimentos. Sua vez!");
				return;
			}
			setBusy(true);
			setHl([[aiMove.row, aiMove.col]]);
			const rowName =
				PLAYER_ROWS[0].inner === aiMove.row ? "ataque" : "defesa";
			addLog(`🔴 ${rowName} col ${aiMove.col + 1}`);
			setTimeout(() => {
				const result = doMove(board, 0, aiMove.row, aiMove.col);
				const ended = applyResult(result, 0);
				if (!ended) {
					setTimeout(() => {
						setTurn(1);
						setMsg("Sua vez! Escolha uma casa.");
						setHl([]);
						setCapCells([]);
						setBusy(false);
					}, 500);
				}
			}, 350);
		}, delay);
		return () => clearTimeout(t);
	}, [turn, status, board, difficulty, busy, sounds, applyResult, addLog]);

	const resetGame = useCallback(() => {
		setBoard(initBoard(cols));
		setTurn(1);
		setCapH(0);
		setCapC(0);
		setStatus("playing");
		setMsg("Sua vez! Escolha uma casa.");
		setBusy(false);
		setHl([]);
		setCapCells([]);
		setLastMoved(null);
		setLog([]);
	}, [cols]);

	return {
		board,
		turn,
		capH,
		capC,
		status,
		validMoves:
			status === "playing" && turn === 1 ? getValidMoves(board, 1) : [],
		hl,
		capCells,
		lastMoved,
		msg,
		busy,
		log,
		humanPhase: playerPhase(board, 1),
		compPhase: playerPhase(board, 0),
		humanPieces: countPieces(board, 1),
		compPieces: countPieces(board, 0),
		handleHumanMove,
		resetGame,
	};
}

// ═══════════════════════════════════════════════════════════════════
// GAME VIEW  (remounts on key change)
// ═══════════════════════════════════════════════════════════════════

function GameView({ cols, difficulty, soundEnabled }) {
	const g = useGameLogic(cols, difficulty, soundEnabled);
	return (
		<>
			{/* Scoreboard */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr auto 1fr",
					gap: 10,
					marginBottom: 12,
					alignItems: "center",
				}}>
				{/* Computer */}
				<div
					style={{
						background: "rgba(224,80,40,0.08)",
						border: "1px solid rgba(224,80,40,0.2)",
						borderRadius: 10,
						padding: "10px 14px",
					}}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							marginBottom: 4,
						}}>
						<span style={{ fontSize: 15 }}>🤖</span>
						<span
							style={{
								color: "#e05030",
								fontSize: 12,
								fontWeight: "bold",
							}}>
							COMPUTADOR
						</span>
					</div>
					<PhaseBadge
						phase={g.compPhase}
						isHuman={false}
					/>
					<div
						style={{
							color: "#a04020",
							fontSize: 11,
							marginTop: 4,
						}}>
						{g.compPieces} peças · {g.capC} cap.
					</div>
				</div>

				{/* Turn indicator */}
				<div style={{ textAlign: "center", padding: "0 4px" }}>
					<div
						style={{
							width: 12,
							height: 12,
							borderRadius: "50%",
							margin: "0 auto",
							background: g.turn === 1 ? "#f0c040" : "#e06040",
							boxShadow: `0 0 12px ${
								g.turn === 1
									? "rgba(240,192,64,0.9)"
									: "rgba(224,96,64,0.9)"
							}`,
							transition: "all 0.3s",
						}}
					/>
					<div
						style={{
							marginTop: 5,
							fontSize: 8,
							color: "rgba(212,160,32,0.4)",
							letterSpacing: "0.15em",
							whiteSpace: "nowrap",
						}}>
						{g.turn === 1 ? "Sua vez" : "DELE"}
					</div>
				</div>

				{/* Human */}
				<div
					style={{
						background: "rgba(212,160,32,0.08)",
						border: "1px solid rgba(212,160,32,0.2)",
						borderRadius: 10,
						padding: "10px 14px",
						textAlign: "right",
					}}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "flex-end",
							gap: 6,
							marginBottom: 4,
						}}>
						<span
							style={{
								color: "#d4a020",
								fontSize: 12,
								fontWeight: "bold",
							}}>
							VOCÊ
						</span>
						<span style={{ fontSize: 15 }}>👤</span>
					</div>
					<div
						style={{
							display: "flex",
							justifyContent: "flex-end",
							marginBottom: 2,
						}}>
						<PhaseBadge
							phase={g.humanPhase}
							isHuman={true}
						/>
					</div>
					<div style={{ color: "#a07030", fontSize: 11 }}>
						{g.humanPieces} peças · {g.capH} cap.
					</div>
				</div>
			</div>

			{/* Status */}
			<div
				style={{
					textAlign: "center",
					padding: "11px 16px",
					margin: "10px 0",
					background:
						g.status !== "playing"
							? "rgba(212,160,32,0.15)"
							: "rgba(212,160,32,0.07)",
					border: `1px solid ${
						g.status !== "playing"
							? "rgba(212,160,32,0.45)"
							: "rgba(212,160,32,0.18)"
					}`,
					borderRadius: 10,
					color: "#d4a020",
					fontSize: g.status !== "playing" ? 17 : 13,
					fontWeight: g.status !== "playing" ? "bold" : "normal",
					minHeight: 42,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}>
				{g.msg}
			</div>

			{/* Board */}
			<Board
				board={g.board}
				validMoves={g.validMoves}
				highlighted={g.hl}
				capturedCells={g.capCells}
				lastMoved={g.lastMoved}
				busy={g.busy}
				onHouseClick={g.handleHumanMove}
			/>

			{/* Move log */}
			<div
				style={{
					background: "rgba(0,0,0,0.2)",
					border: "1px solid rgba(212,160,32,0.1)",
					borderRadius: 10,
					padding: "8px 12px",
					marginTop: 10,
				}}>
				<div
					style={{
						color: "#7a5025",
						fontSize: 10,
						letterSpacing: "0.2em",
						marginBottom: 4,
					}}>
					HISTÓRICO
				</div>
				{g.log.length === 0 ? (
					<div
						style={{
							color: "#4a3015",
							fontSize: 11,
							fontStyle: "italic",
						}}>
						Nenhuma jogada ainda…
					</div>
				) : (
					g.log.map((e, i) => (
						<div
							key={i}
							style={{
								color: i === 0 ? "#a07030" : "#4a3015",
								fontSize: 11,
								marginBottom: 2,
							}}>
							{e}
						</div>
					))
				)}
			</div>
		</>
	);
}

// ═══════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════

export default function App() {
	const [cols, setCols] = useState(7);
	const [diff, setDiff] = useState("medium");
	const [gameKey, setGameKey] = useState(0);
	const [soundOn, setSoundOn] = useState(true);
	const bump = () => setGameKey((k) => k + 1);
	const changeCols = (c) => {
		setCols(c);
		bump();
	};
	const changeDiff = (d) => {
		setDiff(d);
		bump();
	};

	const btnStyle = (active) => ({
		background: active ? "rgba(212,160,32,0.22)" : "rgba(212,160,32,0.06)",
		border: `1px solid ${
			active ? "rgba(212,160,32,0.7)" : "rgba(212,160,32,0.2)"
		}`,
		borderRadius: 6,
		color: active ? "#d4a020" : "#7a5025",
		padding: "5px 11px",
		fontSize: 11,
		cursor: "pointer",
		fontWeight: active ? "bold" : "normal",
		transition: "all 0.2s",
		fontFamily: "inherit",
	});

	return (
		<div
			style={{
				minHeight: "100vh",
				background:
					"linear-gradient(160deg,#120a06 0%,#1e0f08 50%,#120a06 100%)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 16,
				fontFamily: "'Palatino Linotype','Book Antiqua',Palatino,serif",
				position: "relative",
				overflow: "hidden",
			}}>
			{/* Texture */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					pointerEvents: "none",
					backgroundImage: `
        radial-gradient(ellipse at 20% 50%, rgba(180,100,20,0.06) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 50%, rgba(180,100,20,0.06) 0%, transparent 60%),
        repeating-linear-gradient(-45deg,transparent,transparent 25px,rgba(180,100,20,0.025) 25px,rgba(180,100,20,0.025) 26px)`,
				}}
			/>

			<div
				style={{
					width: "100%",
					maxWidth: 1100,
					position: "relative",
					zIndex: 1,
				}}>
				{/* Title */}
				<div style={{ textAlign: "center", marginBottom: 16 }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 12,
							marginBottom: 4,
						}}>
						<div
							style={{
								height: 1,
								flex: 1,
								background:
									"linear-gradient(90deg,transparent,rgba(210,150,30,0.4))",
							}}
						/>
						<h1
							style={{
								margin: 0,
								fontSize: "clamp(28px,7vw,52px)",
								fontWeight: 900,
								letterSpacing: "0.25em",
								color: "#d4a020",
								textShadow:
									"0 0 50px rgba(212,160,32,0.35), 0 3px 0 #6b4010",
							}}>
							NTXUVA
						</h1>
						<div
							style={{
								height: 1,
								flex: 1,
								background:
									"linear-gradient(90deg,rgba(210,150,30,0.4),transparent)",
							}}
						/>
					</div>
					<p
						style={{
							margin: 0,
							color: "#7a5025",
							fontSize: 10,
							letterSpacing: "0.35em",
							textTransform: "uppercase",
						}}>
						Jogo Africano Tradicional · Humano vs Computador
					</p>
				</div>

				{/* Settings bar */}
				<div
					style={{
						display: "flex",
						gap: 8,
						flexWrap: "wrap",
						alignItems: "center",
						marginBottom: 14,
					}}>
					<span
						style={{
							color: "#7a5025",
							fontSize: 10,
							letterSpacing: "0.1em",
						}}>
						CASAS:
					</span>
					{[7, 16, 22].map((c) => (
						<button
							key={c}
							onClick={() => changeCols(c)}
							style={btnStyle(cols === c)}>
							{c}
						</button>
					))}

					<span
						style={{
							color: "#7a5025",
							fontSize: 10,
							letterSpacing: "0.1em",
							marginLeft: 10,
						}}>
						IA:
					</span>
					{[
						["easy", "Fácil"],
						["medium", "Médio"],
						["hard", "Difícil"],
					].map(([d, l]) => (
						<button
							key={d}
							onClick={() => changeDiff(d)}
							style={btnStyle(diff === d)}>
							{l}
						</button>
					))}

					{/* Sound toggle */}
					<button
						onClick={() => setSoundOn((v) => !v)}
						title={soundOn ? "Desligar som" : "Ligar som"}
						style={{
							marginLeft: 10,
							background: soundOn
								? "rgba(212,160,32,0.14)"
								: "rgba(212,160,32,0.05)",
							border: `1px solid ${
								soundOn
									? "rgba(212,160,32,0.5)"
									: "rgba(212,160,32,0.2)"
							}`,
							borderRadius: 8,
							color: soundOn ? "#d4a020" : "#5a4015",
							padding: "5px 10px",
							fontSize: 16,
							cursor: "pointer",
							transition: "all 0.2s",
						}}>
						{soundOn ? "🔊" : "🔇"}
					</button>

					{/* Reset */}
					<button
						onClick={bump}
						style={{
							background: "rgba(212,160,32,0.1)",
							border: "1px solid rgba(212,160,32,0.3)",
							borderRadius: 8,
							color: "#d4a020",
							padding: "5px 14px",
							fontSize: 11,
							cursor: "pointer",
							letterSpacing: "0.1em",
							fontWeight: "bold",
							fontFamily: "inherit",
							transition: "all 0.2s",
						}}>
						↺ REINICIAR
					</button>
				</div>

				<GameView
					key={gameKey}
					cols={cols}
					difficulty={diff}
					soundEnabled={soundOn}
				/>

				{/* Legend + Rules */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: 10,
						marginTop: 12,
					}}>
					<div
						style={{
							background: "rgba(0,0,0,0.2)",
							border: "1px solid rgba(212,160,32,0.1)",
							borderRadius: 10,
							padding: "10px 12px",
						}}>
						<div
							style={{
								color: "#7a5025",
								fontSize: 10,
								letterSpacing: "0.2em",
								marginBottom: 6,
							}}>
							LEGENDA
						</div>
						{[
							["rgba(212,160,32,0.6)", "Casa jogável"],
							["#f0c040", "Selecionada"],
							["#40d060", "Último mov."],
							["#e03030", "Capturada"],
						].map(([c, l]) => (
							<div
								key={l}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 6,
									marginBottom: 3,
								}}>
								<div
									style={{
										width: 10,
										height: 10,
										borderRadius: "50%",
										border: `2px solid ${c}`,
										flexShrink: 0,
									}}
								/>
								<span
									style={{ color: "#6a4020", fontSize: 11 }}>
									{l}
								</span>
							</div>
						))}
					</div>
					<div
						style={{
							background: "rgba(0,0,0,0.2)",
							border: "1px solid rgba(212,160,32,0.1)",
							borderRadius: 10,
							padding: "10px 12px",
						}}>
						<div
							style={{
								color: "#7a5025",
								fontSize: 10,
								letterSpacing: "0.2em",
								marginBottom: 6,
							}}>
							REGRAS CHAVE
						</div>
						{[
							"F1 (badge): obrigatório jogar de casa com >1 peça.",
							"F2 (badge): livre para qualquer casa com peça.",
							"Continuação: últ. peça em casa cheia → pega 1 e continua.",
							"§3.2b: captura fileira de ataque E defesa do adversário.",
							"Fim: um jogador fica com 0 peças.",
						].map((r) => (
							<div
								key={r}
								style={{
									color: "#6a4020",
									fontSize: 10,
									marginBottom: 3,
									lineHeight: 1.5,
								}}>
								• {r}
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
