export class RelayDurableObject {
  constructor(state, env) {
    this.camSender = null;
    this.camViewer = null;
    this.scrSender = null;
    this.scrViewer = null;
  }

  async fetch(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    server.addEventListener("message", (event) => {
      const data = event.data;
      if (typeof data === "string") {
        if (data === "camera_sender") {
          this.camSender = server;
          if (this.camViewer) this.camViewer.send("sender_online");
        } else if (data === "camera_viewer") {
          this.camViewer = server;
          if (this.camSender) {
            this.camSender.send("viewer_online");
            server.send("sender_online");
          } else {
            server.send("sender_offline");
          }
        } else if (data === "screen_sender") {
          this.scrSender = server;
          if (this.scrViewer) this.scrViewer.send("sender_online");
        } else if (data === "screen_viewer") {
          this.scrViewer = server;
          if (this.scrSender) {
            this.scrSender.send("viewer_online");
            server.send("sender_online");
          } else {
            server.send("sender_offline");
          }
        } else if (data === "ping") {
          server.send("pong");
        }
      } else {
        const target = (server === this.camSender) ? this.camViewer : (server === this.scrSender) ? this.scrViewer : null;
        if (target && target.readyState === 1) target.send(data);
      }
    });

    server.addEventListener("close", () => {
      if (server === this.camSender) {
        this.camSender = null;
        if (this.camViewer) this.camViewer.send("sender_offline");
      }
      if (server === this.camViewer) this.camViewer = null;
      if (server === this.scrSender) {
        this.scrSender = null;
        if (this.scrViewer) this.scrViewer.send("sender_offline");
      }
      if (server === this.scrViewer) this.scrViewer = null;
    });

    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(request, env) {
    if (request.headers.get("Upgrade") === "websocket") {
      const id = env.RELAY.idFromName("global-relay");
      const stub = env.RELAY.get(id);
      return stub.fetch(request);
    }
    return new Response("WebSocket relay server running!", { status: 200 });
  }
};