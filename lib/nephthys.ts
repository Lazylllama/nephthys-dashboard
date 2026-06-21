export const NEPHTHYS_HOST =
  process.env.NEPHTHYS_HOST ?? "https://stardance.nephthys.hackclub.com";

export type NephthysUser = {
  id: number;
  slack_id: string;
  username?: string | null;
};

export type Helper = {
  id: number;
  slack_id: string;
  count: number;
};

export type Ticket = {
  id: number;
  title: string | null;
  status: "OPEN" | "CLOSED" | "IN_PROGRESS" | string;
  opened_by: NephthysUser | null;
  closed_by: NephthysUser | null;
  assigned_to: NephthysUser | null;
  reopened_by: NephthysUser | null;
  team_tags: string[];
  created_at: string;
  closed_at: string | null;
  message_ts: string;
};

export type PeriodStats = {
  new_tickets_total: number;
  new_tickets_now_closed: number;
  new_tickets_still_open: number;
  new_tickets_in_progress: number;
  closed_today: number;
  closed_today_from_today: number;
  assigned_today_in_progress: number;
  helpers_leaderboard: Helper[];
  mean_hang_time_minutes_unresolved: number | null;
  mean_hang_time_minutes_all: number | null;
  mean_resolution_time_minutes: number | null;
};

export type Stats = {
  all_time: {
    tickets_total: number;
    tickets_open: number;
    tickets_closed: number;
    tickets_in_progress: number;
    helpers_leaderboard: Helper[];
    mean_hang_time_minutes_unresolved: number | null;
    mean_hang_time_minutes_all: number | null;
    mean_resolution_time_minutes: number | null;
    oldest_unanswered_ticket: {
      id: number;
      created_at: string;
      age_minutes: number;
      link: string;
    } | null;
  };
  past_24h: PeriodStats;
  past_24h_previous: PeriodStats;
  past_7d: PeriodStats;
  past_7d_previous: PeriodStats;
};

export type TicketResponse = {
  value: Ticket[];
  Count: number;
};

type FetchOptions = {
  revalidate?: number;
};

export async function fetchNephthys<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const response = await fetch(`${NEPHTHYS_HOST}${path}`, {
    headers: { accept: "application/json" },
    next: { revalidate: options.revalidate ?? 30 },
  });

  if (!response.ok) {
    throw new Error(`Nephthys request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getStats() {
  return fetchNephthys<Stats>("/api/stats_v2", { revalidate: 30 });
}

export function getTickets(searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams);
  if (!params.has("status")) params.set("status", "open");
  if (
    params.get("status") === "closed" &&
    !params.has("since") &&
    !params.has("after") &&
    !params.has("until") &&
    !params.has("before")
  ) {
    params.set("since", daysAgoIsoDate(30));
  }

  return fetchNephthys<TicketResponse | Ticket[]>(`/api/tickets?${params}`, {
    revalidate: 30,
  });
}

function daysAgoIsoDate(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
