import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { GameButton } from "@/components/games/GameButton";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const SHOW_AFTER_PX = 320;

/** Botão flutuante que leva ao topo; aparece depois de rolar a página. */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          transition={{ duration: 0.15 }}
          className="fixed right-[calc(1.25rem+env(safe-area-inset-right))] bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 max-[480px]:right-[calc(1rem+env(safe-area-inset-right))] max-[480px]:bottom-[calc(1rem+env(safe-area-inset-bottom))]">
          <GameButton
            size="icon"
            aria-label="Voltar ao topo"
            onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })}>
            <ArrowUp size={22} />
          </GameButton>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
