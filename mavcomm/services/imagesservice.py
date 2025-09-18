# note: the import from

from typing import Callable
from pymavlink.dialects.v20 import common as mavlink2
import queue
from pymavlink import mavutil

import os
import time
from PIL import Image

from mavcomm.command import Command
from .common import MavlinkService


class GCSImageService(MavlinkService):
    """
    Image Transfer Protocol
    =======================
    For use on the ground control station
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
        print("received an image")

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



class UAVImageService(MavlinkService):
    commands: queue.Queue
    images: queue.Queue
    tmp_filepath: str
    sending: bool
    segmented_image_Data: bytearray | None
    encapsulated_data_len: int
    len_image_data: int

    def __init__(self, commands: queue.Queue, images: queue.Queue):
        self.commands = commands
        self.images = images
        os.makedirs("tmp", exist_ok=True)
        self.tmp_filepath = "tmp/current.jpg"
        self.sending = False
        self.segmented_image_Data = None
        self.encapsulated_data_len = 253
        self.len_image_data = -1
    
    def recv_message(self, message):
         pass

    def tick(self):
        if not (self.sending or self.images.empty()):
            # self.sending = True
            image_path = self.images.get(block=False)
            self._initialize_data(image_path)
            self._start_sending()
        elif self.sending:
            pass
   
    def _initialize_data(self, image_path: str):
        # compress image
        im = Image.open(image_path)
        im = im.resize((200, 150), Image.Resampling.LANCZOS)
        im.save(self.tmp_filepath, quality=75)
        
        # open image as bytearray
        with open(self.tmp_filepath, "rb") as f:
            image_data = bytearray(f.read())
        self.len_image_data = len(image_data)
        self.data = []
        for start in range(0, len(image_data), self.encapsulated_data_len):
            data_seg = image_data[start:start + self.encapsulated_data_len]
            self.data.append(data_seg)
        
    def _start_sending(self):
        self.commands.put(Command.ImageCapturedMessage(time.time()))
        self.commands.put(Command.handshakeMessage(self.len_image_data, self.encapsulated_data_len))
        for msg_index, data_seg in enumerate(self.data):
            if len(data_seg) < self.encapsulated_data_len:
                data_seg.extend(bytearray(self.encapsulated_data_len - len(data_seg)))
            self.commands.put(Command.encapsulatedDataMessage(msg_index + 1, data_seg))
        self.commands.put(Command.handshakeMessage(self.len_image_data, self.encapsulated_data_len))
