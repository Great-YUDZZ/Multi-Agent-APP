/**
 * Custom error types for LLM Provider API Key validation and communication
 */

export class ApiKeyMissingError extends Error {
  readonly providerId: string;
  readonly providerName?: string;

  constructor(providerId: string, providerName?: string) {
    super('Silakan masukkan API key Anda terlebih dahulu untuk memulai percakapan.');
    this.name = 'ApiKeyMissingError';
    this.providerId = providerId;
    this.providerName = providerName;
    Object.setPrototypeOf(this, ApiKeyMissingError.prototype);
  }
}

export class ApiKeyInvalidError extends Error {
  readonly providerId: string;
  readonly providerName?: string;
  readonly detail?: string;

  constructor(providerId: string, detail?: string, providerName?: string) {
    super('Ada sesuatu yang salah pada API key Anda. Silakan periksa kembali API key atau kuota Anda di Pengaturan.');
    this.name = 'ApiKeyInvalidError';
    this.providerId = providerId;
    this.providerName = providerName;
    this.detail = detail;
    Object.setPrototypeOf(this, ApiKeyInvalidError.prototype);
  }
}
