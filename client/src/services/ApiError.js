/** Error thrown by the API client. `status` 0 means the request never reached the server. */
export class ApiError extends Error {
  constructor(message, status = 500, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}
