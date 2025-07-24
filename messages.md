# backend -> frontend
## update status
- update time since last message
```
{
    "type": "new_msg",
}
```
- set current mode to idle
```
{
    "type": "status",
    "status": "mode",
    "value": "Idle"
}
```
- drone connnected (also for disconnect)
```
{
    "type": "status",
    "status": "connection",
    "value": "yes"
}
```
- new image to show. also updates image count
```
{
    "type": "status",
    "status": "new_img",
    "value": "filename_to_load"
}
```

- send current uav status on website load (connection started)
```
{
    "type": "load",
    "uavStatus": {
        "connection": "",
        "mode": "",
        "imageCount": "",
        "timeSinceMessage": ""
        "logs": [...{"severity": "normal..", "message": "msg string"}]
    },
    "imageName": ""
}
```


## logs
- new incoming log, varying levels of severity
```
{
    "type": "log",
    "message": "log text",
    "severity": "normal"
}
```
```
{
    "type": "log",
    "message": "log text",
    "severity": "warning"
}
```
```
{
    "type": "log",
    "message": "log text",
    "severity": "error"
}
```

# frontend -> backend
## send command to UAV
- try to connect drone
```
{
    "type": "command",
    "command": "connect"
}
```
- request photo
```
{
    "type": "command",
    "command": "request_photo"
}
```
