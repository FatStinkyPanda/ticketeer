import { create } from 'zustand';
import type { TicketResult, TicketGenerationError } from '../types/ticket.types';

interface TicketState {
  ticket: TicketResult | null;
  isLoading: boolean;
  error: TicketGenerationError | null;
  setTicket: (ticket: TicketResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: TicketGenerationError | null) => void;
  clearTicket: () => void;
  /** Replace the content of the current ticket without regenerating. */
  updateContent: (content: string) => void;
}

export const useTicketStore = create<TicketState>((set) => ({
  ticket: null,
  isLoading: false,
  error: null,

  setTicket: (ticket) =>
    set(() => ({
      ticket,
      isLoading: false,
      error: null,
    })),

  setLoading: (loading) => set(() => ({ isLoading: loading })),

  setError: (error) =>
    set(() => ({
      error,
      isLoading: false,
    })),

  clearTicket: () =>
    set(() => ({
      ticket: null,
      error: null,
      isLoading: false,
    })),

  updateContent: (content: string) =>
    set((state) => ({
      ticket: state.ticket ? { ...state.ticket, content } : null,
    })),
}));
