const DEFAULT_ERROR_MESSAGE =
  "We couldn't complete that just now. Please try again.";

export function getFriendlyErrorMessage(
  error: unknown,
  fallback = DEFAULT_ERROR_MESSAGE,
): string {
  const message =
    typeof error === "string"
      ? error.trim()
      : error instanceof Error
        ? error.message.trim()
        : error &&
            typeof error === "object" &&
            "message" in error &&
            typeof error.message === "string"
          ? error.message.trim()
        : "";

  if (!message) return fallback;
  if (
    /login session (is missing|has expired)|session has expired|unauthorized|request failed with status code 401/i.test(
      message,
    )
  ) {
    return "Your sign-in has expired. Please sign in again to continue.";
  }
  if (
    /request failed with status code 5\d{2}|http(?: error)?\s*5\d{2}|bad gateway|service unavailable|gateway timeout/i.test(
      message,
    )
  ) {
    return "The service is temporarily unavailable. Please try again in a moment.";
  }
  if (/request failed with status code 4\d{2}|http(?: error)?\s*4\d{2}/i.test(message)) {
    return "We couldn't complete that request. Please check the details and try again.";
  }
  if (/request validation failed/i.test(message)) {
    return "Some information needs a quick check. Please review it and try again.";
  }
  if (/timed? out|timeout|took too long|econnaborted/i.test(message)) {
    return "This is taking longer than expected. Please check your connection and try again.";
  }
  if (
    /api is not configured|unable to reach .*server|network error|network request failed|failed to fetch|econnrefused/i.test(
      message,
    )
  ) {
    return "We can't connect right now. Please check your internet connection and try again.";
  }
  if (
    /server returned an error|internal server error|api request failed|auth request failed/i.test(
      message,
    )
  ) {
    return "The service is temporarily unavailable. Please try again in a moment.";
  }
  if (/server (did not return|returned an invalid)/i.test(message)) {
    return fallback;
  }

  return message;
}
