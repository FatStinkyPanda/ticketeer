export interface AlertData {
  timestamp: string;
  alert_category: string;
  alert_signature: string;
  src_ip: string;
  src_ip_is_public: boolean;
  src_port: string;
  dest_ip: string;
  dest_ip_is_public: boolean;
  dest_port: string;
  proto: string;
  app_proto: string;
  reported_by: string;
}

export type AlertField = keyof AlertData;

export interface PiiValidationResult {
  valid: true;
}

export interface PiiValidationError {
  valid: false;
  errors: PiiFieldError[];
}

export interface PiiFieldError {
  field: AlertField | 'general';
  message: string;
  severity: 'error' | 'warn';
}

export type PiiGuardResult = PiiValidationResult | PiiValidationError;
