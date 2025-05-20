from backend.src.comms.uav import UAV
import queue

UAV_device = "tcp:localhost:14551" # address for the UAV

im_queue = queue.Queue()
msg_queue = queue.Queue()
statustext_queue = queue.Queue()

# optional gcs_device (mission planner). if exists, set gcs_device = "gcs address"


uav = UAV(UAV_device, im_queue=im_queue, msg_queue=msg_queue, statustext_queue=statustext_queue)
uav.try_connect()

# where UI communication will happen
# UAV will be connected in a different thread

while True:
    pass

uav.disconnect()
