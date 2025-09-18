import sys
import random
import time

from drone.drone import GroundStation


def disconnect():
    print("Error! Disconnected from server. Exiting", file=sys.stderr)
    sys.exit(1)


def main(device: str, timeout: int):
    gcs = GroundStation(device)

    print("connecting to ground station")
    gcs.start_comms()

    print("Mocking UAV on %s" % device)
    if timeout > 0:
        print("Mock UAV will timeout in %d seconds" % timeout)
    else:
        print("Mock UAV will run forever")

        messages = [
            'This is a random message',
            'Hello there',
            'Can you read this',
            'How about this message',
            'UAARG Rules!',
        ]
        images = [
            "frontend/res/sample1.jpg",
            "frontend/res/sample2.jpg"
        ]


        image_interval = 2 # seconds
        message_interval = 1 # seconds
        loop_delay_time = 0.001 # seconds

        image_count = 0

        gcs.send_message(f"started UAV Mocker from {device}")
        last_img_time = time.time()
        last_msg_time = time.time()
        while gcs.is_connected:
            current_time = time.time()
            if (current_time - last_img_time) > image_interval:
                print(f"sending image number {image_count}")
                gcs.send_image(images[image_count % len(images)])
                last_img_time = time.time()
                image_count += 1

            if (current_time - last_msg_time) > message_interval:
                print("sending message")
                gcs.send_message(random.choice(messages), 5)
                last_msg_time = time.time()

            time.sleep(loop_delay_time)
