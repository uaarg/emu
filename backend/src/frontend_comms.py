import asyncio
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed, ConnectionClosedOK
from websockets.asyncio.server import ServerConnection
import queue
import threading



class FrontEnd:
    """
    class to handle communicating with the javascript frontend
    uses websockets to send and recieve messages
    """
    def __init__(self, hostname: str, port: int):
        self.hostname = hostname
        self.port = port

        self.isConnected = False
        # set default onConnect to be a no-op
        self.onConnect = lambda: None

        self._recv_queue = queue.Queue()
        self._send_queue = queue.Queue()

    
    def start_comms(self):
        """
        creates a background thread starting communication to frontend
        """
        thread = threading.Thread(target=self._start_event_loop, daemon=True)
        thread.start()

 
    # start asyncio connection loop
    def _start_event_loop(self):
        """
        starts connection loop with asyncio
        """
        asyncio.run(self._connect())


    async def _connect(self):
        """
        starts the server and waits for clients to connect. Once they do,
        self._handler handles each client
        """
        async with serve(self._handler, self.hostname, self.port) as server:
            await server.serve_forever()
    

    async def _handler(self, websocket: ServerConnection):
        """
        manages a single client connection. websocket represents the specific client connection.
        When a client disconnects the handler stops. This does not stop the server
        """
        if self.isConnected:
            print("Connection refused: already connected")
            return
        self.isConnected = True
        print("Connected to client")
        
        # specified function to do on startup, likely for sending UAV status in bulk
        self.onConnect()

        # exit and close websocket as soon as either task terminates
        consumer_task = asyncio.create_task(self._consumer_handler(websocket))
        producer_task = asyncio.create_task(self._producer_handler(websocket))
        # create two infinite loops. one sends messages in send_queue, other recieves
        # messages and puts into recv_queue
        done, pending = await asyncio.wait(
            [consumer_task, producer_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
        print("Client disconnected")
        self.isConnected = False

    
    async def _consumer_handler(self, websocket: ServerConnection):
        """
        handles when socket receives a message from the client
        """
        try:
            async for message in websocket:
                # ensure putting does not block event loop
                self._recv_queue.put_nowait(message)
        except ConnectionClosed:
            print("frontend websocket connection lost")


    async def _producer_handler(self, websocket: ServerConnection):
        """
        handles sending messages to the client
        """
        while True:
            try:
                # ensure getting does not block event loop
                message = self._send_queue.get_nowait()
                await websocket.send(message)
            except ConnectionClosedOK:
                break # will shutdown the program
            except queue.Empty:
                # if queue is empty will raise error, catch it and wait
                await asyncio.sleep(0.1)


    def send_msg(self, message: str):
        self._send_queue.put(message)
    

    def get_msg(self) -> str:
        if not self._recv_queue.empty():
            return self._recv_queue.get()
        else:
            return ""


if __name__ == "__main__":
    # do a simple test for communication between frontend and backend
    import time
    import json
    
    conn  = FrontEnd("localhost", 14555)
    
    
    # verify we can load everything
    def onConnect():
        loadCurrent = {
            "type": "load",
            "uavStatus": {
                "connection": "no",
                "mode": "test",
                "imageCount": "2",
                "timeSinceMessage": "3"
                },
            "imageName": "res/sample1.jpg"
        }
        conn.send_msg(json.dumps(loadCurrent))

    conn.onConnect = onConnect
    conn.start_comms()
    # wait 5 seconds to give time for browser to start
    time.sleep(5)

    # test different logs
    for i in range(3):
        if i % 3 == 0: severity = "normal"
        elif i % 3 == 1: severity = "warning"
        else: severity = "error"
        log_msg = {
            "type": "log",
            "message": f"log text {i}",
            "severity": f"{severity}"
        }
        conn.send_msg(json.dumps(log_msg))

        time.sleep(1)

    # send new photo
    new_photo = {
        "type": "status",
        "status": "new_img",
        "value": "res/sample2.jpg"
    }
    conn.send_msg(json.dumps(new_photo))
    time.sleep(1)

    # message received
    new_msg = {
        "type": "status",
        "status": "new_msg",
    }
    conn.send_msg(json.dumps(new_msg))
    time.sleep(1)

    # change mode
    new_mode = {
        "type": "status",
        "status": "mode",
        "value": "attack"
    }
    conn.send_msg(json.dumps(new_mode))
    time.sleep(1)

    # drone is connected
    connection_successful = {
        "type": "status",
        "status": "connection",
        "value": "yes"
    }
    conn.send_msg(json.dumps(connection_successful))
    time.sleep(1)

    connection_unsuccessful = {
        "type": "status",
        "status": "connection",
        "value": "no"
    }
    conn.send_msg(json.dumps(connection_unsuccessful))
    time.sleep(1)
