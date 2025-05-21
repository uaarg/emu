import datetime
from typing import List, Callable, Any
import asyncio

from websockets.asyncio.server import serve


class Message:
    type: str
    time: datetime.datetime


class Connection:
    subscribers: List[Callable] = []

    def start(self) -> Any:
        raise NotImplementedError()

    def subscribe(self, subscriber: Callable) -> None:
        self.subscribers.append(subscriber)

    def send(self, msg: Message) -> None:
        raise NotImplementedError()

    def close(self) -> None:
        raise NotImplementedError()

    def __str__(self) -> str:
        raise NotImplementedError()


class WebhookConnection(Connection):

    def __init__(self, port=8001) -> None:
        self.port = port

    async def handler(self, websocket):
        try:
            async for message in websocket:
                for subscriber in self.subscribers:
                    subscriber(message)
        except Exception:
            print("connection closed")

    async def start(self):
        async with serve(self.handler, "", self.port):
            await asyncio.get_running_loop().create_future()  # run forever
