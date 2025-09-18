import queue
import sys
from pymavlink import mavutil

from mavcomm.services.common import HeartbeatService
from mavcomm.command import Command


def disconnect():
    print("Error! Disconnected from server. Exiting", file=sys.stderr)
    sys.exit(1)


def main(device: str, timeout: int):
    print("Mocking GCS on %s" % device)
    if timeout > 0:
        print("Mock GCS will timeout in %d seconds" % timeout)
    else:
        print("Mock GCS will run forever")

    conn = mavutil.mavlink_connection(device,
                                      source_system=255,
                                      source_component=255)
    connected = True

    commands = queue.Queue()
    services = [HeartbeatService(commands, disconnect, timeout)]

    while connected:
        for service in services:
            service.tick()

        msg = conn.recv_match(blocking=False)
        if msg:
            for service in services:
                service.recv_message(msg)
            print(msg)

        try:
            command = commands.get(block=False)
            conn.write(command.encode(conn))
        except queue.Empty:
            pass
