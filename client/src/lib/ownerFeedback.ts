export function canLeaveOwnerFeedback(status: "draft" | "published" | "unpublished") {
  return status === "unpublished";
}

export function isValidOwnerFeedback(body: string) {
  const length = body.trim().length;
  return length >= 1 && length <= 8000;
}
