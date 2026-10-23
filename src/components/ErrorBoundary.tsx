import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorPage } from "@/components/ErrorPage";

type Props = { children: ReactNode; /** Muda a cada navegação para limpar o erro ao trocar de rota. */ resetKey: string };
type State = { error: Error | null; resetKey: string };

/** Captura erros de renderização das telas e mostra a página 500 em vez de uma tela em branco. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorPage kind="500" detail={this.state.error.message} />;
  }
}
