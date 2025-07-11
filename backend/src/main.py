from backend.src.comms.uav import UAV
from backend.src.frontend_comms import FrontEnd
import queue

UAV_device = "udpout:localhost:14551"  # address for the UAV

im_queue = queue.Queue()
msg_queue = queue.Queue()
statustext_queue = queue.Queue()

# optional gcs_device (mission planner). if exists, set gcs_device = "gcs address"


uav = UAV(UAV_device, im_queue=im_queue, msg_queue=msg_queue, statustext_queue=statustext_queue)
uav.try_connect()

# connect to frontend on localhost:14555
frontend = FrontEnd("127.0.0.1", 14555)
frontend.start_comms()


# where UI communication will happen
# UAV will be connected in a different thread

while True:
    pass

uav.disconnect()
