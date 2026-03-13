import { useState, useCallback, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════
// TYPES  (JSDoc for clarity — no TypeScript any)
// ═══════════════════════════════════════════════════════════════════
/**
 * Board layout: number[4][cols]
 *   Row 0 – Human   DEFENSE  (outer / bottom)
 *   Row 1 – Human   ATTACK   (inner)       ← pieces circulate LEFT
 *   Row 2 – Computer ATTACK  (inner)       ← pieces circulate RIGHT
 *   Row 3 – Computer DEFENSE (outer / top)
 *
 * @typedef {number[][]}           Board
 * @typedef {0|1}                  Player    0=computer  1=human
 * @typedef {7|16|22}              ColCount
 * @typedef {'easy'|'medium'|'hard'} Difficulty
 * @typedef {'playing'|'won'|'lost'|'tie'} GameStatus
 * @typedef {[number,number]}      Position
 * @typedef {{row:number,col:number}} Move
 */

// ═══════════════════════════════════════════════════════════════════
// PLAYER ROWS LOOKUP
// ═══════════════════════════════════════════════════════════════════
/** @type {Record<0|1,{inner:number,outer:number}>} */
const PLAYER_ROWS = {
  1: { inner: 1, outer: 0 }, // human
  0: { inner: 2, outer: 3 }, // computer
};

// ═══════════════════════════════════════════════════════════════════
// GAME ENGINE  (pure functions)
// ═══════════════════════════════════════════════════════════════════

/** @param {ColCount} cols @returns {Board} */
function initBoard(cols) {
  return Array.from({ length: 4 }, () => Array(cols).fill(2));
}

/** @param {Board} board @returns {1|2} */
function getPhase(board) {
  for (const row of board)
    for (const p of row)
      if (p > 1) return 1;
  return 2;
}

/**
 * Anti-clockwise next position for the human player (rows 0–1).
 * Row 1 (inner/attack): moves LEFT; wraps to row 0 col 0.
 * Row 0 (outer/defense): moves RIGHT; wraps to row 1 last col.
 * @param {number} row @param {number} col @param {number} cols
 * @returns {Position}
 */
function humanNext(row, col, cols) {
  if (row === 1) return col > 0 ? [1, col - 1] : [0, 0];
  return col < cols - 1 ? [0, col + 1] : [1, cols - 1];
}

/**
 * Anti-clockwise next position for the computer player (rows 2–3).
 * Row 2 (inner/attack): moves RIGHT; wraps to row 3 last col.
 * Row 3 (outer/defense): moves LEFT; wraps to row 2 col 0.
 * @param {number} row @param {number} col @param {number} cols
 * @returns {Position}
 */
function computerNext(row, col, cols) {
  if (row === 2) return col < cols - 1 ? [2, col + 1] : [3, cols - 1];
  return col > 0 ? [3, col - 1] : [2, 0];
}

/**
 * @param {number} row @param {number} col @param {0|1} player @param {number} cols
 * @returns {Position}
 */
function getNextPos(row, col, player, cols) {
  return player === 1 ? humanNext(row, col, cols) : computerNext(row, col, cols);
}

/**
 * Returns valid starting moves for `player`.
 * Phase 1: houses with > 1 piece.  Phase 2: houses with exactly 1 piece.
 * @param {Board} board @param {0|1} player @returns {Move[]}
 */
function getValidMoves(board, player) {
  const phase = getPhase(board);
  const { inner, outer } = PLAYER_ROWS[player];
  const cols = board[0].length;
  const moves = [];
  for (const row of [inner, outer]) {
    for (let col = 0; col < cols; col++) {
      const count = board[row][col];
      if (phase === 1 && count > 1) moves.push({ row, col });
      else if (phase === 2 && count === 1) moves.push({ row, col });
    }
  }
  return moves;
}

/**
 * Execute a move and return the new board + capture info.
 *
 * Continuation (Phase 1): last piece lands on non-empty house → pick up all
 *   pieces from that house and keep distributing.
 * Stop: last piece lands on an empty house → check capture.
 *
 * Capture rules (manual §3.1 / §3.2 / §3.3):
 *   §3.1  Landed in defense row             → no capture.
 *   §3.2a Landed in empty attack row house,
 *         opponent inner row same col > 0   → capture inner.
 *   §3.2b …and opponent outer row > 0       → also capture outer.
 *   §3.3  Opponent inner row = 0            → no capture.
 *
 * @param {Board} board @param {0|1} player
 * @param {number} startRow @param {number} startCol
 * @returns {{board:Board, captured:number, capturedPositions:Position[], finalRow:number, finalCol:number}}
 */
function doMove(board, player, startRow, startCol) {
  const nb = board.map(r => [...r]);
  const phase = getPhase(board);
  const cols = nb[0].length;

  let pieces = nb[startRow][startCol];
  nb[startRow][startCol] = 0;

  let currRow = startRow;
  let currCol = startCol;
  let finalRow = startRow;
  let finalCol = startCol;
  const capturedPositions = [];
  let captured = 0;

  while (pieces > 0) {
    [currRow, currCol] = getNextPos(currRow, currCol, player, cols);
    const prevCount = nb[currRow][currCol];
    nb[currRow][currCol]++;
    pieces--;

    if (pieces === 0) {
      finalRow = currRow;
      finalCol = currCol;

      if (prevCount === 0) {
        // Landed in empty house — check capture
        const { inner: innerAttack } = PLAYER_ROWS[player];
        if (currRow === innerAttack) {
          const { inner: oppInner, outer: oppOuter } = PLAYER_ROWS[1 - player];
          const oppInnerCount = nb[oppInner][currCol];
          const oppOuterCount = nb[oppOuter][currCol];
          if (oppInnerCount > 0) {
            // §3.2a — capture opponent inner row
            captured += oppInnerCount;
            capturedPositions.push([oppInner, currCol]);
            nb[oppInner][currCol] = 0;
            if (oppOuterCount > 0) {
              // §3.2b — also capture opponent outer row
              captured += oppOuterCount;
              capturedPositions.push([oppOuter, currCol]);
              nb[oppOuter][currCol] = 0;
            }
          }
          // else §3.3 — inoffensive attack
        }
        // else §3.1 — defensive move
      } else if (phase === 1) {
        // Phase-1 continuation
        pieces = nb[currRow][currCol];
        nb[currRow][currCol] = 0;
      }
      // Phase 2 + non-empty → just stop, no capture
    }
  }

  return { board: nb, captured, capturedPositions, finalRow, finalCol };
}

/**
 * @param {Board} board @param {0|1} player @returns {number}
 */
function countPieces(board, player) {
  const { inner, outer } = PLAYER_ROWS[player];
  return (
    board[inner].reduce((s, p) => s + p, 0) +
    board[outer].reduce((s, p) => s + p, 0)
  );
}

/**
 * @param {Board} board
 * @returns {{over:boolean, winner:0|1|null}}
 */
function checkGameEnd(board) {
  const h = countPieces(board, 1);
  const c = countPieces(board, 0);
  if (h === 0 && c === 0) return { over: true, winner: null };
  if (h === 0) return { over: true, winner: 0 };
  if (c === 0) return { over: true, winner: 1 };
  const hm = getValidMoves(board, 1);
  const cm = getValidMoves(board, 0);
  if (hm.length === 0 && cm.length === 0) return { over: true, winner: null };
  if (hm.length === 0) return { over: true, winner: 0 };
  if (cm.length === 0) return { over: true, winner: 1 };
  return { over: false, winner: null };
}

// ═══════════════════════════════════════════════════════════════════
// AI ENGINE
// ═══════════════════════════════════════════════════════════════════

function scoreBoard(board) {
  return countPieces(board, 0) - countPieces(board, 1);
}

function minimax(board, depth, isMax, alpha, beta) {
  const { over, winner } = checkGameEnd(board);
  if (over) {
    if (winner === 0) return 10000 + depth;
    if (winner === 1) return -10000 - depth;
    return 0;
  }
  if (depth === 0) return scoreBoard(board);
  const player = isMax ? 0 : 1;
  const moves = getValidMoves(board, player);
  if (moves.length === 0) return scoreBoard(board);
  if (isMax) {
    let best = -Infinity;
    for (const m of moves) {
      const { board: nb } = doMove(board, player, m.row, m.col);
      const v = minimax(nb, depth - 1, false, alpha, beta);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    const { board: nb } = doMove(board, player, m.row, m.col);
    const v = minimax(nb, depth - 1, true, alpha, beta);
    if (v < best) best = v;
    if (best < beta) beta = best;
    if (beta <= alpha) break;
  }
  return best;
}

/** @param {Board} board @param {Difficulty} diff @returns {Move|null} */
function getAIMove(board, diff) {
  const moves = getValidMoves(board, 0);
  if (moves.length === 0) return null;
  if (diff === "easy") return moves[Math.floor(Math.random() * moves.length)];

  let bestCapture = -1;
  let bestCaptureMove = moves[0];
  for (const m of moves) {
    const { captured } = doMove(board, 0, m.row, m.col);
    if (captured > bestCapture) { bestCapture = captured; bestCaptureMove = m; }
  }
  if (diff === "medium") return bestCaptureMove;

  // hard: minimax depth 3
  let bestScore = -Infinity;
  let bestHard = moves[0];
  for (const m of moves) {
    const { board: nb } = doMove(board, 0, m.row, m.col);
    const s = minimax(nb, 3, false, -Infinity, Infinity);
    if (s > bestScore) { bestScore = s; bestHard = m; }
  }
  return bestHard;
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
    <div style={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", justifyContent: "center", width: "75%", height: "75%" }}>
      {Array.from({ length: shown }, (_, i) => (
        <div key={i} style={{ width: size, height: size, borderRadius: "50%", background: color, boxShadow: "0 1px 2px rgba(0,0,0,0.5)", flexShrink: 0 }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HOUSE COMPONENT
// ═══════════════════════════════════════════════════════════════════

function House({ pieces, clickable, highlighted, captured, lastMoved, isComputer, onClick }) {
  const [hovered, setHovered] = useState(false);
  let border, bg, shadow;
  if (captured) {
    bg = "radial-gradient(circle at 40% 35%, #5a1010, #200808)"; border = "#e03030";
    shadow = "0 0 16px rgba(224,48,48,0.7), inset 0 2px 6px rgba(0,0,0,0.6)";
  } else if (highlighted) {
    bg = "radial-gradient(circle at 40% 35%, #5a3818, #2a1808)"; border = "#f0c040";
    shadow = "0 0 18px rgba(240,192,64,0.6), inset 0 2px 4px rgba(0,0,0,0.4)";
  } else if (lastMoved) {
    bg = "radial-gradient(circle at 40% 35%, #183818, #081408)"; border = "#40d060";
    shadow = "0 0 12px rgba(64,208,96,0.4), inset 0 2px 6px rgba(0,0,0,0.5)";
  } else if (clickable && hovered) {
    bg = "radial-gradient(circle at 40% 35%, #4a2c10, #200e04)"; border = "#d4a020";
    shadow = "0 0 14px rgba(212,160,32,0.5), inset 0 2px 4px rgba(0,0,0,0.3)";
  } else if (clickable) {
    bg = "radial-gradient(circle at 40% 35%, #3a2010, #180a04)"; border = "rgba(212,160,32,0.6)";
    shadow = "0 0 8px rgba(212,160,32,0.25), inset 0 2px 6px rgba(0,0,0,0.4)";
  } else {
    bg = "radial-gradient(circle at 40% 35%, #251508, #0e0704)"; border = isComputer ? "#2a1208" : "#1a0c06";
    shadow = "inset 0 2px 8px rgba(0,0,0,0.6)";
  }
  return (
    <div
      onClick={clickable ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", aspectRatio: "1", borderRadius: "50%",
        background: bg, border: `2px solid ${border}`, boxShadow: shadow,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", cursor: clickable ? "pointer" : "default",
        transition: "all 0.18s ease",
        transform: clickable && hovered ? "scale(1.07)" : clickable ? "scale(1.02)" : "scale(1)",
        userSelect: "none", minWidth: 18, minHeight: 18,
      }}
    >
      {pieces > 0 && <SeedGrid count={pieces} isComputer={isComputer} />}
      <div style={{ position: "absolute", bottom: 2, right: 3, fontSize: 8, color: pieces > 0 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.15)", fontWeight: "bold", fontFamily: "monospace" }}>
        {pieces}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BOARD ROW LABEL
// ═══════════════════════════════════════════════════════════════════

function RowLabel({ label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "3px 0" }}>
      <div style={{ flex: 1, height: 1, background: `rgba(${color},0.25)` }} />
      <span style={{ color: `rgba(${color},0.6)`, fontSize: 8, letterSpacing: "0.3em", whiteSpace: "nowrap", fontFamily: "monospace" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `rgba(${color},0.25)` }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════

function Board({ board, validMoves, highlighted, capturedCells, lastMoved, busy, onHouseClick }) {
  const cols = board[0].length;
  const gap = cols <= 8 ? 6 : cols <= 16 ? 4 : 3;
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap,
    marginBottom: 3,
  };
  const posMatch = (positions, r, c) => positions.some(([pr, pc]) => pr === r && pc === c);

  const renderRow = (rowIndex, isComputer) => (
    <div style={gridStyle}>
      {board[rowIndex].map((pieces, col) => (
        <House
          key={col}
          pieces={pieces}
          clickable={!busy && validMoves.some(m => m.row === rowIndex && m.col === col)}
          highlighted={posMatch(highlighted, rowIndex, col)}
          captured={posMatch(capturedCells, rowIndex, col)}
          lastMoved={lastMoved !== null && lastMoved[0] === rowIndex && lastMoved[1] === col}
          isComputer={isComputer}
          onClick={() => onHouseClick(rowIndex, col)}
        />
      ))}
    </div>
  );

  return (
    <div style={{
      background: "linear-gradient(180deg, #4a2208 0%, #6a3410 40%, #5a2c0e 70%, #4a2208 100%)",
      borderRadius: 18, border: "3px solid #7a4010",
      padding: "12px 14px",
      boxShadow: "0 10px 50px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,200,80,0.08)",
      overflowX: "auto",
    }}>
      {/* column numbers */}
      <div style={{ ...gridStyle, marginBottom: 5 }}>
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} style={{ textAlign: "center", color: "rgba(212,160,32,0.3)", fontSize: 8, fontFamily: "monospace" }}>{i + 1}</div>
        ))}
      </div>

      <RowLabel label="← COMPUTADOR DEFESA →" color="224,80,48" />
      {renderRow(3, true)}
      <RowLabel label="← COMPUTADOR ATAQUE →" color="224,80,48" />
      {renderRow(2, true)}

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,160,32,0.3), transparent)" }} />
        <span style={{ color: "rgba(212,160,32,0.4)", fontSize: 11, letterSpacing: "0.2em" }}>◆ ◆ ◆</span>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,160,32,0.3), transparent)" }} />
      </div>

      <RowLabel label="← VOCÊ ATAQUE →" color="212,160,32" />
      {renderRow(1, false)}
      <RowLabel label="← VOCÊ DEFESA →" color="212,160,32" />
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
    <button onClick={() => onChange(value)} style={{
      background: active ? "rgba(212,160,32,0.22)" : "rgba(212,160,32,0.06)",
      border: `1px solid ${active ? "rgba(212,160,32,0.7)" : "rgba(212,160,32,0.2)"}`,
      borderRadius: 6, color: active ? "#d4a020" : "#7a5025",
      padding: "5px 11px", fontSize: 11, cursor: "pointer",
      letterSpacing: "0.08em", fontWeight: active ? "bold" : "normal",
      transition: "all 0.2s", fontFamily: "inherit",
    }}>
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GAME HOOK
// ═══════════════════════════════════════════════════════════════════

function useGameLogic(cols, difficulty) {
  const [board, setBoard] = useState(() => initBoard(cols));
  const [turn, setTurn] = useState(1);
  const [capturedByHuman, setCapturedByHuman] = useState(0);
  const [capturedByComputer, setCapturedByComputer] = useState(0);
  const [status, setStatus] = useState("playing");
  const [highlighted, setHighlighted] = useState([]);
  const [capturedCells, setCapturedCells] = useState([]);
  const [lastMoved, setLastMoved] = useState(null);
  const [message, setMessage] = useState("Sua vez! Escolha uma casa.");
  const [busy, setBusy] = useState(false);
  const [moveLog, setMoveLog] = useState([]);

  const addLog = useCallback((text) => {
    setMoveLog(prev => [text, ...prev].slice(0, 8));
  }, []);

  const applyResult = useCallback((result, player) => {
    setBoard(result.board);
    setLastMoved([result.finalRow, result.finalCol]);
    if (result.captured > 0) {
      const s = result.captured > 1 ? "s" : "";
      setCapturedCells(result.capturedPositions);
      if (player === 1) {
        setCapturedByHuman(v => v + result.captured);
        setMessage(`Você capturou ${result.captured} peça${s}! 🎉`);
        addLog(`🟡 Capturou ${result.captured} peça${s}`);
      } else {
        setCapturedByComputer(v => v + result.captured);
        setMessage(`Computador capturou ${result.captured} peça${s}!`);
        addLog(`🔴 Comp. capturou ${result.captured} peça${s}`);
      }
    } else {
      setCapturedCells([]);
      setMessage(player === 1 ? "Movimento realizado." : "Computador jogou.");
    }
    const end = checkGameEnd(result.board);
    if (end.over) {
      if (end.winner === 1) { setStatus("won"); setMessage("🏆 Você ganhou! Parabéns!"); }
      else if (end.winner === 0) { setStatus("lost"); setMessage("💀 Computador venceu!"); }
      else { setStatus("tie"); setMessage("🤝 Empate!"); }
      setBusy(false); setHighlighted([]);
      return true;
    }
    return false;
  }, [addLog]);

  const handleHumanMove = useCallback((row, col) => {
    if (busy || turn !== 1 || status !== "playing") return;
    const valid = getValidMoves(board, 1);
    if (!valid.some(m => m.row === row && m.col === col)) return;
    setBusy(true);
    setHighlighted([[row, col]]);
    setCapturedCells([]);
    const rowName = PLAYER_ROWS[1].inner === row ? "ataque" : "defesa";
    addLog(`🟡 Jogou: ${rowName} col ${col + 1}`);
    setTimeout(() => {
      const result = doMove(board, 1, row, col);
      const ended = applyResult(result, 1);
      if (!ended) {
        setTurn(0);
        setMessage("Computador pensando…");
        setTimeout(() => { setHighlighted([]); setCapturedCells([]); setBusy(false); }, 400);
      }
    }, 350);
  }, [busy, turn, status, board, applyResult, addLog]);

  // AI move effect
  useEffect(() => {
    if (turn !== 0 || status !== "playing" || busy) return;
    const delay = difficulty === "hard" ? 1100 : 800;
    const t = setTimeout(() => {
      const aiMove = getAIMove(board, difficulty);
      if (!aiMove) { setTurn(1); setMessage("Computador sem movimentos. Sua vez!"); return; }
      setBusy(true);
      setHighlighted([[aiMove.row, aiMove.col]]);
      const rowName = PLAYER_ROWS[0].inner === aiMove.row ? "ataque" : "defesa";
      addLog(`🔴 Comp.: ${rowName} col ${aiMove.col + 1}`);
      setTimeout(() => {
        const result = doMove(board, 0, aiMove.row, aiMove.col);
        const ended = applyResult(result, 0);
        if (!ended) {
          setTimeout(() => { setTurn(1); setMessage("Sua vez! Escolha uma casa."); setHighlighted([]); setCapturedCells([]); setBusy(false); }, 550);
        }
      }, 350);
    }, delay);
    return () => clearTimeout(t);
  }, [turn, status, board, difficulty, busy, applyResult, addLog]);

  const resetGame = useCallback(() => {
    setBoard(initBoard(cols));
    setTurn(1); setCapturedByHuman(0); setCapturedByComputer(0);
    setStatus("playing"); setMessage("Sua vez! Escolha uma casa.");
    setBusy(false); setHighlighted([]); setCapturedCells([]); setLastMoved(null); setMoveLog([]);
  }, [cols]);

  return {
    board, turn, capturedByHuman, capturedByComputer, status,
    validMoves: status === "playing" && turn === 1 ? getValidMoves(board, 1) : [],
    highlighted, capturedCells, lastMoved, message, busy, moveLog,
    phase: getPhase(board),
    humanPieces: countPieces(board, 1),
    compPieces: countPieces(board, 0),
    handleHumanMove, resetGame,
  };
}

// ═══════════════════════════════════════════════════════════════════
// GAME VIEW  (remounts when key changes)
// ═══════════════════════════════════════════════════════════════════

function GameView({ cols, difficulty }) {
  const g = useGameLogic(cols, difficulty);
  return (
    <>
      {/* Scoreboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <div style={{ background: "rgba(224,80,40,0.08)", border: "1px solid rgba(224,80,40,0.2)", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <span style={{ color: "#e05030", fontSize: 12, fontWeight: "bold", letterSpacing: "0.05em" }}>COMPUTADOR</span>
          </div>
          <div style={{ color: "#a04020", fontSize: 11 }}>{g.compPieces} peças · {g.capturedByComputer} cap.</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ background: "rgba(212,160,32,0.12)", border: "1px solid rgba(212,160,32,0.25)", borderRadius: 20, padding: "4px 12px", marginBottom: 6, color: "#d4a020", fontSize: 10, fontWeight: "bold", letterSpacing: "0.15em" }}>FASE {g.phase}</div>
          <div style={{ width: 10, height: 10, borderRadius: "50%", margin: "0 auto", background: g.turn === 1 ? "#f0c040" : "#e06040", boxShadow: `0 0 10px ${g.turn === 1 ? "rgba(240,192,64,0.8)" : "rgba(224,96,64,0.8)"}`, transition: "all 0.3s" }} />
        </div>
        <div style={{ background: "rgba(212,160,32,0.08)", border: "1px solid rgba(212,160,32,0.2)", borderRadius: 10, padding: "10px 14px", textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginBottom: 2 }}>
            <span style={{ color: "#d4a020", fontSize: 12, fontWeight: "bold", letterSpacing: "0.05em" }}>VOCÊ</span>
            <span style={{ fontSize: 16 }}>👤</span>
          </div>
          <div style={{ color: "#a07030", fontSize: 11 }}>{g.humanPieces} peças · {g.capturedByHuman} cap.</div>
        </div>
      </div>

      {/* Status */}
      <div style={{
        textAlign: "center", padding: "11px 16px", margin: "10px 0",
        background: g.status !== "playing" ? "rgba(212,160,32,0.15)" : "rgba(212,160,32,0.07)",
        border: `1px solid ${g.status !== "playing" ? "rgba(212,160,32,0.45)" : "rgba(212,160,32,0.18)"}`,
        borderRadius: 10, color: "#d4a020", fontSize: g.status !== "playing" ? 17 : 13,
        fontWeight: g.status !== "playing" ? "bold" : "normal",
        minHeight: 42, display: "flex", alignItems: "center", justifyContent: "center",
      }}>{g.message}</div>

      {/* Board */}
      <Board board={g.board} validMoves={g.validMoves} highlighted={g.highlighted}
        capturedCells={g.capturedCells} lastMoved={g.lastMoved} busy={g.busy}
        onHouseClick={g.handleHumanMove} />

      {/* Move log */}
      <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(212,160,32,0.1)", borderRadius: 10, padding: "10px 12px", marginTop: 10 }}>
        <div style={{ color: "#7a5025", fontSize: 10, letterSpacing: "0.2em", marginBottom: 4 }}>HISTÓRICO</div>
        {g.moveLog.length === 0
          ? <div style={{ color: "#4a3015", fontSize: 11, fontStyle: "italic" }}>Nenhuma jogada ainda…</div>
          : g.moveLog.map((e, i) => <div key={i} style={{ color: i === 0 ? "#a07030" : "#4a3015", fontSize: 11, marginBottom: 2 }}>{e}</div>)
        }
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const [cols, setCols] = useState(7);
  const [difficulty, setDifficulty] = useState("medium");
  const [gameKey, setGameKey] = useState(0);
  const bump = () => setGameKey(k => k + 1);
  const changeCols = (c) => { setCols(c); bump(); };
  const changeDiff = (d) => { setDifficulty(d); bump(); };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #120a06 0%, #1e0f08 50%, #120a06 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, fontFamily: "'Palatino Linotype','Book Antiqua',Palatino,serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background texture */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          radial-gradient(ellipse at 20% 50%, rgba(180,100,20,0.06) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 50%, rgba(180,100,20,0.06) 0%, transparent 60%),
          repeating-linear-gradient(-45deg, transparent, transparent 25px, rgba(180,100,20,0.025) 25px, rgba(180,100,20,0.025) 26px)`,
      }} />

      <div style={{ width: "100%", maxWidth: 1000, position: "relative", zIndex: 1 }}>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, transparent, rgba(210,150,30,0.4))" }} />
            <h1 style={{ margin: 0, fontSize: "clamp(30px,8vw,56px)", fontWeight: 900, letterSpacing: "0.25em", color: "#d4a020", textShadow: "0 0 50px rgba(212,160,32,0.35), 0 3px 0 #6b4010" }}>NTXUVA</h1>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, rgba(210,150,30,0.4), transparent)" }} />
          </div>
          <p style={{ margin: 0, color: "#7a5025", fontSize: 10, letterSpacing: "0.35em", textTransform: "uppercase" }}>
            Jogo Africano Tradicional · Humano vs Computador
          </p>
        </div>

        <GameView key={gameKey} cols={cols} difficulty={difficulty} />

        {/* Controls */}
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: "#7a5025", fontSize: 11, letterSpacing: "0.1em" }}>CASAS:</span>
            {[7, 16, 22].map(c => <OptionBtn key={c} value={c} current={cols} label={String(c)} onChange={changeCols} />)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: "#7a5025", fontSize: 11, letterSpacing: "0.1em" }}>IA:</span>
            {[["easy","Fácil"],["medium","Médio"],["hard","Difícil"]].map(([d,l]) =>
              <OptionBtn key={d} value={d} current={difficulty} label={l} onChange={changeDiff} />
            )}
          </div>
          <button onClick={bump} style={{ background: "rgba(212,160,32,0.1)", border: "1px solid rgba(212,160,32,0.3)", borderRadius: 8, color: "#d4a020", padding: "7px 18px", fontSize: 12, cursor: "pointer", letterSpacing: "0.12em", fontWeight: "bold", fontFamily: "inherit" }}>
            ↺ REINICIAR
          </button>
        </div>

        {/* Legend + Rules */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(212,160,32,0.1)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ color: "#7a5025", fontSize: 10, letterSpacing: "0.2em", marginBottom: 6 }}>LEGENDA</div>
            {[["rgba(212,160,32,0.6)","Casa jogável"],["#f0c040","Selecionada"],["#40d060","Último mov."],["#e03030","Capturada"]].map(([c,l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${c}`, flexShrink: 0 }} />
                <span style={{ color: "#6a4020", fontSize: 11 }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(212,160,32,0.1)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ color: "#7a5025", fontSize: 10, letterSpacing: "0.2em", marginBottom: 6 }}>TABULEIRO</div>
            {["4 fileiras: defesa + ataque (você) e ataque + defesa (comp.)", "Peças circulam no sentido anti-horário dentro do seu lado.", "Captura: última peça em casa vazia do ataque → captura coluna adversária."].map(r => (
              <div key={r} style={{ color: "#6a4020", fontSize: 10, marginBottom: 3, lineHeight: 1.5 }}>• {r}</div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
