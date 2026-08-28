import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { mapApiError } from './error-message.mapper';

describe('error message mapper', () => {
  it('maps import checksum errors', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { code: 'IMPORT_FILE_CHANGED', requestId: 'req-1' },
    });

    expect(mapApiError(error)).toEqual({
      message: 'El archivo cambió después de la vista previa. Vuelve a analizarlo.',
      requestId: 'req-1',
    });
  });

  it('preserves request id from headers', () => {
    const error = new HttpErrorResponse({
      status: 500,
      headers: new HttpHeaders({ 'X-Request-ID': 'req-2' }),
    });

    expect(mapApiError(error).requestId).toBe('req-2');
  });
});
