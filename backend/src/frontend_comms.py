import asyncio
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed, ConnectionClosedOK
from websockets.asyncio.server import ServerConnection
import queue
import threading




# class to handle communicating with the javascript frontend
# uses websockets to send and recieve messages
class FrontEnd:
    def __init__(self, hostname: str, port: int):
        self.hostname = hostname
        self.port = port
        # set default onConnect to be a no-op
        self.onConnect = lambda: None

        self._recv_queue = queue.Queue()
        self._send_queue = queue.Queue()

    
    # create background thread and start connection
    def start_comms(self):
        thread = threading.Thread(target=self._start_event_loop, daemon=True)
        thread.start()

 
    # start asyncio connection loop
    def _start_event_loop(self):
        asyncio.run(self._connect())


    # wait for clients to connect, once they do, serve forever
    async def _connect(self):
        # serve starts the websocket server
        async with serve(self._handler, self.hostname, self.port) as server:
            await server.serve_forever()
    

    # coroutine to manage a connection, when a client connnects websockets
    # calls handler with the connection as an argument, when handler terminates
    # connection is closed --websockets docs
    async def _handler(self, websocket: ServerConnection):
        print(f"connected to {websocket.remote_address[0]}")
        
        # specified function to do on startup, likely for sending UAV status
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

    
    # what to do when socket recieves a message
    async def _consumer_handler(self, websocket: ServerConnection):
        try:
            async for message in websocket:
                # ensure putting does not block event loop
                self._recv_queue.put_nowait(message)
        except ConnectionClosed:
            print("frontend websocket connection lost")


    # what to do when we send a message
    async def _producer_handler(self, websocket: ServerConnection):
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
    
    conn  = FrontEnd("localhost", 1920)
    
    
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
            "imageName": "sample1.png"
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
        "value": "sample2.png"
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
