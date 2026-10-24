import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { GameIcon } from "@/components/games/GameIcon";

import { NumberStepper, SettingRow, SettingsPanel } from "@/components";

import { GameLayout } from "@/components/games/GameLayout";


import { playTuningSound } from "@/lib/audio";

import { megaPasswordWords } from "@/constants/password-words";

import { useGameStore } from "@/lib/store";

import { drawManyUnique } from "@/lib/utils";
import { GameButton } from "@/components/games/GameButton";
import { ChannelKnob } from "@/components/games/ChannelKnob";
import { TvFrame } from "@/components/games/TvFrame";

export function PasswordGame() {
  const {
    settings,
    soundEnabled,
    usedMegaPasswordWords,
    markMegaPasswordWordsAsUsed,
    resetMegaPasswordHistory,
    updateSettings,
  } = useGameStore();
  const [round, setRound] = useState<string[]>([]);
  const [drawError, setDrawError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [tuning, setTuning] = useState(false);
  const reduceMotion = useReducedMotion();
  const tuningTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(tuningTimer.current), []);
  const draw = () => {
    const availableWords = megaPasswordWords.filter((word) => !usedMegaPasswordWords.includes(word));
    if (availableWords.length < settings.passwordCount) {
      setDrawError(
        `Restam apenas ${availableWords.length} palavras inéditas. Reinicie o histórico para sortear uma nova rodada.`,
      );
      return;
    }

    const values = drawManyUnique(availableWords, settings.passwordCount);
    setRound(values);
    markMegaPasswordWordsAsUsed(values);
    setDrawError("");
    if (!reduceMotion) {
      setTuning(true);
      playTuningSound(soundEnabled);
      window.clearTimeout(tuningTimer.current);
      tuningTimer.current = window.setTimeout(() => setTuning(false), 900);
    }
  };
  // palavras com hífen podem quebrar linha: o limite de largura é o maior trecho entre hífens
  const longest = Math.max(0, ...round.flatMap((word) => word.split("-").map((part) => part.length)));
  // largura relativa à tela da TV, com teto em px para não estourar a altura em telas largas
  const [countCqw, capPx] = round.length <= 5 ? [8, 46] : round.length <= 8 ? [5.8, 34] : [4.4, 26];
  return (
    <GameLayout
      title="Mega senha"
      onSettings={() => setSettingsOpen(true)}
      onReset={() => {
        setRound([]);
        setDrawError("");
        setTuning(false);
      }}
      resetOpen={resetOpen}
      setResetOpen={setResetOpen}>
      <TvFrame
        className="my-auto"
        color="#e84393"
        staticActive={tuning}
        screen={
          tuning ? null : round.length === 0 ? (
            <div className="grid h-full place-items-center p-6 text-center">
              <div>
                <GameIcon id="password" size={48} className="mx-auto mb-[3cqw] size-[clamp(48px,9cqw,120px)]" />
                <p className="text-[clamp(18px,3.4cqw,44px)] text-[#e84393] [text-shadow:0_0_10px_#e84393]">SEM SINAL</p>
                <p className="mt-2 text-[clamp(11px,1.6cqw,20px)] text-white/60">Gire o seletor de canais e sorteie a rodada.</p>
              </div>
            </div>
          ) : (
            <ol className="flex h-full flex-col justify-center overflow-hidden gap-[1.6cqw] px-[6cqw] py-4">
              {round.map((word, index) => (
                <li className="flex items-center gap-[3cqw]" key={`${word}-${index}`}>
                  <span className={`${round.length > 8 ? "text-[clamp(10px,2.4cqw,16px)]" : "text-[clamp(12px,3.4cqw,22px)]"} text-[#e84393] [text-shadow:0_0_8px_#e84393]`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <strong
                    style={{ fontSize: `clamp(14px, min(${countCqw}cqw, ${(96 / Math.max(longest, 6)).toFixed(2)}cqw), ${capPx}px)` }}
                    className="min-w-0 leading-tight break-words text-white [text-shadow:0_0_8px_rgba(255,255,255,.5)]">
                    {word}
                  </strong>
                </li>
              ))}
            </ol>
          )
        }
        controls={<ChannelKnob onTurn={draw} disabled={tuning} />}
      />
      {drawError && (
        <p
          className="mx-auto max-w-[900px] rounded-md border border-[#e17055]/50 bg-[#e17055]/10 px-3 py-2 text-center text-sm text-[#ffd0c7]"
          role="alert">
          {drawError}
        </p>
      )}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <SettingRow label="Palavras por rodada">
          <NumberStepper
            ariaLabel="Palavras por rodada"
            min={1}
            max={12}
            value={settings.passwordCount}
            onChange={(value) => updateSettings({ passwordCount: Math.min(12, Math.max(1, Number(value))) })}
          />
        </SettingRow>
        <div className="flex items-center justify-between gap-3 border-t border-white/9 py-[14px] text-sm text-[#c2b9d1]">
          <span>{megaPasswordWords.length - usedMegaPasswordWords.length} palavras inéditas disponíveis</span>
          <GameButton variant="special" size="sm" type="button" onClick={resetMegaPasswordHistory} className="shrink-0">
            Reiniciar histórico
          </GameButton>
        </div>
      </SettingsPanel>
    </GameLayout>
  );
}
