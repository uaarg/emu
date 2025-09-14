from drone.drone import GroundStation
import time

emu_device = "udpin:localhost:14551"
gcs = GroundStation(emu_device)
sleep_time = 1

gcs.start_comms()

while True:
    gcs.send_message("hello", 5)
    time.sleep(sleep_time)
    gcs.send_image("frontend/res/sample1.jpg")
    time.sleep(sleep_time)
