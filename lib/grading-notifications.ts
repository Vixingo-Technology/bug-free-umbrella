export type NotificationPayload = {
  title: string;
  message: string;
  type: "GRADING";
  link: string;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function buildScheduledNotification(args: {
  targetRankName: string | null;
  eventDate: Date;
  location: string | null;
  eventName: string;
}): NotificationPayload {
  const rank = args.targetRankName ?? "belt test";
  const where = args.location ? ` at ${args.location}` : "";
  return {
    title: "Belt test scheduled",
    message: `Your ${rank} test is on ${formatDate(args.eventDate)} (${formatTime(args.eventDate)})${where}.`,
    type: "GRADING",
    link: "/portal/grading",
  };
}

export function buildDeclinedNotification(args: {
  reason: string | null;
}): NotificationPayload {
  const reason = args.reason?.trim();
  return {
    title: "Belt test request declined",
    message: reason
      ? `Your dojo declined your belt test request. Reason: ${reason}`
      : "Your dojo declined your belt test request. Please speak with your instructor.",
    type: "GRADING",
    link: "/portal/grading",
  };
}
