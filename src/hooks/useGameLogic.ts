/**
 * NTXUVA – useGameLogic
 *
 * Manages all game state and orchestrates turns between human and AI.
 * Sound effects are wired in here so the hook controls the full experience.
 *
 * Rule highlights (see gameEngine.ts for full details):
 *   • The game ends ONLY when a player's piece count reaches 0.
 *   • A player must start from a house with > 1 piece if any exist on their
 *     side. Only when ALL their houses have ≤ 1 piece are they free to pick any.
 *   • "Pick-1" continuation (Phase 1): last piece on non-empty → take 1 back
 *     and continue distributing.
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
  getPhaseForPlayer,
  getValidMoves,
  initBoard,
} from '../utils/gameEngine';
import { getAIMove } from '../utils/aiEngine';
import { useSounds } from './useSounds';

// ─────────────────────────────────────────────
// Public shape
// ─────────────────────────────────────────────

export interface GameState {
  board: Board;
  turn: Player;
  capturedByHuman: number;
  capturedByComputer: number;
  status: GameStatus;
  validMoves: Move[];
  highlighted: Position[];
  capturedCells: Position[];
  lastMoved: Position | null;
  message: string;
  busy: boolean;
  moveLog: string[];
  humanPhase: 1 | 2;
  compPhase: 1 | 2;
  humanPieces: number;
  compPieces: number;
  soundEnabled: boolean;
}

export interface GameActions {
  handleHumanMove: (row: number, col: number) => void;
  resetGame: () => void;
  toggleSound: () => void;
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
  const [soundEnabled, setSoundEnabled] = useState(true);

  const sounds = useSounds(soundEnabled);

  // ── Helpers ─────────────────────────────────────────────────────

  const addLog = useCallback((text: string) => {
    setMoveLog((prev) => [text, ...prev].slice(0, 10));
  }, []);

  const rowLabel = (player: Player, row: number): string => {
    return row === PLAYER_ROWS[player].inner ? 'ataque' : 'defesa';
  };

  /**
   * Apply a MoveResult to state, play the appropriate sound, and check game-over.
   * Returns true if the game ended.
   */
  const applyResult = useCallback(
    (result: MoveResult, player: Player): boolean => {
      setBoard(result.board);
      setLastMoved([result.finalRow, result.finalCol]);

      if (result.captured > 0) {
        const s = result.captured > 1 ? 's' : '';
        setCapturedCells(result.capturedPositions as Position[]);
        sounds.playCapture();

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
        sounds.playPlace();
        setMessage(player === 1 ? 'Movimento realizado.' : 'Computador jogou.');
      }

      const end = checkGameEnd(result.board);
      if (end.over) {
        if (end.winner === 1) {
          setStatus('won');
          setMessage('🏆 Você ganhou! Parabéns!');
          sounds.playWin();
        } else if (end.winner === 0) {
          setStatus('lost');
          setMessage('💀 Computador venceu!');
          sounds.playLose();
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
    [sounds, addLog],
  );

  // ── Human move ───────────────────────────────────────────────────

  const handleHumanMove = useCallback(
    (row: number, col: number) => {
      if (busy || turn !== 1 || status !== 'playing') return;

      const valid = getValidMoves(board, 1);
      if (!valid.some((m) => m.row === row && m.col === col)) return;

      sounds.playSelect();
      setBusy(true);
      setHighlighted([[row, col]]);
      setCapturedCells([]);
      addLog(`🟡 ${rowLabel(1, row)} col ${col + 1}`);

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
      }, 300);
    },
    [busy, turn, status, board, sounds, applyResult, addLog],
  );

  // ── AI move (reactive) ───────────────────────────────────────────

  useEffect(() => {
    if (turn !== 0 || status !== 'playing' || busy) return;

    const thinkTime = difficulty === 'hard' ? 1100 : 800;

    const timer = window.setTimeout(() => {
      sounds.playAIThink();

      const aiMove = getAIMove(board, difficulty);
      if (!aiMove) {
        setTurn(1);
        setMessage('Computador sem movimentos. Sua vez!');
        return;
      }

      setBusy(true);
      setHighlighted([[aiMove.row, aiMove.col]]);
      addLog(`🔴 ${rowLabel(0, aiMove.row)} col ${aiMove.col + 1}`);

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
          }, 500);
        }
      }, 350);
    }, thinkTime);

    return () => window.clearTimeout(timer);
  }, [turn, status, board, difficulty, busy, sounds, applyResult, addLog]);

  // ── Reset ────────────────────────────────────────────────────────

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

  const toggleSound = useCallback(() => setSoundEnabled((v) => !v), []);

  // ── Derived values ────────────────────────────────────────────────

  return {
    board,
    turn,
    capturedByHuman,
    capturedByComputer,
    status,
    validMoves: status === 'playing' && turn === 1 ? getValidMoves(board, 1) : [],
    highlighted,
    capturedCells,
    lastMoved,
    message,
    busy,
    moveLog,
    humanPhase: getPhaseForPlayer(board, 1),
    compPhase: getPhaseForPlayer(board, 0),
    humanPieces: countPieces(board, 1),
    compPieces: countPieces(board, 0),
    soundEnabled,
    handleHumanMove,
    resetGame,
    toggleSound,
  };
}
