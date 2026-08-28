export interface ApiProblem {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  requestId?: string;
  code?: string;
}

export interface UiError {
  message: string;
  requestId?: string;
}
