/*
 * react hook to handle the websocket connection
 * handles incoming and receiving json pertaining
 * to user's actions and uav updates
 */


import {useEffect, useRef, useCallback} from 'react';


export function useUAVConnection({url, onMessage}) {
    // useRef allows us to remember information across renders without causing a re-render
    // we could use global variables.. i've heard that's good practice
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connect = useCallback(() => {
        if (!url) return; // so we don't try to load right at startup
        const socket = new WebSocket(url);
        socketRef.current = socket;
        
        socket.onopen = () => {
            if (reconnectTimeoutRef.current !== null) {
                clearTimeout(reconnectTimeoutRef.current);
            }
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

        socket.onerror = (event) => {
            console.warn("websocket error", event);
        }

        socket.onclose = () => {
            console.log("websocket to backend closed");
            socketRef.current = null;
        };
    }, [url, onMessage]);

    // need useRef because without it this will be run on every render
    useEffect(() => {
        connect()

        return () => {
            if (socketRef.current !== null) {
                socketRef.current.close();
                socketRef.current = null;
            }
            if (reconnectTimeoutRef.current !== null) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, [connect]); // dependencies; if these change re-render
    
    // takes JSON and turns it into a string and sends to socket
    const send = useCallback((message) => {
        if (socketRef.current !== null) {
            if (socketRef.current.readyState == WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify(message));
            } else {
                console.warn("connection not open");
            }
        } else {
            console.warn("socketRef is null");
        }
    }, []);

    return send;
}
