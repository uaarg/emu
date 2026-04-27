export class UAVConnection {
    constructor() {
        this.isConnected = false;
        this.socket = null;
        this.url = null;
        this.recvMessageCB = () => {}; // default callback to empty function
    }

    connect() {
        if (this.socket !== null) {
            console.warn("Connection attempt with already existing websocket. Aborting.");
            return;
        }
        if (this.url === null) {
            console.warn("Cannot create connection: no URL specified. Ensure UAVConnection.url is set.")
            return;
        }
        if (!this.url.ends.endsWith("/ws")) {
            this.url = this.url + "/ws";
        }
        this.socket = new WebSocket(this.url);
        this.socket.onopen = this.onOpen.bind(this);
        this.socket.onclose = this.onClose.bind(this);
        this.socket.onmessage = this.onMessage.bind(this);
        this.socket.onerror = this.onError.bind(this);
    }

    disconnect() {
        if (this.socket !== null) {
            this.socket.close();
        }
        console.warn("Disconnection attempt while socket is null.");
    }    

    onOpen() {
        this.isConnected = true;
        console.log("websocket to backend opened");
    }

    onClose() {
        this.isConnected = false;
        this.socket = null;
        console.log("websocket to backend closed");
    }

    onMessage(event) {
        if (this.socket !== null) {
            try {
                const message = JSON.parse(event.data);
                this.recvMessageCB(message);
            } catch (error) {
                if (error instanceof SyntaxError) {
                    console.error("invalid json:", event.data);
                } else {
                    console.error("incoming message error:", error.message);
                }
            }

        }
    }

    onError(event) {
            console.warn("websocket error", event);
    }

    sendMessage(message) {
        if (this.socket !== null) {
            if (this.socket.readyState == WebSocket.OPEN) {
                this.socket.send(JSON.stringify(message));
            } else {
                console.warn("connection not open");
            }
        } else {
            console.warn("UAVConnection.connect() has not been called");
        }
    }
}
