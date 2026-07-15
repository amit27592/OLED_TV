// Server-Sent Events hub. Each connection is bound to a TV id (channel).
export class SSEHub {
  constructor() {
    this.channels = new Map(); // tvId -> Set<res>
    this._ka = setInterval(() => this._keepalive(), 25000);
    this._ka.unref?.();
  }

  add(tvId, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(':connected\n\n');
    if (!this.channels.has(tvId)) this.channels.set(tvId, new Set());
    this.channels.get(tvId).add(res);
    res.on('close', () => {
      const set = this.channels.get(tvId);
      if (set) {
        set.delete(res);
        if (!set.size) this.channels.delete(tvId);
      }
    });
  }

  send(tvId, event, data) {
    const set = this.channels.get(tvId);
    if (!set) return;
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) res.write(msg);
  }

  connectedTvIds() {
    return [...this.channels.keys()];
  }

  _keepalive() {
    for (const set of this.channels.values()) {
      for (const res of set) res.write(':ka\n\n');
    }
  }
}
