from dataclasses import dataclass, field
from backend.src.comms.uav import UAV
from backend.src.comms.frontend import FrontEnd
import json
import time


@dataclass
class UAVStatus():
    """
    manages state of the uav in backend.
    if frontend disconnects we can load from here
    """
    img_path: str = ""
    connected: bool = False
    mode: str = "(None)"
    time_since_msg: float = 0
    num_pics_recv: int = 0
    logs: list[str] = field(default_factory=list)

    def to_json(self) -> str:
        current_data = {
                "type": "load",
                "uavStatus": {
                    "connection": "yes" if self.connected else "no",
                    "mode": self.mode,
                    "imageCount": str(self.num_pics_recv),
                    "timeSinceMessage": str(self.time_since_msg)
                    },
                "imageName": self.img_path,
                "logs": json.dumps(self.logs)
            }
        return json.dumps(current_data)


# connect to frontend on localhost:14555
frontend = FrontEnd("127.0.0.1", 14555)
uavStatus = UAVStatus()


# called when backend connects to frontend
def onConnect():
    data = uavStatus.to_json()
    frontend.send_msg(data)

# when drone connection is changed
def connectionChangedCb(isConnected):
    uavStatus.connected = isConnected
    message = {
        "type": "status",
        "status": "connection",
        "value": f'{"yes" if isConnected else "no"}'
    }
    frontend.send_msg(json.dumps(message))

def incomingLogCb(log):
    uavStatus.logs.append(log)
    message = {
        "type": "log",
        "message": log["message"],
        "severity": log["severity"]
    }
    frontend.send_msg(json.dumps(message))

def lastMsgRecvCb():
    uavStatus.time_since_msg = 0
    message = {
        "type": "status",
        "value": "new_msg"
    }
    frontend.send_msg(json.dumps(message))

def newImageCb(filename):
    uavStatus.num_pics_recv += 1
    uavStatus.img_path = filename
    message = {
        "type": "status",
        "status": "new_img",
        "value": filename
    }
    frontend.send_msg(json.dumps(message))


frontend.onConnect = onConnect
frontend.start_comms()


UAV_device = "udpout:localhost:14551"  # address for the UAV

# we use callbacks instead of actively monitering the queues.
uav = UAV(UAV_device)
uav.addUAVConnectedChangedCb(connectionChangedCb)
uav.addUAVStatusCb(incomingLogCb)
uav.addLastMessageReceivedCb(lastMsgRecvCb)
uav.addUAVImageRecvCb(newImageCb)


# ensure we are always trying to connect.
# we do not want to run into scenario where 
# drone is able to connection but backend won't try
while True:
    try:
        uav.connect()
    except ConnectionError:
        print("error connecting, try again")

    time.sleep(1)
