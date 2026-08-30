export type BadgeTone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'purple';

export interface StatusView {
  label: string;
  tone: BadgeTone;
}

const appointment: Record<string, StatusView> = {
  SCHEDULED: { label: 'Programada', tone: 'blue' },
  ATTENDED: { label: 'Atendida', tone: 'green' },
  RESCHEDULED: { label: 'Reprogramada', tone: 'purple' },
  CANCELLED: { label: 'Cancelada', tone: 'gray' },
  NO_SHOW: { label: 'No asistió', tone: 'red' },
};

const confirmation: Record<string, StatusView> = {
  PENDING: { label: 'Pendiente', tone: 'amber' },
  CONFIRMED: { label: 'Confirmada', tone: 'green' },
  CANNOT_ATTEND: { label: 'No podrá asistir', tone: 'red' },
};

const reminder: Record<string, StatusView> = {
  PENDING: { label: 'Pendiente', tone: 'amber' },
  PROCESSING: { label: 'Procesando', tone: 'blue' },
  SENT: { label: 'Enviado', tone: 'green' },
  FAILED: { label: 'Fallido', tone: 'red' },
  CANCELLED: { label: 'Cancelado', tone: 'gray' },
};

const consent: Record<string, StatusView> = {
  UNKNOWN: { label: 'Sin registrar', tone: 'amber' },
  OPTED_IN: { label: 'Autorizado', tone: 'green' },
  OPTED_OUT: { label: 'No autorizado', tone: 'red' },
};

const importStatus: Record<string, StatusView> = {
  PENDING: { label: 'Pendiente', tone: 'amber' },
  VALIDATING: { label: 'Validando', tone: 'blue' },
  READY: { label: 'Preparada', tone: 'blue' },
  PROCESSING: { label: 'Procesando', tone: 'purple' },
  COMPLETED: { label: 'Completada', tone: 'green' },
  FAILED: { label: 'Fallida', tone: 'red' },
};

export function statusView(kind: string, value: string | boolean | null | undefined): StatusView {
  if (typeof value === 'boolean') {
    return value ? { label: 'Activo', tone: 'green' } : { label: 'Inactivo', tone: 'red' };
  }

  const lookup = kind === 'appointment'
    ? appointment
    : kind === 'confirmation'
      ? confirmation
      : kind === 'reminder'
        ? reminder
        : kind === 'consent'
          ? consent
          : kind === 'import'
            ? importStatus
            : {};

  return (value && lookup[value]) || { label: value || '-', tone: 'gray' };
}

export function purposeLabel(value: string | null | undefined): string {
  return value === 'CRED_APPOINTMENT_CONFIRMATION' ? 'Confirmación de cita CRED' : 'General';
}
