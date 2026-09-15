import { purposeLabel, statusView } from './status-mappers';

describe('status mappers', () => {
  it('translates appointment status without exposing backend enum', () => {
    expect(statusView('appointment', 'SCHEDULED')).toEqual(expect.objectContaining({ label: 'Programada', tone: 'blue' }));
  });

  it('keeps appointment confirmation separate from attendance', () => {
    expect(statusView('confirmation', 'CONFIRMED').label).toBe('Confirmada');
    expect(statusView('appointment', 'ATTENDED').label).toBe('Atendida');
  });

  it('translates reminder purpose', () => {
    expect(purposeLabel('CRED_APPOINTMENT_CONFIRMATION')).toBe('Confirmación de cita CRED');
  });

  it('labels import batches ready for confirmation as prepared', () => {
    expect(statusView('import', 'READY')).toEqual(expect.objectContaining({ label: 'Preparada', tone: 'blue' }));
  });

  it('explains operational status labels for tooltip help', () => {
    expect(statusView('confirmation', 'CONFIRMED').description).toContain('No equivale a atención realizada');
    expect(statusView('reminder', 'FAILED').description).toContain('recordatorio');
  });

  it('labels patient roster membership without using active/inactive wording', () => {
    expect(statusView('patientRoster', true)).toEqual(expect.objectContaining({ label: 'En padrón', tone: 'green' }));
    expect(statusView('patientRoster', false)).toEqual(expect.objectContaining({ label: 'Fuera del padrón', tone: 'gray' }));
  });
});
