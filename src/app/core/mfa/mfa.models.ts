export interface MfaStatus {
  available: boolean;
  enrolled: boolean;
  setupPending: boolean;
  setupExpiresAt: string | null;
  elevatedUntil: string | null;
  recoveryCodesRemaining: number;
}

export interface MfaSetupResponse {
  provisioningUri: string;
  secret: string;
  expiresAt: string;
}

export interface MfaElevation {
  mfaToken: string;
  expiresAt: string;
}

export interface MfaConfirmResponse {
  recoveryCodes: string[];
  elevation: MfaElevation;
}
