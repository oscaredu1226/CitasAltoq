import { purposeLabel, statusView } from './status-mappers';

describe('status mappers', () => {
  it('translates appointment status without exposing backend enum', () => {
    expect(statusView('appointment', 'SCHEDULED')).toEqual({ label: 'Programada', tone: 'blue' });
  });

  it('keeps appointment confirmation separate from attendance', () => {
    expect(statusView('confirmation', 'CONFIRMED').label).toBe('Confirmada');
    expect(statusView('appointment', 'ATTENDED').label).toBe('Atendida');
  });

  it('translates reminder purpose', () => {
    expect(purposeLabel('CRED_APPOINTMENT_CONFIRMATION')).toBe('Confirmación de cita CRED');
  });

  it('labels import batches ready for confirmation as prepared', () => {
    expect(statusView('import', 'READY')).toEqual({ label: 'Preparada', tone: 'blue' });
  });
});
