from backend.src.comms.uav import UAV
from backend.src.frontend_comms import FrontEnd
import queue
import json

UAV_device = "udpout:localhost:14551"  # address for the UAV

im_queue = queue.Queue()
msg_queue = queue.Queue()
statustext_queue = queue.Queue()

# optional gcs_device (mission planner). if exists, set gcs_device = "gcs address"


uav = UAV(UAV_device, im_queue=im_queue, msg_queue=msg_queue, statustext_queue=statustext_queue)
uav.try_connect()

# connect to frontend on localhost:14555
frontend = FrontEnd("127.0.0.1", 14555)

def onConnect():
    loadCurrent = {
        "type": "load",
        "uavStatus": {
            "connection": "no",
            "mode": "test",
            "imageCount": "2",
            "timeSinceMessage": "3"
            },
        "imageName": "res/sample1.jpg"
    }
    frontend.send_msg(json.dumps(loadCurrent))

frontend.onConnect = onConnect
frontend.start_comms()



# middle ground between drone and frontend
# facilite communication between the two
while True:
    # get message from frontend
    message = frontend.get_msg()
    if (message != ""):
        pass


    # get messages from drone
    pass

uav.disconnect()
