import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion, type HTMLMotionProps } from "motion/react";

type SlideDirection = "up" | "down" | "left" | "right";

type SlideProps = {
  children: ReactNode;
  delay?: number;
  direction?: SlideDirection;
  offset?: number;
} & HTMLMotionProps<"div">;

export function Slide({
  children,
  delay = 0,
  direction = "up",
  offset = 28,
  transition,
  ...props
}: SlideProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const reduceMotion = useReducedMotion();
  const axis = direction === "up" || direction === "down" ? "y" : "x";
  const distance = direction === "down" || direction === "right" ? -offset : offset;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, [axis]: reduceMotion ? 0 : distance }}
      animate={inView ? { opacity: 1, [axis]: 0 } : undefined}
      transition={transition ?? { type: "spring", stiffness: 260, damping: 24, delay: delay / 1000 }}
      {...props}>
      {children}
    </motion.div>
  );
}
