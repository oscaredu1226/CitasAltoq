export interface RedSummary {
  id: string;
  name: string;
}

export interface MicroredSummary {
  id: string;
  name: string;
  red?: RedSummary;
}

export interface Establishment {
  id: string;
  name: string;
  microred: MicroredSummary;
  red: RedSummary;
  active?: boolean;
}

export interface EstablishmentCatalogResponse {
  content?: Establishment[];
  establishments?: Establishment[];
}
