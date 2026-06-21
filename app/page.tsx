import { ArrowUpRight } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCachetUsers, type EnrichedSlackUser } from "@/lib/cachet";
import { getStats, getTickets, NEPHTHYS_HOST, type Helper, type Ticket } from "@/lib/nephthys";

export const dynamic = "force-dynamic";
export const revalidate = 30;

const formatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const SLACK_WORKSPACE = "https://hackclub.slack.com";
const STARDANCE_CHANNEL_ID = "C0AP0NMSP3P";
const PAGE_SIZE = 20;

type PageProps = {
  searchParams?: Promise<{
    page?: string;
    status?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = normalizeStatus(params?.status);
  const page = Math.max(1, Number(params?.page ?? "1") || 1);
  const [stats, ticketResponse] = await Promise.all([
    getStats(),
    getTickets(new URLSearchParams({ status })),
  ]);
  const tickets = Array.isArray(ticketResponse)
    ? ticketResponse
    : (ticketResponse.value ?? []);
  const totalTickets = Array.isArray(ticketResponse)
    ? tickets.length
    : (ticketResponse.Count ?? tickets.length);
  const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleTickets = tickets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const slackIds = [
    ...stats.all_time.helpers_leaderboard.slice(0, 8).map((helper) => helper.slack_id),
    ...visibleTickets.flatMap((ticket) => [
      ticket.opened_by?.slack_id,
      ticket.assigned_to?.slack_id,
    ]),
  ].filter((slackId): slackId is string => Boolean(slackId));

  const cachetUsers = await getCachetUsers(slackIds);
  const activeTickets = stats.all_time.tickets_open + stats.all_time.tickets_in_progress;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <Badge variant="secondary">Stardance Nephthys</Badge>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Tickets
          </h1>
          <p className="text-sm text-muted-foreground">{NEPHTHYS_HOST}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href="/api/stats">Stats JSON</a>
          </Button>
          <Button asChild variant="outline">
            <a href={slackChannelLink()} rel="noreferrer" target="_blank">
              Slack
              <ArrowUpRight data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Open" value={stats.all_time.tickets_open} description="waiting now" />
        <MetricCard
          label="In progress"
          value={stats.all_time.tickets_in_progress}
          description="assigned now"
        />
        <MetricCard label="Active" value={activeTickets} description="open + in progress" />
        <MetricCard
          label="Closed"
          value={stats.all_time.tickets_closed}
          description={`${formatNumber(stats.all_time.tickets_total)} total`}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Ticket list</CardTitle>
                <CardDescription>
                  {formatNumber(totalTickets)} {status.replace("_", " ")} tickets
                </CardDescription>
              </div>
              <StatusFilters status={status} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <TicketTable tickets={visibleTickets} users={cachetUsers} />
            <PaginationControls
              page={safePage}
              pageSize={PAGE_SIZE}
              status={status}
              total={tickets.length}
              totalPages={totalPages}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Oldest unanswered</CardTitle>
              <CardDescription>
                {stats.all_time.oldest_unanswered_ticket
                  ? `Ticket #${stats.all_time.oldest_unanswered_ticket.id}`
                  : "No unanswered ticket"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <div className="text-3xl font-semibold">
                  {minutesLabel(stats.all_time.oldest_unanswered_ticket?.age_minutes)}
                </div>
                <p className="text-sm text-muted-foreground">current age</p>
              </div>
              {stats.all_time.oldest_unanswered_ticket ? (
                <Button asChild size="sm">
                  <a
                    href={stats.all_time.oldest_unanswered_ticket.link}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Slack
                    <ArrowUpRight data-icon="inline-end" />
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timing</CardTitle>
              <CardDescription>All-time average durations</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <TimingRow
                label="Unresolved hang"
                value={stats.all_time.mean_hang_time_minutes_unresolved}
              />
              <TimingRow
                label="All-ticket hang"
                value={stats.all_time.mean_hang_time_minutes_all}
              />
              <TimingRow
                label="Resolution"
                value={stats.all_time.mean_resolution_time_minutes}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Helper leaderboard</CardTitle>
            <CardDescription>Cachet-enriched Slack identities</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {stats.all_time.helpers_leaderboard.slice(0, 8).map((helper) => (
              <HelperRow
                key={helper.id}
                helper={helper}
                user={cachetUsers.get(helper.slack_id) ?? null}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent movement</CardTitle>
            <CardDescription>Current period versus previous period</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <PeriodRow
              label="New tickets, 24h"
              current={stats.past_24h.new_tickets_total}
              previous={stats.past_24h_previous.new_tickets_total}
            />
            <PeriodRow
              label="Closed, 24h"
              current={stats.past_24h.closed_today}
              previous={stats.past_24h_previous.closed_today}
            />
            <PeriodRow
              label="New tickets, 7d"
              current={stats.past_7d.new_tickets_total}
              previous={stats.past_7d_previous.new_tickets_total}
            />
            <PeriodRow
              label="Closed, 7d"
              current={stats.past_7d.closed_today}
              previous={stats.past_7d_previous.closed_today}
            />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{formatNumber(value)}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function HelperRow({
  helper,
  user,
}: {
  helper: Helper;
  user: EnrichedSlackUser | null;
}) {
  const name = displayName(helper.slack_id, user);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar>
          {user?.imageUrl ? <AvatarImage alt={name} src={user.imageUrl} /> : null}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <a
            className="block truncate text-sm font-medium underline-offset-4 hover:underline"
            href={slackUserLink(helper.slack_id)}
            rel="noreferrer"
            target="_blank"
          >
            {name}
          </a>
          <p className="truncate text-xs text-muted-foreground">{helper.slack_id}</p>
        </div>
      </div>
      <Badge variant="outline">{formatNumber(helper.count)}</Badge>
    </div>
  );
}

function TicketTable({
  tickets,
  users,
}: {
  tickets: Ticket[];
  users: Map<string, EnrichedSlackUser | null>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticket</TableHead>
          <TableHead>Opened by</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Links</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => {
          const openedBy = ticket.opened_by?.slack_id
            ? users.get(ticket.opened_by.slack_id) ?? null
            : null;
          const assignedTo = ticket.assigned_to?.slack_id
            ? users.get(ticket.assigned_to.slack_id) ?? null
            : null;

          return (
            <TableRow key={ticket.id}>
              <TableCell>
                <div className="max-w-[360px]">
                  <p className="truncate font-medium">
                    #{ticket.id} {ticket.title ?? "Untitled"}
                  </p>
                  <Badge variant="secondary">{ticket.status}</Badge>
                </div>
              </TableCell>
              <TableCell>
                {ticket.opened_by
                  ? (
                      <SlackUserLink
                        fallback={ticket.opened_by.username}
                        slackId={ticket.opened_by.slack_id}
                        user={openedBy}
                      />
                    )
                  : "Unknown"}
              </TableCell>
              <TableCell>
                {ticket.assigned_to
                  ? (
                      <SlackUserLink
                        fallback={ticket.assigned_to.username}
                        slackId={ticket.assigned_to.slack_id}
                        user={assignedTo}
                      />
                    )
                  : "Unassigned"}
              </TableCell>
              <TableCell>{dateFormatter.format(new Date(ticket.created_at))}</TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="ghost">
                  <a href={slackTicketLink(ticket)} rel="noreferrer" target="_blank">
                    Slack
                    <ArrowUpRight data-icon="inline-end" />
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function SlackUserLink({
  fallback,
  slackId,
  user,
}: {
  fallback?: string | null;
  slackId: string;
  user: EnrichedSlackUser | null;
}) {
  return (
    <a
      className="underline-offset-4 hover:underline"
      href={slackUserLink(slackId)}
      rel="noreferrer"
      target="_blank"
    >
      {displayName(slackId, user, fallback)}
    </a>
  );
}

function StatusFilters({ status }: { status: string }) {
  const statuses = [
    ["open", "Open"],
    ["in_progress", "In progress"],
    ["closed", "Closed"],
  ] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map(([value, label]) => (
        <Button
          asChild
          key={value}
          size="sm"
          variant={status === value ? "default" : "outline"}
        >
          <a href={`/?status=${value}`}>{label}</a>
        </Button>
      ))}
    </div>
  );
}

function PaginationControls({
  page,
  pageSize,
  status,
  total,
  totalPages,
}: {
  page: number;
  pageSize: number;
  status: string;
  total: number;
  totalPages: number;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <span>
        Showing {formatNumber(start)}-{formatNumber(end)} of {formatNumber(total)}
      </span>
      <div className="flex gap-2">
        <Button asChild disabled={page <= 1} size="sm" variant="outline">
          <a href={pageHref(status, page - 1)}>Previous</a>
        </Button>
        <Badge variant="secondary">
          Page {formatNumber(page)} / {formatNumber(totalPages)}
        </Badge>
        <Button asChild disabled={page >= totalPages} size="sm" variant="outline">
          <a href={pageHref(status, page + 1)}>Next</a>
        </Button>
      </div>
    </div>
  );
}

function TimingRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{minutesLabel(value)}</span>
    </div>
  );
}

function PeriodRow({
  label,
  current,
  previous,
}: {
  label: string;
  current: number;
  previous: number;
}) {
  const difference = current - previous;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">previous: {formatNumber(previous)}</p>
      </div>
      <div className="text-right">
        <p className="text-xl font-semibold">{formatNumber(current)}</p>
        <Badge variant={difference === 0 ? "secondary" : "outline"}>
          {difference > 0 ? "+" : ""}
          {formatNumber(difference)}
        </Badge>
      </div>
    </div>
  );
}

function displayName(
  slackId: string,
  user: EnrichedSlackUser | null,
  fallback?: string | null,
) {
  if (user?.displayName && user.displayName !== "Unknown") return user.displayName;
  return fallback || slackId;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatNumber(value: number) {
  return formatter.format(value);
}

function minutesLabel(minutes?: number | null) {
  if (minutes == null) return "—";
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) return `${rounded}m`;
  const hours = Math.round(rounded / 60);
  if (hours < 72) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function normalizeStatus(status?: string) {
  if (status === "closed" || status === "in_progress") return status;
  return "open";
}

function pageHref(status: string, page: number) {
  const params = new URLSearchParams({ status, page: String(Math.max(1, page)) });
  return `/?${params}`;
}

function slackChannelLink() {
  return `${SLACK_WORKSPACE}/archives/${STARDANCE_CHANNEL_ID}`;
}

function slackTicketLink(ticket: Ticket) {
  return `${slackChannelLink()}/p${ticket.message_ts.replace(".", "")}`;
}

function slackUserLink(slackId: string) {
  return `${SLACK_WORKSPACE}/team/${slackId}`;
}
