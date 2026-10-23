import { useState } from "react";
import { DrawError, DrawStage } from "@/components/games/DrawStage";

import { NumberStepper, SettingRow, SettingsPanel } from "@/components";

import { GameLayout } from "@/components/games/GameLayout";

import { History } from "@/components/games/History";

import { GameButton } from "@/components/games/GameButton";

import { playDrawSound } from "@/lib/audio";

import { useGameStore } from "@/lib/store";

import { drawUniqueInteger, formatWeight } from "@/lib/utils";

export function WeightGame() {
  const { settings, soundEnabled, updateSettings } = useGameStore();
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [drawError, setDrawError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const draw = () => {
    playDrawSound(soundEnabled);
    const value = drawUniqueInteger(
      Math.min(settings.weightMin, settings.weightMax),
      Math.max(settings.weightMin, settings.weightMax),
      history,
    );
    if (value === null) {
      setDrawError("Todos os pesos dessa faixa já foram sorteados nesta sessão.");
      return;
    }
    setResult(value);
    setHistory((old) => [value, ...old]);
    setDrawError("");
  };
  return (
    <GameLayout
      title="Sortear peso"
      onSettings={() => setSettingsOpen(true)}
      onReset={() => {
        setResult(null);
        setHistory([]);
        setDrawError("");
      }}
      resetOpen={resetOpen}
      setResetOpen={setResetOpen}>
      <DrawStage
        color="#2ecc71"
        icon="weight"
        ariaLabel="Sortear um peso"
        idleText="Toque para sortear um peso"
        resultLabel="O peso sorteado foi"
        value={result === null ? null : formatWeight(result, settings.weightUnit)}
        trigger={history.length}
        onDraw={draw}
      />
      {drawError && <DrawError>{drawError}</DrawError>}
      <History items={history.map((value) => formatWeight(value, settings.weightUnit))} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <SettingRow label="Peso mínimo">
          <div className="flex items-center gap-[7px]">
          <NumberStepper
            ariaLabel="Peso mínimo em gramas"
            min={0}
            max={100_000}
            value={settings.weightMin}
            onChange={(value) => updateSettings({ weightMin: Math.max(0, Number(value)) })}
          />
          <span className="text-[13px] font-extrabold text-[#c2b9d1]">g</span>
          </div>
        </SettingRow>
        <SettingRow label="Peso máximo">
          <div className="flex items-center gap-[7px]">
          <NumberStepper
            ariaLabel="Peso máximo em gramas"
            min={1}
            max={100_000}
            value={settings.weightMax}
            onChange={(value) => updateSettings({ weightMax: Math.max(1, Number(value)) })}
          />
          <span className="text-[13px] font-extrabold text-[#c2b9d1]">g</span>
          </div>
        </SettingRow>
        <SettingRow label="Exibir unidade">
          <div className="flex overflow-hidden rounded-md">
            <GameButton type="button" size="sm" variant={settings.weightUnit === "g" ? "game" : "special"} className="min-w-0 rounded-none" onClick={() => updateSettings({ weightUnit: "g" })}>Gramas (g)</GameButton>
            <GameButton type="button" size="sm" variant={settings.weightUnit === "kg" ? "game" : "special"} className="min-w-0 rounded-none" onClick={() => updateSettings({ weightUnit: "kg" })}>Quilos (kg)</GameButton>
          </div>
        </SettingRow>
      </SettingsPanel>
    </GameLayout>
  );
}
