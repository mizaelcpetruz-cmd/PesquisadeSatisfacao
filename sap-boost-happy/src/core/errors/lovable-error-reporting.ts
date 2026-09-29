export function reportErrorToDev(error: unknown, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.error("[Dev Error Reporter]", error, context);
  }
}
