from typing import Callable

from pymavlink import mavutil
from pymavlink.dialects.v20 import all as mavlink2
import time
import queue
from PIL import Image
from math import ceil

from backend.src.comms.services.command import Command
from backend.src.comms.services.common import MavlinkService
import os


class StatusResonderService(MavlinkService):
    def __init__(self):
        pass

    def recv_match(self):
        pass

    def tick(self):
        pass

class CommandDispatcherService(MavlinkService):
    def __init__(self, gcs_conn, commands: queue.Queue, images: queue.Queue):
        self.conn = gcs_conn
        self.commands_queue = commands
        self.images_queue = images
        self.tmp_filepath = "tmp/testtest.jpg"
        os.makedirs("tmp", exist_ok=True)

    def tick(self):
        if not self.commands_queue.empty():
            command = self.commands_queue.get(block=False)
            self.conn.write(command.encode(self.conn))
        elif not self.images_queue.empty():
            self._send_image()


    def _send_image(self) -> None:
            """
            sends the next iamge in queue to emu groundstation
            """
            image_path = self.images_queue.get(block=False)

            # Compress image
            im = Image.open(image_path)
            im = im.resize((200, 150), Image.Resampling.LANCZOS)
            im.save(self.tmp_filepath, quality=75)

            # Open image as bytearray
            with open(self.tmp_filepath, "rb") as f:
                image_data = bytearray(f.read())

            message = mavlink2.MAVLink_camera_image_captured_message(
                time_boot_ms=int(time.time()),
                time_utc=0,
                camera_id=0,
                lat=0,
                lon=0,
                alt=0,
                relative_alt=0,
                q=(1, 0, 0, 0),
                image_index=-1,
                capture_result=1,
                file_url="".encode())
            self.conn.write(message.pack(self.conn.mav))

            ENCAPSULATED_DATA_LEN = 253

            handshake_msg = mavlink2.MAVLink_data_transmission_handshake_message(
                0,
                len(image_data),
                0,
                0,
                ceil(len(image_data) / ENCAPSULATED_DATA_LEN),
                ENCAPSULATED_DATA_LEN,
                0,
            )
            self.conn.write(handshake_msg.pack(self.conn.mav))

            data = []
            for start in range(0, len(image_data), ENCAPSULATED_DATA_LEN):
                data_seg = image_data[start:start + ENCAPSULATED_DATA_LEN]
                data.append(data_seg)

            for msg_index, data_seg in enumerate(data):
                if len(data_seg) < ENCAPSULATED_DATA_LEN:
                    data_seg.extend(bytearray(ENCAPSULATED_DATA_LEN - len(data_seg)))
                encapsulated_data_msg = mavlink2.MAVLink_encapsulated_data_message(
                    msg_index + 1, data_seg)
                self.conn.write(encapsulated_data_msg.pack(self.conn.mav))

            handshake_msg = mavlink2.MAVLink_data_transmission_handshake_message(
                0,
                len(image_data),
                0,
                0,
                ceil(len(image_data) / ENCAPSULATED_DATA_LEN),
                ENCAPSULATED_DATA_LEN,
                0,
            )
            self.conn.write(handshake_msg.pack(self.conn.mav))

