/*
 * react hook to handle the websocket connection
 * needs to handle incoming and send to correct thing
 * needs to be able to send json to server
 * uses WebSocket
 */


import {useEffect, useRef} from 'react';


export function useBackendConnection({hostname, port, onMessage}) {
    const socketRef = useRef(null);
    useEffect(() => {
        const socket = new WebSocket(`ws://${hostname}:${port}`);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log("websocket to backend opened");
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                onMessage?.(message);
            } catch (error) {
                if (error instanceof SyntaxError) {
                    console.error("invalid json:", event.data);
                } else {
                    console.error("incoming message error:", error.message);
                }
            }
        };

        socket.onclose = () => {
            console.log("websocket to backend closed");
        };
        return () => {
            socket.close();
        };
    }, [hostname, port, onMessage]); // dependencies; if these change re-render
    
    // takes JSON and turns it into a string and sends to socket
    const send = (message) => {
        if (socketRef.current !== null) {
            if (socketRef.current.readyState == WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(message));
            } else {
                console.warn("connection not open");
            }
        } else {
            console.warn("socketRef is null");
        }
    };

    return send;

}
