import { create } from 'zustand';
import type { AlertData } from '../types/alert.types';

interface AlertState {
  formData: AlertData;
  setField: <K extends keyof AlertData>(field: K, value: AlertData[K]) => void;
  resetForm: () => void;
}

const EMPTY_ALERT: AlertData = {
  timestamp: '',
  alert_category: '',
  alert_signature: '',
  src_ip: '',
  src_ip_is_public: false,
  src_port: '',
  dest_ip: '',
  dest_ip_is_public: false,
  dest_port: '',
  proto: '',
  app_proto: '',
  reported_by: '',
};

export const useAlertStore = create<AlertState>((set) => ({
  formData: { ...EMPTY_ALERT },

  setField: (field, value) =>
    set((state) => ({
      formData: { ...state.formData, [field]: value },
    })),

  resetForm: () =>
    set(() => ({
      formData: { ...EMPTY_ALERT },
    })),
}));
