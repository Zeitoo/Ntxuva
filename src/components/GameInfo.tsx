/**
 * NTXUVA – GameInfo component
 * Scoreboard, status message, and move log.
 */

import type { GameStatus, Player } from '../types/GameTypes';

interface GameInfoProps {
  turn: Player;
  status: GameStatus;
  message: string;
  humanPieces: number;
  compPieces: number;
  capturedByHuman: number;
  capturedByComputer: number;
  phase: 1 | 2;
  moveLog: string[];
}

export function GameInfo({
  turn,
  status,
  message,
  humanPieces,
  compPieces,
  capturedByHuman,
  capturedByComputer,
  phase,
  moveLog,
}: GameInfoProps) {
  return (
    <>
      {/* Scoreboard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 10,
          marginBottom: 12,
          alignItems: 'center',
        }}
      >
        {/* Computer */}
        <div
          style={{
            background: 'rgba(224,80,40,0.08)',
            border: '1px solid rgba(224,80,40,0.2)',
            borderRadius: 10,
            padding: '10px 14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 16 }}>🤖</span>
            <span
              style={{
                color: '#e05030',
                fontSize: 12,
                fontWeight: 'bold',
                letterSpacing: '0.05em',
              }}
            >
              COMPUTADOR
            </span>
          </div>
          <div style={{ color: '#a04020', fontSize: 11 }}>
            {compPieces} peças &nbsp;·&nbsp; {capturedByComputer} cap.
          </div>
        </div>

        {/* Phase + turn indicator */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              background: 'rgba(212,160,32,0.12)',
              border: '1px solid rgba(212,160,32,0.25)',
              borderRadius: 20,
              padding: '4px 12px',
              marginBottom: 6,
              color: '#d4a020',
              fontSize: 10,
              fontWeight: 'bold',
              letterSpacing: '0.15em',
              whiteSpace: 'nowrap',
            }}
          >
            FASE {phase}
          </div>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              margin: '0 auto',
              background: turn === 1 ? '#f0c040' : '#e06040',
              boxShadow: `0 0 10px ${
                turn === 1
                  ? 'rgba(240,192,64,0.8)'
                  : 'rgba(224,96,64,0.8)'
              }`,
              transition: 'all 0.3s',
            }}
          />
        </div>

        {/* Human */}
        <div
          style={{
            background: 'rgba(212,160,32,0.08)',
            border: '1px solid rgba(212,160,32,0.2)',
            borderRadius: 10,
            padding: '10px 14px',
            textAlign: 'right',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 6,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                color: '#d4a020',
                fontSize: 12,
                fontWeight: 'bold',
                letterSpacing: '0.05em',
              }}
            >
              VOCÊ
            </span>
            <span style={{ fontSize: 16 }}>👤</span>
          </div>
          <div style={{ color: '#a07030', fontSize: 11 }}>
            {humanPieces} peças &nbsp;·&nbsp; {capturedByHuman} cap.
          </div>
        </div>
      </div>

      {/* Status message */}
      <div
        style={{
          textAlign: 'center',
          padding: '11px 16px',
          margin: '10px 0',
          background:
            status !== 'playing'
              ? 'rgba(212,160,32,0.15)'
              : 'rgba(212,160,32,0.07)',
          border: `1px solid ${
            status !== 'playing'
              ? 'rgba(212,160,32,0.45)'
              : 'rgba(212,160,32,0.18)'
          }`,
          borderRadius: 10,
          color: '#d4a020',
          fontSize: status !== 'playing' ? 17 : 13,
          fontWeight: status !== 'playing' ? 'bold' : 'normal',
          letterSpacing: '0.04em',
          minHeight: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s',
        }}
      >
        {message}
      </div>


    </>
  );
}
