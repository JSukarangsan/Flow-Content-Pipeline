import { useState, useCallback } from 'react';

interface HistoryState {
  past: string[];
  present: string;
  future: string[];
}

export function useHistory(initialValue: string = '') {
  const [state, setState] = useState<HistoryState>({
    past: [],
    present: initialValue,
    future: [],
  });

  const set = useCallback((newValue: string, replace = false) => {
    setState((prev) => {
      if (newValue === prev.present) return prev;

      if (replace) {
        return { ...prev, present: newValue };
      }

      return {
        past: [...prev.past, prev.present].slice(-50), // Keep last 50 states
        present: newValue,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newValue: string) => {
    setState({
      past: [],
      present: newValue,
      future: [],
    });
  }, []);

  return {
    value: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
