export type PinSortablePost = { id: string };

/** Adds pin state and returns a new array with the one pinned post first. */
export function withPinnedPostFirst<T extends PinSortablePost>(posts: readonly T[], pinnedPostId: string | null) {
  return posts
    .map((post) => ({ ...post, isPinned: pinnedPostId === post.id }))
    .sort((left, right) => Number(right.isPinned) - Number(left.isPinned));
}

export function canPinPost(status: "draft" | "published" | "unpublished") {
  return status === "published";
}
