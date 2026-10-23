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
          className="fixed right-5 bottom-5 z-40 max-[480px]:right-4 max-[480px]:bottom-4">
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
