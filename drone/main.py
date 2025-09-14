import time
import queue
import queue
import threading

from pymavlink import mavutil

from drone.drone_services import *
from backend.src.comms.services.common import HeartbeatService, Command


class GroundStation:
    """
    containerizes communication to the ground station
    """
    def __init__(self,
                 emu_device,
                 img_resolution: tuple[int, int] = (200, 200)) -> None:
        self.image_queue = queue.Queue()
        self.commands_queue = queue.Queue()
        self.temp_filepath = "tmp/current.jpg"
        self.conn = mavutil.mavlink_connection(emu_device,
                                          source_system=1,
                                          source_component=2)
        self.is_connected = False
        self.img_resolution = img_resolution
        self.comms_thread = None

    def send_image(self, img_path: str):
        """
        add img_path to the imgs queue to be sent to the emu ground station
        """
        self.image_queue.put(img_path)
    
    def send_message(self, message: str, severity: int=5):
        """
        add message with certain to the queue to send to emu groundstation
        """
        self.commands_queue.put(Command.statustext(message, severity))

    def start_comms(self):
        """
        starts a concurrent messaging service connecting to emu ground station
        """
        self.comms_thread = threading.Thread(target=self._comms_loop)
        
    def _comms_loop(self):
        services = [
            HeartbeatService(self.commands_queue, lambda a:None),
            CommandDispatcherService(self.conn, self.commands_queue, self.image_queue)
        ]
        while True:
            for service in services:
                service.tick()

            msg = self.conn.recv_match(blocking=False)
            if msg:
                for service in services:
                    service.recv_message(msg)

            time.sleep(0.0001)  # s = 100us
