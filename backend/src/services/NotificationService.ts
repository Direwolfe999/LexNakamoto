type Subscriber = {
  id: string;
  channel: "webhook" | "email" | "telegram";
  target: string;
  createdAt: number;
};

type NotificationEvent = {
  id: string;
  event: string;
  payload: Record<string, unknown>;
  at: number;
};

export class NotificationService {
  private readonly subscribers = new Map<string, Subscriber>();
  private readonly eventLog: NotificationEvent[] = [];

  addSubscriber(input: { channel: "webhook" | "email" | "telegram"; target: string }) {
    const id = `SUB-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const item: Subscriber = {
      id,
      channel: input.channel,
      target: input.target,
      createdAt: Date.now(),
    };
    this.subscribers.set(id, item);
    return item;
  }

  listSubscribers() {
    return Array.from(this.subscribers.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  async dispatch(event: string, payload: Record<string, unknown>) {
    const record: NotificationEvent = {
      id: `NTF-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      event,
      payload,
      at: Date.now(),
    };
    this.eventLog.unshift(record);
    this.eventLog.splice(50);

    // Lean hackathon implementation: log fanout targets for observability.
    for (const sub of this.subscribers.values()) {
      console.log(`[notify:${sub.channel}] ${sub.target} <= ${event}`);
    }

    return { sentTo: this.subscribers.size, record };
  }

  recentEvents() {
    return this.eventLog;
  }
}
