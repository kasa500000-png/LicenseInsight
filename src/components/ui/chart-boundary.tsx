"use client";

import { Component, type ReactNode } from "react";

type ChartBoundaryProps = Readonly<{ children: ReactNode; fallback: ReactNode }>;
type ChartBoundaryState = Readonly<{ failed: boolean }>;

/** Client-render isolation only. The accessible table belongs outside this boundary. */
export class ChartBoundary extends Component<ChartBoundaryProps, ChartBoundaryState> {
  state: ChartBoundaryState = { failed: false };

  static getDerivedStateFromError(): ChartBoundaryState {
    // Do not retain, display, or send the exception or its component stack.
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
