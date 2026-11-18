export type AuthAction = "sign-in" | "registration";

type AuthErrorDetails = {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
};

const getDetails = (error: unknown): AuthErrorDetails => {
  if (typeof error === "string") return { message: error };
  if (error instanceof Error) return { message: error.message, name: error.name };
  if (typeof error === "object" && error !== null) {
    const candidate = error as AuthErrorDetails;
    return {
      code: candidate.code,
      message: candidate.message,
      name: candidate.name,
      status: candidate.status,
    };
  }
  return {};
};

export const getAuthErrorMessage = (error: unknown, action: AuthAction): string => {
  const { code, message = "", name, status } = getDetails(error);
  const normalized = `${code ?? ""} ${message} ${name ?? ""}`.toLowerCase();

  if (
    name === "TypeError" ||
    /failed to fetch|fetch failed|networkerror|network request failed|load failed|err_network/.test(normalized)
  ) {
    return "We can’t reach the sign-in service. Check your internet connection and try again.";
  }

  if (status === 429 || /rate.?limit|too many requests|email rate limit/.test(normalized)) {
    return "Too many attempts were made. Please wait a few minutes before trying again.";
  }

  if (/email_not_confirmed|email not confirmed/.test(normalized)) {
    return "Please confirm your email using the link we sent, then sign in again.";
  }

  if (/invalid login credentials|invalid_credentials|invalid email or password/.test(normalized)) {
    return "Email or password is incorrect. Check both and try again.";
  }

  if (/user already registered|already been registered|email_exists|user_already_exists/.test(normalized)) {
    return "An account may already use this email. Try signing in instead.";
  }

  if (status === 0 || /service unavailable|temporarily unavailable|gateway timeout/.test(normalized)) {
    return "The sign-in service is temporarily unavailable. Please try again shortly.";
  }

  if (action === "registration") {
    return "We couldn’t create your account. Check your details and try again.";
  }

  return "We couldn’t sign you in. Check your details and try again.";
};