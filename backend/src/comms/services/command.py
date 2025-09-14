from pymavlink import mavutil
from pymavlink.dialects.v20 import all as mavlink2


class Command:
    """
    Preferred application command interface. Use this to construct commands
    which are to be send over MavLink.

    This interface exists due to the redundant and difficult nature of the
    mavlink api bindings. They are difficult to use as they are often generated
    at runtime. This means that most development tools are unable to
    autocomplete these commands. Furthermore, many commands are missing
    defaults which make their construction painful. Finally, we often abuse
    some commands by adding semantics onto them beyond their original use.

    This command class solves all those issues by offering an improved
    interface for constructing MavLink commands.
    """

    def __init__(self, message: mavlink2.MAVLink_message):
        self.message = message

    @staticmethod
    def heartbeat() -> 'Command':
        msg = mavlink2.MAVLink_heartbeat_message(
            type=mavlink2.MAV_TYPE_GCS,
            autopilot=mavlink2.MAV_AUTOPILOT_INVALID,
            base_mode=0,
            custom_mode=0,
            system_status=0,
            mavlink_version=2)
        return Command(msg)

    @staticmethod
    def ack(message: mavlink2.MAVLink_message,
            result=mavlink2.MAV_RESULT_ACCEPTED) -> 'Command':
        msg = mavlink2.MAVLink_command_ack_message(command=message.get_msgId(),
                                                   result=result,
                                                   target_system=1,
                                                   target_component=2)
        return Command(msg)

    @staticmethod
    def statustext(message: str, severity: int) -> 'Command':
        msg = mavlink2.MAVLink_statustext_message(
            severity=mavlink2.MAV_SEVERITY_INFO, text=message.encode())
        return Command(msg)

    @staticmethod
    def enableCamera() -> 'Command':
        msg = mavlink2.MAVLink_command_long_message(
            1,  # Target System
            2,  # Target Component
            mavutil.mavlink.MAV_CMD_IMAGE_START_CAPTURE,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0)
        return Command(msg)

    @staticmethod
    def disableCamera() -> 'Command':
        msg = mavlink2.MAVLink_command_long_message(
            1,  # Target System
            2,  # Target Component
            mavutil.mavlink.MAV_CMD_IMAGE_STOP_CAPTURE,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0)
        return Command(msg)

    def setMode(mode) -> 'Command':
        msg = mavlink2.MAVLink_command_long_message(
            1,  # Target System
            2,  # Target Component
            255,  # CUSTOM UAARG COMMAND
            0,  # No Confirmation
            1,  # SET MODE
            mode + 1,
            0,
            0,
            0,
            0,
            0)
        return Command(msg)

    def switchLights(is_on) -> 'Command':
        msg = mavlink2.MAVLink_command_long_message(
            1,  # Target System
            2,  # Target Component
            255,  # CUSTOM UAARG COMMAND
            0,  # No Confirmation
            2,  # SET LIGHTS
            is_on,
            0,
            0,
            0,
            0,
            0)
        return Command(msg)

    @staticmethod
    def sendImage() -> 'Command':
        msg = mavlink2.MAVLink_command_long_message(
            1,  # Target System
            2,  # Target Component
            255,  # CUSTOM UAARG COMMAND
            0,  # No Confirmation
            3,  # SEND IMAGE
            0,
            0,
            0,
            0,
            0,
            0)
        return Command(msg)

    def encode(self, conn: mavutil.mavfile) -> bytes:
        return self.message.pack(conn.mav)
