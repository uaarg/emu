import { useBackendConnection } from './comms.js';
import { useState, useCallback } from 'react';
import {
    Card,
    CardTitle,
    CardContent,
    // CardDescription,
    CardFooter,
    CardHeader,
} from './components/ui/card'

import { Switch } from "./components/ui/switch"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.jsx';
import { ScrollArea } from './components/ui/scroll-area';



function App() {
    const [uavStatus, setUavStatus] = useState({
        connection: "no",
        mode: "null",
        imageCount: 0,
        timeSinceMessage: 0
    });
    const [imageName, setImageName] = useState("");
    const [logs, setLogs] = useState([]);
    
    const messageHandler = useCallback((json) => {
        switch (json.type) {
            case "status":
                switch (json.status) {
                    case "new_msg":
                        setUavStatus(prev => ({
                            ...prev,
                            timeSinceMessage: 0
                        }));
                        break;
                   case "mode":
                        setUavStatus(prev => ({
                            ...prev,
                            mode: json.value
                        }));
                        break;
                    case "connection":
                        setUavStatus(prev => ({
                            ...prev,
                            connection: json.value
                        }));
                        break;
                    case "new_img":
                        setUavStatus(prev => ({
                            ...prev,
                            imageCount: prev.imageCount + 1
                        }));
                        setImageName(json.value);
                        break;
                };
                break;
            case "load":
                console.log("loading data");
                setUavStatus(json.uavStatus);
                setImageName(json.imageName);
                break;
            case "log":
                console.log("log");
                setLogs((prev) => [{message: json.message, severity: json.severity}, ...prev]);
                break;
        };
    }, []);

    const {sendMessage} = useBackendConnection({
        hostname: 'localhost',
        port: 14555,
        onMessage: messageHandler
    });
    

    return (
        <div className="flex w-screen h-screen">
            <div className="w-[250px] min-h-[400px] flex-shrink-0 flex-grow-0 p-4">
                <UAVStatus  status={uavStatus} sendFunc={sendMessage}/>
            </div>
            <div className="flex-grow h-full flex min-w-[400px] min-h-[400px] items-start justify-center p-4">
                <ImageLayout filename={imageName}/>
            </div>
            <div className="w-[400px] min-h-[400px] h-full flex-shrink-0 flex-grow-0 p-4">
                <LogView logs={logs}/>
            </div>
        </div>
    );
}


function UAVStatusComponent({label = "", value}) {
    return (
        <div className="flex justify-between items-center space-x-2">
            <p className="basis-1/2">{label}</p>
            <div className="basis-1/2 rounded-md border px-2 py-2 font-mono text-sm">
                {value}
            </div>
        </div>
    );
}



function UAVStatus({status, sendFunc}) {
    return (
        <>
            <Card className="w-full h-full shadow-2xl">
                <CardHeader>
                    <CardTitle>UAV</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <UAVStatusComponent label="Connected" value={status.connection} />
                    <UAVStatusComponent label="Time since last message" value={`${status.timeSinceMessage} sec`} />
                    <UAVStatusComponent label="Current mode" value={status.mode} />
                    <UAVStatusComponent label="Pictures received" value={status.imageCount} />
                </CardContent>
                <CardFooter className="flex justify-center space-x-4">
                    <Switch
                        checked={status.connection === "yes"}
                        onCheckedChange={ (checked) => {
                                console.log("tried to change connection");
                                if (typeof sendFunc === "function") {
                                    sendFunc(JSON.stringify({
                                        "type": "command",
                                        "command": checked ? "connect" : "disconnect"
                                    }))
                                }
                            }
                        }

                    />
                    <p> Connect </p>
                </CardFooter>
            </Card>
        </>
    );
}


function ImageLayout({filename}) {
    return (
        <div className="w-full h-full">
            <Card className="w-full h-full shadow-2xl flex flex-col">
                <CardHeader>
                    <CardTitle className="text-center w-full">
                        Current Image
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center box-border">
                    <img src={filename}
                        alt="no image"
                        className="object-contain max-w-full max-h-full"
                    />
                </CardContent>
            </Card>
        </div>
    );
}


function LogView({logs}) {
    return (
        <>
          <Card className="w-full h-full shadow-2xl flex flex-col">
                <CardHeader>
                    <CardTitle className="text-center w-full">
                        Logs
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow min-h-0">
                    <ScrollArea className="flex-grow min-h-0">
                    <table className="w-full table-auto">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]"> Severity </TableHead>
                            <TableHead> Message </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log, index) => {
                            let rowClass = "";
                            if (log.severity == "warning") {
                                rowClass = "bg-red-100";
                            } else if (log.severity == "error") {
                                rowClass = "bg-orange-100";
                            }

                            return (
                            <TableRow key={index} className={rowClass}>
                                <TableCell className="w-[80px]"> {log.severity} </TableCell>
                                <TableCell> {log.message} </TableCell>
                            </TableRow>
                            );
                        })}
                    </TableBody>
                </table>
                </ScrollArea>
                </CardContent>
            </Card>
        </>
    );
}


export default App
