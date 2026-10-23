import { useState } from "react";
import { DrawError, DrawStage } from "@/components/games/DrawStage";

import { NumberStepper, SettingRow, SettingsPanel } from "@/components";

import { GameLayout } from "@/components/games/GameLayout";

import { History } from "@/components/games/History";

import { playDrawSound } from "@/lib/audio";

import { useGameStore } from "@/lib/store";

import { drawUniqueInteger, numberRange } from "@/lib/utils";

export function NumberGame() {
  const { settings, soundEnabled, updateSettings } = useGameStore();
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [drawError, setDrawError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const draw = () => {
    playDrawSound(soundEnabled);
    const [min, max] = numberRange(settings.numberDigits);
    const value = drawUniqueInteger(min, max, history);
    if (value === null) {
      setDrawError("Todos os números dessa faixa já foram sorteados nesta sessão.");
      return;
    }
    setResult(value);
    setHistory((old) => [value, ...old]);
    setDrawError("");
  };
  return (
    <GameLayout
      title="Sortear número"
      onSettings={() => setSettingsOpen(true)}
      onReset={() => {
        setResult(null);
        setHistory([]);
        setDrawError("");
      }}
      resetOpen={resetOpen}
      setResetOpen={setResetOpen}>
      <DrawStage
        color="#14e4f5"
        icon="number"
        ariaLabel="Sortear um número"
        idleText="Toque para sortear um número"
        resultLabel="O número sorteado foi"
        value={result === null ? null : String(result)}
        trigger={history.length}
        onDraw={draw}
      />
      {drawError && <DrawError>{drawError}</DrawError>}
      <History items={history.map(String)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <SettingRow label="Quantidade de dígitos" description="De 1 a 8 dígitos">
          <NumberStepper
            ariaLabel="Quantidade de dígitos"
            min={1}
            max={8}
            value={settings.numberDigits}
            onChange={(value) => updateSettings({ numberDigits: Math.min(8, Math.max(1, Number(value))) })}
          />
        </SettingRow>
      </SettingsPanel>
    </GameLayout>
  );
}
