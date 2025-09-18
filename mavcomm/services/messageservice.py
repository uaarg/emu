from dataclasses import dataclass
import queue
import datetime

from mavcomm.services.common import MavlinkService


@dataclass
class MavlinkMessage:
    type: str
    time: datetime.datetime


class MessageCollectorService(MavlinkService):
    """
    Repeats all messages received into a message queue.
    """
    message_queue: queue.Queue

    def __init__(self, message_queue: queue.Queue):
        self.message_queue = message_queue

    def recv_message(self, message):
        message_details = MavlinkMessage(type=message.get_type(),
                                         time=datetime.datetime.now())
        self.message_queue.put(message_details)
