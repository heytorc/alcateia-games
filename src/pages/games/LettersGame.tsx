import { useState, type CSSProperties } from "react";
import { GameIcon } from "@/components/games/GameIcon";

import { Countdown, NumberStepper, SettingRow, SettingsPanel, Switch } from "@/components";

import { GameLayout } from "@/components/games/GameLayout";

import { History } from "@/components/games/History";

import { NeonSpark } from "@/components/games/NeonSpark";

import { Button } from "@/components/ui/button";

import { playDrawSound, playTimerEndSound } from "@/lib/audio";

import { useGameStore } from "@/lib/store";

import { drawUnique } from "@/lib/utils";

const STAGE_COLORS = [
  "--color-game-base",
  "--color-success-base",
  "--color-warning-base",
  "--color-danger-base",
  "--color-info-base",
  "--color-special-base",
  "--color-brand-accent",
  "--color-brand-gold",
];

export function LettersGame() {
  const { settings, soundEnabled, updateSettings } = useGameStore();
  const [history, setHistory] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [drawn, setDrawn] = useState("");
  const [countdownKey, setCountdownKey] = useState(0);
  const reset = () => {
    setHistory([]);
    setDrawn("");
  };
  const draw = () => {
    playDrawSound(soundEnabled);
    const value = drawUnique("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), history, settings.allowRepeats);
    setDrawn(value);
    setHistory((old) => [...old, value]);
    setCountdownKey((key) => key + 1);
  };
  return (
    <GameLayout
      title="Sortear letras"
      onSettings={() => setSettingsOpen(true)}
      onReset={reset}
      resetOpen={resetOpen}
      setResetOpen={setResetOpen}>
      <Button
        type="button"
        variant="ghost"
        aria-label="Sortear uma letra"
        className={`h-auto min-h-[430px] w-full flex-1 relative cursor-pointer neon-box [--neon-c:var(--stage-color)] rounded-md bg-[color-mix(in_srgb,var(--stage-color)_16%,#0a0618)] p-6 text-center text-white shadow-[0_0_18px_var(--stage-color),inset_0_0_22px_color-mix(in_srgb,var(--stage-color)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--stage-color)_22%,#0a0618)] hover:text-white max-[760px]:min-h-[370px] ${
          drawn
            ? "flex flex-col items-stretch justify-between px-[clamp(24px,5vw,64px)] py-[clamp(30px,5vh,54px)]"
            : "grid place-items-center"
        }`}
        onClick={draw}
        style={{ "--stage-color": `var(${STAGE_COLORS[history.length % STAGE_COLORS.length]})` } as CSSProperties}>
        <NeonSpark trigger={history.length} />
        <div className={drawn ? "grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] place-items-center" : "flex flex-col items-center gap-2.5"}>
          {drawn ? (
            <>
              <span className="self-start text-sm font-bold opacity-80">A letra sorteada foi</span>
              <span key={drawn} className="neon-on self-center font-game-pixel text-[clamp(180px,min(34vw,48vh),340px)] leading-[.8] font-extrabold tracking-[.06em] indent-[.06em] [text-shadow:0_0_12px_var(--stage-color),0_0_40px_var(--stage-color)]">{drawn}</span>
            </>
          ) : (
            <>
              <GameIcon id="letters" size={57} />
              <span className="text-sm font-bold opacity-80">Toque para sortear uma letra</span>
            </>
          )}
        </div>
        {settings.countdownEnabled && drawn && <Countdown key={countdownKey} seconds={settings.countdownSeconds} onDone={() => playTimerEndSound(soundEnabled)} />}
      </Button>
      <History items={history} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <SettingRow label="Sortear letras repetidas">
          <Switch checked={settings.allowRepeats} onChange={(allowRepeats) => updateSettings({ allowRepeats })} />
        </SettingRow>
        <SettingRow label="Habilitar contagem regressiva">
          <Switch
            checked={settings.countdownEnabled}
            onChange={(countdownEnabled) => updateSettings({ countdownEnabled })}
          />
        </SettingRow>
        <SettingRow label="Tempo da contagem">
          <NumberStepper
            ariaLabel="Tempo da contagem em segundos"
            min={1}
            max={60}
            value={settings.countdownSeconds}
            onChange={(value) => updateSettings({ countdownSeconds: Math.min(60, Math.max(1, Number(value))) })}
          />
          <span>segundos</span>
        </SettingRow>
      </SettingsPanel>
    </GameLayout>
  );
}
