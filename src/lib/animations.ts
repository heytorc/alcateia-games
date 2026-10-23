import confetti from "canvas-confetti";

export function celebrate() {
  void confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#fdcb6e", "#e84393", "#00b894", "#6c5ce7"],
  });
}
