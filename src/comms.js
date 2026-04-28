export const pendingByRequestId = new Map();

function generateRequestId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export class UAVConnection {
    constructor() {
        this.isConnected = false;
        this.socket = null;
        this.url = null;
        this.recvMessageCB = () => {}; // default callback to empty function
        this.onWSOpen = () => {};
        this.onWSClose = () => {};
    }

    setRecvMessageCB(newMsgCB) {
        this.recvMessageCB = newMsgCB;
    }

    connect(url) {
        if (this.socket !== null) {
            console.warn("Connection attempt with already existing websocket. Aborting.");
            return;
        }
        this.url = url;
        if (this.url === null) {
            console.warn("Cannot create connection: no URL specified. Ensure UAVConnection.url is set.")
            return;
        }
        let modifiedUrl = this.url;
        if (!this.url.endsWith("/ws")) {
            modifiedUrl = this.url + "/ws";
        }
        else {
            this.url = this.url.slice(0, -3);
        }
        this.socket = new WebSocket(modifiedUrl);
        this.socket.onopen = this.onOpen.bind(this);
        this.socket.onclose = this.onClose.bind(this);
        this.socket.onmessage = this.onMessage.bind(this);
        this.socket.onerror = this.onError.bind(this);
    }

    disconnect() {
        if (this.socket !== null) {
            this.socket.close();
        }
        else {
            console.warn("Disconnection attempt while socket is null.");
        }
    }    

    onOpen() {
        this.isConnected = true;
        this.onWSOpen();
        console.log("websocket to backend opened");
    }

    onClose() {
        this.isConnected = false;
        this.socket = null;
        this.onWSClose();
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
                return new Promise((resolve, reject) => {
                    const requestId = generateRequestId();
                    message.requestId = requestId;
                    pendingByRequestId.set(requestId, { resolve, reject });
                    this.socket.send(JSON.stringify(message));
                });
            } else {
                console.warn("connection not open");
            }
        } else {
            console.warn("UAVConnection.connect() has not been called");
        }
    }
}
