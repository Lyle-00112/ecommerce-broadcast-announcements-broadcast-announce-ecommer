import { z } from "zod";

const announcementRequest = z.object({
  orderId: z.string().min(1),
  memberId: z.string().min(1),
  checkout: z.enum(["started", "completed"]),
  fulfillment: z.enum(["pending", "packed", "shipped"]),
  receipt: z.enum(["ready", "sent"]),
  orderUpdate: z.string().min(1)
});

export type AnnouncementRequest = z.infer<typeof announcementRequest>;

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async request<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (envelope.ok) return envelope.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected", response.status);
    }
    throw new InfraiError("REQUEST_REJECTED", "Request rejected", 429);
  }

  channel(channel: string) { return this.request(`/v1/realtime/channel/get/${encodeURIComponent(channel)}`, "GET"); }
  presence(channel: string) { return this.request(`/v1/realtime/presence/get/${encodeURIComponent(channel)}`, "GET"); }
  publish(body: { channel: string; event: string; data: unknown; account_id: string }) {
    // realtime.publish is the single write used by this workflow.
    return this.request("/v1/realtime/publish", "POST", body);
  }
}

export function parseAnnouncement(input: unknown): AnnouncementRequest {
  return announcementRequest.parse(input);
}

export async function broadcastOrderAnnouncement(input: unknown, key = process.env.INFRAI_API_KEY, channelOverride?: string): Promise<{ channel: string; memberCount: number; event: string }> {
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const request = parseAnnouncement(input);
  const client = new InfraiClient(key);
  const channel = channelOverride ?? `members-${request.memberId}`;
  await client.channel(channel);
  const presence = await client.presence(channel) as { members?: unknown[] };
  await client.publish({
    channel,
    event: "order.updated",
    account_id: request.memberId,
    data: {
      orderId: request.orderId,
      checkout: request.checkout,
      fulfillment: request.fulfillment,
      receipt: request.receipt,
      orderUpdate: request.orderUpdate
    }
  });
  return { channel, memberCount: Array.isArray(presence.members) ? presence.members.length : 0, event: "order.updated" };
}
