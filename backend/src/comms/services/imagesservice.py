# note: the import from

from typing import Callable
from pymavlink.dialects.v20 import common as mavlink2
import queue
from pymavlink import mavutil

import os

from backend.src.comms.services.command import Command
from .common import MavlinkService
from backend.src.image import Image


class ImageService(MavlinkService):
    """
    Image Transfer Protocol
    =======================

    We are using a bare-bones variation of the Image
    Transmission Protocol [0].

    The setup right now is as follows:

    1) The drone will send ENCAPSULATED_DATA messages
       containing portions of a JPEG formatted image.
    2) The ground control pigeon (GCS -- that's us!) will
       concatenate these partial images into a list of chunks
    3) The drone will send a DATA_TRANSMISSION_HANDSHAKE
       message to note that the image has been fully sent.
    4) On the DATA_TRANSMISSION_HANDSHAKE, the GCS will build
       an image from the buffer and then clear the buffer for
       the next image.

    [0]: https://mavlink.io/en/services/image_transmission.html
    """
    image_packets: dict
    i: int
    commands: queue.Queue
    im_queue: queue.Queue

    recving_img: bool
    expected_packets: int | None

    def __init__(self, commands: queue.Queue, im_queue: queue.Queue, img_recv: Callable):
        self.i = 0
        self.image_packets = dict()
        self.commands = commands
        self.im_queue = im_queue
        self.img_recv = img_recv

        self.recving_img = False
        self.expected_packets = False
        self.image_bytes = 0

        base_dir = "frontend/tmp/"
        os.makedirs(base_dir, exist_ok=True)
        num_dirs = len(os.listdir(base_dir))
        self.base_img_dir = f"frontend/tmp/{num_dirs}"
        os.makedirs(self.base_img_dir)

    def begin_recv_image(self):
        self.image_packets.clear()
        self.recving_img = True
        #print("Receiving new image")

    def configure_image_params(
            self,
            message: mavlink2.MAVLink_data_transmission_handshake_message):
        self.image_bytes = message.size
        self.expected_packets = message.packets
        #print(f"Expecting {message.packets} packets")

    def recv_image_packet(self,
                          message: mavlink2.MAVLink_encapsulated_data_message):
        #print(f'Got packet no {message.seqnr}')
        self.image_packets[message.seqnr] = message

    def done_recv_image(self, message):
        self.commands.put(Command.ack(message))

        packet_nos = self.image_packets.keys()
        packet_count = max(packet_nos) if len(packet_nos) > 0 else 0
        if packet_count != self.expected_packets:
            print(
                "WARNING: Did not receive all packets requesting missing packets"
            )
            self.request_missing_packets()
        else:
            img_file = self.assemble_image()
            if img_file is not None:
                self.im_queue.put(img_file)
            self.image_received()

    def request_missing_packets(self):
        recvd_packets = set(self.image_packets.keys())
        expected_packets = set(range(self.expected_packets + 1))
        missing = expected_packets - recvd_packets
        #print(f"Missing Packets: {missing}")
        for missing_no in missing:
            req_packet = mavlink2.MAVLink_command_long_message(
                1,  # Target System
                2,  # Target Component
                mavutil.mavlink.
                MAV_CMD_REQUEST_IMAGE_CAPTURE,  # CUSTOM UAARG COMMAND
                0,  # No Confirmation
                missing_no,  # missing packet
                0,
                0,
                0,
                0,
                0,
                0)
            self.commands.put(Command(req_packet))

    def assemble_image(self) -> str | None:
        # image transmission is complete, collect chunks into an image
        image = bytes()
        packet_nos = self.image_packets.keys()
        packet_count = max(packet_nos) if len(packet_nos) > 0 else 0
        for i in range(packet_count):
            packet = self.image_packets.get(i + 1)
            if packet is None:
                return
            image += bytes(packet.data)

        image = image[:self.image_bytes]
        file = f"{self.base_img_dir}/{self.i}.jpg"
        with open(file, "bw") as image_file:
            image_file.write(image)
            image_file.flush()
        # this is a bit hacky but we need the images in the frontend directory to show them
        file = "/".join(file.split("/")[1:])
        self.img_recv(file)

    def image_received(self):
        self.recving_img = False
        self.expected_packets = None
        self.image_packets.clear()

    def recv_message(self, message):
        # print(message.get_type())
        match message.get_type():
            case "CAMERA_IMAGE_CAPTURED":
                self.image_packets.clear()
                self.begin_recv_image()
                self.expected_packets = None
                self.commands.put(Command.ack(message))

            case "DATA_TRANSMISSION_HANDSHAKE":
                if self.expected_packets is None:
                    self.configure_image_params(message)
                    self.commands.put(Command.ack(message))
                else:
                    self.done_recv_image(message)

            case 'ENCAPSULATED_DATA':
                if self.recving_img:
                    self.recv_image_packet(message)
                else:
                    print("WARNING: Received unexpected ENCAPSULATED_DATA")
