import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PageTransition, getTransitionId, transitions } from "@/components/transitions/PageTransition";
import type { TransitionId } from "@/constants/transitions";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorPage } from "@/components/ErrorPage";
import { TimeGame } from "@/pages/games/TimeGame";
import { Home } from "@/pages/HomePage";
import { ImpostorGame } from "@/pages/games/ImpostorGame";
import { CampoMinadoGame } from "@/pages/games/CampoMinadoGame";
import { LettersGame } from "@/pages/games/LettersGame";
import { NumberGame } from "@/pages/games/NumberGame";
import { PasswordGame } from "@/pages/games/PasswordGame";
import { WeightGame } from "@/pages/games/WeightGame";
import { ReflexoGame } from "@/pages/games/ReflexoGame";
import { ProibidasGame } from "@/pages/games/ProibidasGame";
import { ProvavelGame } from "@/pages/games/ProvavelGame";

/**
 * Transição de página neon: um overlay cobre a tela, a rota troca por baixo dele
 * (em `swapMs`) e o overlay se desfaz. Variantes e como alternar: `PageTransition.tsx` / README.
 */
function App() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [run, setRun] = useState<{ key: number; id: TransitionId } | null>(null);

  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    if (!reduceMotion) setRun({ key: Date.now(), id: getTransitionId() });
  }

  useEffect(() => {
    if (!run) return;
    const timer = setTimeout(() => setRun(null), transitions[run.id].totalMs);
    return () => clearTimeout(timer);
  }, [run]);

  const swapSeconds = run ? transitions[run.id].swapMs / 1000 : 0;

  return (
    <>
      {/* só rola ao topo quando a página antiga sai: antes disso o clique no card faria a tela pular enquanto ainda aparece */}
      <AnimatePresence mode="wait" custom={swapSeconds} onExitComplete={() => window.scrollTo(0, 0)}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: reduceMotion ? 0 : 1 }}
          animate={{ opacity: 1 }}
          custom={swapSeconds}
          variants={{
            exit: (delay: number) => ({ opacity: 0, transition: reduceMotion ? { duration: 0.12 } : { duration: 0.01, delay } }),
          }}
          exit="exit"
          transition={{ duration: 0.12 }}>
          <ErrorBoundary resetKey={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/letters" element={<LettersGame />} />
            <Route path="/weight" element={<WeightGame />} />
            <Route path="/number" element={<NumberGame />} />
            <Route path="/password" element={<PasswordGame />} />
            <Route path="/impostor" element={<ImpostorGame />} />
            <Route path="/campo-minado" element={<CampoMinadoGame />} />
            <Route path="/time" element={<TimeGame />} />
            <Route path="/reflexo" element={<ReflexoGame />} />
            <Route path="/proibidas" element={<ProibidasGame />} />
            <Route path="/provavel" element={<ProvavelGame />} />
            <Route path="*" element={<ErrorPage kind="404" />} />
          </Routes>
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
      {run && <PageTransition key={run.key} id={run.id} />}
    </>
  );
}

export default App;
