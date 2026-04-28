import { pendingByRequestId, useUAVConnection } from './comms.js';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
    Card,
    CardTitle,
    CardContent,
    CardHeader,
} from './components/ui/card'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.jsx';
import { ScrollArea } from './components/ui/scroll-area';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import Sliders from './Sliders.jsx';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs.jsx';
import Canvas from './components/Canvas.jsx';
import { AddTargetDialog } from './components/Dialog.jsx';
import { saveTarget } from './targets.js';
import { DistanceTable } from './components/DistancesTable.jsx';
import TargetViewer from './components/TargetViewer.jsx';

function App() {
    const [uavStatus, setUavStatus] = useState({
        connection: "no",
        mode: "null",
        imageCount: 0,
        timeSinceMessage: 0
    });
    const [imageName, setImageName] = useState("");
    const [logs, setLogs] = useState([]);
    const [url, setUrl] = useState(null);

    const onConnect = () => {
        setUavStatus(prev => ({
            ...prev,
            connection: "yes",
            mode: "null"
        }))
    }

    const onDisconnect = () => {
        setUavStatus(prev => ({
            ...prev,
            connection: "no",
            mode: "null"
        }))
    }

    const messageHandler = useCallback((json) => {
        setUavStatus(prev => ({
            ...prev,
            timeSinceMessage: Number(0)
        }));

        if ("requestId" in json) {
            const pending = pendingByRequestId.get(json.requestId);
            if (!pending) return;
            pendingByRequestId.delete(json.requestId);

            switch (json.type) {
                case "point":
                    pending.resolve(json.message);
                    setLogs((prev) => [...prev, { message: `point: ${json.message}`, severity: "normal" }]);
                    break;
            };
            return;
        }

        switch (json.type) {
            case "status":
                switch (json.status) {
                    case "mode":
                        setUavStatus(prev => ({
                            ...prev,
                            mode: json.value
                        }));
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
                setLogs((prev) => [...prev, { message: json.message, severity: json.severity }]);
                break;
            case "img":
                setUavStatus(prev => ({
                    ...prev,
                    imageCount: Number(prev.imageCount) + 1
                }));
                setImageName(url + json.value);
                break;
        };
    }, [url]);

    const sendMessage = useUAVConnection({ url: url, onMessage: messageHandler, onConnect: onConnect });
    const handleConnect = (inputUrl) => {
        // if url changes, reset connection status
        onDisconnect()

        setUrl(inputUrl);
    }

    // make our time since last message actually go up
    useEffect(() => {
        const interval = setInterval(() => {
            setUavStatus(prev => ({
                ...prev,
                timeSinceMessage: Number(prev.timeSinceMessage) + 1
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <ConnectComponent onConnect={handleConnect} />
            <div className="flex w-screen h-screen">
                <div className="w-[250px] min-h-[400px] flex-shrink-0 flex-grow-0 p-4">
                    <UAVStatus status={uavStatus} sendFunc={sendMessage} />
                </div>
                <div className="flex-grow h-full flex min-w-[400px] min-h-[400px] items-start justify-center p-4">
                    <ImageLayout status={uavStatus} filename={imageName} sendFunc={sendMessage} />
                </div>
                <div className="w-[400px] min-h-[400px] h-full flex-shrink-0 flex-grow-0 p-4">
                    <LogView logs={logs} />
                </div>
            </div>

        </div>
    );
}

function ConnectComponent({ onConnect }) {
    const [url, setUrl] = useState("");
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!url) return;
        onConnect(url);
    };
    return (
        <form className="flex items-center gap-2 m-2" onSubmit={handleSubmit}>
            <label> Drone URL </label>
            <Input className="max-w-sm" type="text" onChange={(e) => setUrl(e.target.value)} defaultValue="http://100.91.180.106" />
            <Button type="submit" variant="outline"> Connect </Button>
        </form>
    );
}

function UAVStatusComponent({ label = "", value }) {
    return (
        <div className="flex justify-between items-center space-x-2">
            <label className="basis-1/2">{label}</label>
            <div className="basis-1/2 rounded-md border px-2 py-2 font-mono text-sm">
                {value}
            </div>
        </div>
    );
}

function UAVStatus({ status }) {
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
            </Card>
        </>
    );
}

function ImageLayout({ status, filename, sendFunc }) {
    const dialogPendingRef = useRef(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const imageUriToId = (uri) => {
        const filename = uri.split("/").pop();
        return filename.replace(/\.[^/.]+$/, "");
    }

    const handleCaptureImage = () => {
        // if no connection, just return
        if (status.connection == "no") {
            alert("No connection with the drone");
            return;
        }

        //request image from UAV
        sendFunc({
            type: "image",
            message: "capture"
        });
    }

    const handlePointsClicked = async (point) => {
        const targetInfoPromise = new Promise((resolve, reject) => {
            dialogPendingRef.current = { resolve, reject };
        });

        setDialogOpen(true);
        const targetInfo = await targetInfoPromise;
        setDialogOpen(false);

        sendFunc({
            type: "getPoint",
            message: {
                pixel: point
            }
        }).then(distPoint => {
            saveTarget(targetInfo.name, imageUriToId(filename), distPoint);
        });
    }

    const [tabPick, setTabPick] = useState("image");

    return (
        <div className="relative w-full h-full">
            <Card className="w-full h-full shadow-2xl flex flex-col">
                <CardHeader>
                    <CardTitle className="text-center w-full">
                        Current Image
                    </CardTitle>
                </CardHeader>
                <Button className="absolute right-7 top-5 shadow-lg" onClick={handleCaptureImage} variant="outline">Capture Image</Button>
                <Tabs defaultValue="image" onValueChange={tabName => setTabPick(tabName)} className="absolute left-3 top-5 font-bold">
                    <TabsList>
                        <TabsTrigger value="image">Image</TabsTrigger>
                        <TabsTrigger value="targetMgmt">Target Management</TabsTrigger>
                        <TabsTrigger value="viewer">3D Viewer</TabsTrigger>
                    </TabsList>
                </Tabs>
                {tabPick === "image" && (
                    <CardContent className="flex-grow flex items-center justify-center box-border">
                        {dialogOpen && <AddTargetDialog dialogClose={() => setDialogOpen(false)} setFormData={data => {
                            dialogPendingRef.current?.resolve(data)
                            dialogPendingRef.current = null;
                        }}></AddTargetDialog>}
                        <Canvas imgSrc={`${filename}`} onPointsClicked={handlePointsClicked} className="object-contain max-w-full max-h-full">
                        </Canvas>
                    </CardContent>
                )}
                {tabPick === "targetMgmt" && (
                    <CardContent>
                        <TargetManager></TargetManager>
                    </CardContent>
                )}
                {tabPick === "viewer" && (
                    <CardContent className="h-full w-full">
                        <TargetViewer />
                    </CardContent>
                )}
                <Sliders sendFunc={sendFunc} />
            </Card>
        </div >
    );
}

function TargetManager() {
    return (
        <DistanceTable></DistanceTable>
    )
}

function LogView({ logs }) {
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
