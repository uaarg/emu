from .comms.uav import UAV
import queue

UAV_device = "udp:localhost:6969"

im_queue = queue.Queue()
msg_queue = queue.Queue()
statustext_queue = queue.Queue()

# optional gcs_device
uav = UAV(UAV_device, im_queue=im_queue, msg_queue=msg_queue, statustext_queue=statustext_queue)

uav.try_connect()

uav.disconnect()
