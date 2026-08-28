export function maskPhone(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length < 6) {
    return value;
  }

  const last = digits.slice(-3);
  const prefix = value.trim().startsWith('+') ? `+${digits.slice(0, 2)}` : digits.slice(0, 2);
  return `${prefix} 9** *** ${last}`;
}
