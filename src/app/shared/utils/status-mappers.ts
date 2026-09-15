export type BadgeTone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'purple';

export interface StatusView {
  label: string;
  tone: BadgeTone;
  description?: string;
}

const appointment: Record<string, StatusView> = {
  SCHEDULED: { label: 'Programada', tone: 'blue', description: 'Cita registrada para una fecha pendiente de atención.' },
  ATTENDED: { label: 'Atendida', tone: 'green', description: 'La cita fue marcada como realizada en el establecimiento.' },
  RESCHEDULED: { label: 'Reprogramada', tone: 'purple', description: 'La cita cambió de fecha y conserva su historial.' },
  CANCELLED: { label: 'Cancelada', tone: 'gray', description: 'La cita fue anulada y no debe considerarse para atención.' },
  NO_SHOW: { label: 'No asistió', tone: 'red', description: 'El paciente no asistió a la cita programada.' },
};

const confirmation: Record<string, StatusView> = {
  PENDING: { label: 'Pendiente', tone: 'amber', description: 'El paciente aún no confirma si asistirá a la cita.' },
  CONFIRMED: { label: 'Confirmada', tone: 'green', description: 'El paciente confirmó intención de asistir. No equivale a atención realizada.' },
  CANNOT_ATTEND: { label: 'No podrá asistir', tone: 'red', description: 'El paciente indicó que no podrá asistir a la cita.' },
};

const reminder: Record<string, StatusView> = {
  PENDING: { label: 'Pendiente', tone: 'amber', description: 'Recordatorio CRED en espera de preparación o envío por WhatsApp.' },
  PROCESSING: { label: 'Procesando', tone: 'blue', description: 'El sistema está preparando o enviando el recordatorio por WhatsApp.' },
  SENT: { label: 'Enviado', tone: 'green', description: 'WhatsApp aceptó el envío del recordatorio.' },
  FAILED: { label: 'Fallido', tone: 'red', description: 'No se pudo entregar el recordatorio. Revisa el canal o los datos del contacto.' },
  CANCELLED: { label: 'Cancelado', tone: 'gray', description: 'El recordatorio fue detenido y ya no será enviado.' },
};

const consent: Record<string, StatusView> = {
  UNKNOWN: { label: 'Sin registrar', tone: 'amber', description: 'Aún no se registró una decisión de consentimiento para WhatsApp.' },
  OPTED_IN: { label: 'Autorizado', tone: 'green', description: 'El contacto autorizó recibir comunicaciones por WhatsApp.' },
  OPTED_OUT: { label: 'No autorizado', tone: 'red', description: 'El contacto no autorizó comunicaciones por WhatsApp.' },
};

const importStatus: Record<string, StatusView> = {
  PENDING: { label: 'Pendiente', tone: 'amber', description: 'El archivo fue recibido y está esperando validación.' },
  VALIDATING: { label: 'Validando', tone: 'blue', description: 'El sistema está revisando estructura, datos y reglas del Excel.' },
  READY: { label: 'Preparada', tone: 'blue', description: 'La vista previa está lista para revisión antes de aplicar cambios.' },
  PROCESSING: { label: 'Procesando', tone: 'purple', description: 'La importación está aplicando los cambios confirmados.' },
  COMPLETED: { label: 'Completada', tone: 'green', description: 'La importación terminó correctamente.' },
  FAILED: { label: 'Fallida', tone: 'red', description: 'La importación no pudo completarse y requiere revisión.' },
};

const patientRoster: Record<string, StatusView> = {
  true: { label: 'En padrón', tone: 'green', description: 'Indica si el paciente permanece en el último padrón completo importado.' },
  false: { label: 'Fuera del padrón', tone: 'gray', description: 'Indica que el paciente no aparece en el último padrón completo importado. No significa que reciba o deje de recibir WhatsApp por sí solo.' },
};

export function statusView(kind: string, value: string | boolean | null | undefined): StatusView {
  if (kind === 'patientRoster' && typeof value === 'boolean') {
    return patientRoster[String(value)];
  }

  if (typeof value === 'boolean') {
    return value
      ? { label: 'Activo', tone: 'green', description: 'Disponible y habilitado para operar.' }
      : { label: 'Inactivo', tone: 'red', description: 'No está habilitado para operar.' };
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
            : kind === 'patientRoster'
              ? patientRoster
              : {};

  const key = typeof value === 'string' ? value : String(value);
  return (value !== undefined && value !== null && lookup[key]) || { label: value || '-', tone: 'gray', description: value ? 'Estado recibido desde el sistema.' : undefined };
}

export function purposeLabel(value: string | null | undefined): string {
  return value === 'CRED_APPOINTMENT_CONFIRMATION' ? 'Confirmación de cita CRED' : 'General';
}
