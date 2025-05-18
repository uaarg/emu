from .comms.uav import UAV
import queue

UAV_device = "udp:localhost:6969"

im_queue = queue.Queue()
msg_queue = queue.Queue()
statustext_queue = queue.Queue()

uav = UAV(UAV_device, im_queue=im_queue, msg_queue=msg_queue, statustext_queue=statustext_queue)
services = [
    HeartbeatService(self.commands, self.disconnect),
    ImageService(self.commands, self.im_queue),
    StatusEchoService(self._recvStatus),
    MessageCollectorService(self.msg_queue),
    DebugService(),
    ForwardingService(self.commands),
    ]

uav.try_connect()

uav.disconnect()
