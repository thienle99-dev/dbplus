export type ApiErrorDetails = {
  message: string;
  status?: number;
  statusText?: string;
  code?: string;
  url?: string;
  method?: string;
  responseData?: unknown;
  sql?: string;
};

export function extractApiErrorDetails(err: any): ApiErrorDetails {
  const status: number | undefined = err?.response?.status;
  const statusText: string | undefined = err?.response?.statusText;
  const code: string | undefined = err?.code;
  const url: string | undefined = err?.config?.url;
  const method: string | undefined = err?.config?.method?.toUpperCase();
  const responseData: unknown = err?.response?.data;

  let message = 'Failed to execute query';
  if (typeof responseData === 'string' && responseData.trim()) {
    message = responseData;
  } else if (responseData && typeof responseData === 'object') {
    const maybeMessage = (responseData as any).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) message = maybeMessage;
    else message = JSON.stringify(responseData);
  } else if (typeof err?.message === 'string' && err.message.trim()) {
    message = err.message;
  }

  // Clean up Couchbase JSON error dumps from the message
  if (message.includes('{"extended_context"')) {
    const parts = message.split(': {');
    if (parts.length > 0) {
      message = parts[0];
    }
  }

  return {
    message,
    status,
    statusText,
    code,
    url,
    method,
    responseData,
  };
}
