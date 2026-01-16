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
    try {
      const startIndex = message.indexOf('{');
      if (startIndex !== -1) {
        const jsonStr = message.substring(startIndex);
        const errorObj = JSON.parse(jsonStr);

        // Couchbase error structure often has extended_context.message
        if (errorObj.extended_context?.message) {
          message = errorObj.extended_context.message;
        } else if (errorObj.message) {
          message = errorObj.message;
        }
      }
    } catch (e) {
      // Fallback: just strip the JSON blob if parsing fails
      const parts = message.split(': {');
      if (parts.length > 0) {
        message = parts[0].trim();
      }
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
