/**
 * NTXUVA – useGameLogic
 *
 * Centralises all game state and orchestrates turns between
 * the human player and the AI opponent.
 *
 * Usage:
 *   const game = useGameLogic(cols, difficulty);
 *   // use game.board, game.handleHumanMove, etc.
 */

import { useCallback, useEffect, useState } from 'react';

import type {
  Board,
  ColCount,
  Difficulty,
  GameStatus,
  Move,
  MoveResult,
  Player,
  Position,
} from '../types/GameTypes';
import { PLAYER_ROWS } from '../types/GameTypes';
import {
  checkGameEnd,
  countPieces,
  doMove,
  getPhase,
  getValidMoves,
  initBoard,
} from '../utils/gameEngine';
import { getAIMove } from '../utils/aiEngine'

// ─────────────────────────────────────────────
// Public shape
// ─────────────────────────────────────────────

export interface GameState {
  board: Board;
  turn: Player;
  capturedByHuman: number;
  capturedByComputer: number;
  status: GameStatus;
  /** Moves available to the human on their turn. Empty otherwise. */
  validMoves: Move[];
  /** Houses currently highlighted (selected or AI thinking). */
  highlighted: Position[];
  /** Houses that were just captured (flash animation). */
  capturedCells: Position[];
  /** The house where the last piece was placed. */
  lastMoved: Position | null;
  message: string;
  /** True while a move animation is in progress (blocks input). */
  busy: boolean;
  /** Last 8 move log entries, newest first. */
  moveLog: string[];
  phase: 1 | 2;
  humanPieces: number;
  compPieces: number;
}

export interface GameActions {
  handleHumanMove: (row: number, col: number) => void;
  resetGame: () => void;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useGameLogic(
  cols: ColCount,
  difficulty: Difficulty,
): GameState & GameActions {
  const [board, setBoard] = useState<Board>(() => initBoard(cols));
  const [turn, setTurn] = useState<Player>(1);
  const [capturedByHuman, setCapturedByHuman] = useState(0);
  const [capturedByComputer, setCapturedByComputer] = useState(0);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [highlighted, setHighlighted] = useState<Position[]>([]);
  const [capturedCells, setCapturedCells] = useState<Position[]>([]);
  const [lastMoved, setLastMoved] = useState<Position | null>(null);
  const [message, setMessage] = useState('Sua vez! Escolha uma casa.');
  const [busy, setBusy] = useState(false);
  const [moveLog, setMoveLog] = useState<string[]>([]);

  // ── Helpers ───────────────────────────────────────────────────────────

  const addLog = useCallback((text: string) => {
    setMoveLog((prev) => [text, ...prev].slice(0, 8));
  }, []);

  const rowLabel = (player: Player, row: number): string => {
    const { inner } = PLAYER_ROWS[player];
    return row === inner ? 'ataque' : 'defesa';
  };

  /**
   * Apply a MoveResult to state and check for game-over.
   * Returns true if the game ended.
   */
  const applyResult = useCallback(
    (result: MoveResult, player: Player): boolean => {
      setBoard(result.board);
      setLastMoved([result.finalRow, result.finalCol]);

      if (result.captured > 0) {
        const s = result.captured > 1 ? 's' : '';
        setCapturedCells(result.capturedPositions as Position[]);

        if (player === 1) {
          setCapturedByHuman((v) => v + result.captured);
          setMessage(`Você capturou ${result.captured} peça${s}! 🎉`);
          addLog(`🟡 Capturou ${result.captured} peça${s}`);
        } else {
          setCapturedByComputer((v) => v + result.captured);
          setMessage(`Computador capturou ${result.captured} peça${s}!`);
          addLog(`🔴 Comp. capturou ${result.captured} peça${s}`);
        }
      } else {
        setCapturedCells([]);
        setMessage(player === 1 ? 'Movimento realizado.' : 'Computador jogou.');
      }

      const end = checkGameEnd(result.board);
      if (end.over) {
        if (end.winner === 1) {
          setStatus('won');
          setMessage('🏆 Você ganhou! Parabéns!');
        } else if (end.winner === 0) {
          setStatus('lost');
          setMessage('💀 Computador venceu!');
        } else {
          setStatus('tie');
          setMessage('🤝 Empate!');
        }
        setBusy(false);
        setHighlighted([]);
        return true;
      }
      return false;
    },
    [addLog],
  );

  // ── Human move ────────────────────────────────────────────────────────

  const handleHumanMove = useCallback(
    (row: number, col: number) => {
      if (busy || turn !== 1 || status !== 'playing') return;

      const valid = getValidMoves(board, 1);
      if (!valid.some((m) => m.row === row && m.col === col)) return;

      setBusy(true);
      setHighlighted([[row, col]]);
      setCapturedCells([]);
      addLog(`🟡 Jogou: ${rowLabel(1, row)} col ${col + 1}`);

      // Small delay so the highlight is visible before executing
      setTimeout(() => {
        const result = doMove(board, 1, row, col);
        const ended = applyResult(result, 1);

        if (!ended) {
          setTurn(0);
          setMessage('Computador pensando…');
          setTimeout(() => {
            setHighlighted([]);
            setCapturedCells([]);
            setBusy(false);
          }, 400);
        }
      }, 350);
    },
    [busy, turn, status, board, applyResult, addLog],
  );

  // ── AI move (triggered reactively when it's the computer's turn) ──────

  useEffect(() => {
    if (turn !== 0 || status !== 'playing' || busy) return;

    const thinkTime = difficulty === 'hard' ? 1100 : 800;

    const timer = window.setTimeout(() => {
      const aiMove = getAIMove(board, difficulty);

      if (!aiMove) {
        // Computer has no valid moves – human wins
        setTurn(1);
        setMessage('Computador sem movimentos. Sua vez!');
        return;
      }

      setBusy(true);
      setHighlighted([[aiMove.row, aiMove.col]]);
      addLog(`🔴 Comp.: ${rowLabel(0, aiMove.row)} col ${aiMove.col + 1}`);

      setTimeout(() => {
        const result = doMove(board, 0, aiMove.row, aiMove.col);
        const ended = applyResult(result, 0);

        if (!ended) {
          setTimeout(() => {
            setTurn(1);
            setMessage('Sua vez! Escolha uma casa.');
            setHighlighted([]);
            setCapturedCells([]);
            setBusy(false);
          }, 550);
        }
      }, 350);
    }, thinkTime);

    return () => window.clearTimeout(timer);
  }, [turn, status, board, difficulty, busy, applyResult, addLog]);

  // ── Reset ──────────────────────────────────────────────────────────────

  const resetGame = useCallback(() => {
    setBoard(initBoard(cols));
    setTurn(1);
    setCapturedByHuman(0);
    setCapturedByComputer(0);
    setStatus('playing');
    setMessage('Sua vez! Escolha uma casa.');
    setBusy(false);
    setHighlighted([]);
    setCapturedCells([]);
    setLastMoved(null);
    setMoveLog([]);
  }, [cols]);

  // ── Derived values ─────────────────────────────────────────────────────

  const validMoves =
    status === 'playing' && turn === 1 ? getValidMoves(board, 1) : [];
  const phase = getPhase(board);
  const humanPieces = countPieces(board, 1);
  const compPieces = countPieces(board, 0);

  return {
    board,
    turn,
    capturedByHuman,
    capturedByComputer,
    status,
    validMoves,
    highlighted,
    capturedCells,
    lastMoved,
    message,
    busy,
    moveLog,
    phase,
    humanPieces,
    compPieces,
    handleHumanMove,
    resetGame,
  };
}
