const CACHET_HOST = process.env.CACHET_HOST ?? "https://cachet.hackclub.com";

export type CachetUser = {
  id: string;
  userId: string;
  displayName: string;
  pronouns: string;
  imageUrl: string;
};

export type EnrichedSlackUser = CachetUser & {
  slackId: string;
};

export async function getCachetUser(
  slackId: string,
): Promise<EnrichedSlackUser | null> {
  const response = await fetch(`${CACHET_HOST}/users/${slackId}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!response.ok) return null;

  const user = (await response.json()) as CachetUser;
  return {
    ...user,
    slackId,
  };
}

export async function getCachetUsers(slackIds: string[]) {
  const uniqueSlackIds = [...new Set(slackIds.filter(Boolean))];
  const users = await Promise.all(
    uniqueSlackIds.map(async (slackId) => [slackId, await getCachetUser(slackId)] as const),
  );

  return new Map(users);
}
