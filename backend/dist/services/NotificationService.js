export class NotificationService {
    subscribers = new Map();
    eventLog = [];
    addSubscriber(input) {
        const id = `SUB-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const item = {
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
    async dispatch(event, payload) {
        const record = {
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
