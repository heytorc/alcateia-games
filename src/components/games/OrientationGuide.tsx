import React from 'react';
import { RotateCw } from 'lucide-react';
import { GameButton } from '@/components/games/GameButton';

interface OrientationGuideProps {
  isVisible: boolean;
  onDismiss?: () => void;
}

export const OrientationGuide: React.FC<OrientationGuideProps> = ({ isVisible, onDismiss }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center backdrop-blur-sm">
      <div className="bg-white/10 p-8 rounded-md border border-white/20 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
        <div className="bg-primary p-4 rounded-full animate-bounce">
          <RotateCw className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold">Rotacione o dispositivo</h2>
        <p className="text-white/70 max-w-xs">
          Para a melhor experiência de jogo, por favor rotacione seu dispositivo para o modo paisagem.
        </p>
        {onDismiss && (
          <GameButton variant="game" onClick={onDismiss} className="mt-4">
            Confirmar
          </GameButton>
        )}
      </div>
    </div>
  );
};
