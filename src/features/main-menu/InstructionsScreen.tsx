import React from 'react';
import { ArrowLeft, Hand, Keyboard, ShieldCheck, Zap } from 'lucide-react';

interface InstructionsScreenProps {
  onBack: () => void;
  onButtonClick: () => void;
}

export const InstructionsScreen: React.FC<InstructionsScreenProps> = ({
  onBack,
  onButtonClick,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#070B14] p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onButtonClick();
              onBack();
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-[#0E1729] px-3 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h2 className="font-display text-xl font-bold text-white">
            How to Play
          </h2>
          <div className="w-16" />
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-white/10 bg-[#0C1424] p-4">
            <div className="flex items-center gap-2.5 text-cyan-300 font-display text-sm font-bold">
              <Hand className="w-4 h-4" />
              <span>Two-Player Simultaneous Multi-Touch</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Place your phone or tablet flat between both players. Player 1 touches and drags anywhere on the bottom half (Electric Cyan), while Player 2 simultaneously controls the top half (Vibrant Orange). Each finger is locked exclusively to its side.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0C1424] p-4">
            <div className="flex items-center gap-2.5 text-orange-400 font-display text-sm font-bold">
              <Keyboard className="w-4 h-4" />
              <span>Desktop Mouse &amp; Keyboard</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              In single-player and Practice modes, glide your mouse or use Arrow Keys / WASD. In 2-Player Local on a non-touch desktop, Player 1 uses Arrow Keys and Player 2 uses W A S D.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0C1424] p-4">
            <div className="flex items-center gap-2.5 text-white font-display text-sm font-bold">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Strike Momentum &amp; Bank Shots</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Puck speed scales directly with your striker velocity at impact. Snap your finger forward into the puck for slap shots, or angle off the side rails and rounded corners to beat the defender.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0C1424] p-4">
            <div className="flex items-center gap-2.5 text-white font-display text-sm font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Official Rink Rules</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Strikers cannot cross the center line into the opponent&apos;s zone. After each goal, the puck resets near center for immediate resumption until the match timer expires.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onButtonClick();
            onBack();
          }}
          className="mt-5 w-full min-h-[46px] rounded-xl bg-cyan-400 font-display text-sm font-extrabold text-slate-950 hover:bg-cyan-300 cursor-pointer"
        >
          Ready to Play
        </button>
      </div>
    </div>
  );
};
