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
  let responseData: unknown = err?.response?.data;

  // If responseData is a string, try to parse it as JSON in case the backend sent a structured error as a string
  if (typeof responseData === 'string' && responseData.startsWith('{')) {
    try {
      responseData = JSON.parse(responseData);
    } catch (e) {
      // Not valid JSON, keep as string
    }
  }

  let message = '';

  if (responseData && typeof responseData === 'object') {
    const rd = responseData as any;
    // Check various common error field names
    message = rd.message || rd.error || rd.detail || rd.msg || '';

    // If we still don't have a message but we have a db object (common in our backend)
    if (!message && rd.db && typeof rd.db === 'object') {
      message = rd.db.message || rd.db.detail || '';
    }

    // If still no message, stringify the whole object
    if (!message) message = JSON.stringify(responseData);
  } else if (typeof responseData === 'string' && responseData.trim()) {
    message = responseData;
  } else if (typeof err?.message === 'string' && err.message.trim()) {
    message = err.message;
  } else if (err && typeof err === 'string' && err.trim()) {
    message = err;
  }

  if (!message) {
    message = status === 500 ? 'Internal Server Error' : 'An unknown error occurred';
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
