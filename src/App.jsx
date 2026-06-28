import { UAVConnection, pendingByRequestId } from './comms.js';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
    Card,
    CardTitle,
    CardContent,
    CardHeader,
} from './components/ui/card'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table.jsx';
import { ScrollArea } from './components/ui/scroll-area';
import { Button } from './components/ui/button';
import Sliders from './Sliders.jsx';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs.jsx';
import Canvas from './components/Canvas.jsx';
import { Spinner } from './components/ui/spinner.jsx';
import { AddTargetDialog, NameImageDialog } from './components/Dialog.jsx';
import { saveTarget } from './targets.js';
import { DistanceTable } from './components/DistancesTable.jsx';
import TargetViewer from './components/TargetViewer.jsx';
import SlamViewer from './components/SlamViewer.jsx';
import { Navbar } from './components/Navbar.jsx';

function App() {
    const [uavStatus, setUavStatus] = useState({
        connection: "no",
        mode: "null",
        imageCount: 0,
        timeSinceMessage: 0
    });
    const [imageName, setImageName] = useState("");
    const [imageHistory, setImageHistory] = useState([]);
    const [namingImage, setNamingImage] = useState(null);
    const [slamPoints, setSlamPoints] = useState([]);
    const [slamPose, setSlamPose] = useState(null);
    const MAX_SLAM_POINTS = 50000;
    const [logs, setLogs] = useState([]);
    const wsConnRef = useRef(new UAVConnection());
    const [isConnected, setIsConnected] = useState(false);
    const [autoReconnect, setAutoReconnect] = useState(false);
    const [ledOn, setLedOn] = useState(false);
    const autoReconnectRef = useRef(false);
    const lastUrlRef = useRef(null);
    const manualDisconnectRef = useRef(false);

    const handleConnect = (url) => {
        lastUrlRef.current = url;
        manualDisconnectRef.current = false;
        wsConnRef.current.connect(url);
    };

    const handleDisconnect = () => {
        manualDisconnectRef.current = true;
        wsConnRef.current.disconnect();
    };

    const handleAutoReconnectChange = (value) => {
        setAutoReconnect(value);
        autoReconnectRef.current = value;
    };

    const handleLedChange = (value) => {
        setLedOn(value);
        if (isConnected) {
            wsConnRef.current.sendMessage({ type: "led", state: value });
        }
    };

    wsConnRef.current.onWSOpen = () => {
        setUavStatus(prev => ({
            ...prev,
            connection: "yes",
            mode: "null"
        }));
        setIsConnected(true);
    };
    wsConnRef.current.onWSClose = () => {
        setUavStatus(prev => ({
            ...prev,
            connection: "no",
            mode: "null"
        }));
        setIsConnected(false);

        if (autoReconnectRef.current && !manualDisconnectRef.current && lastUrlRef.current) {
            setTimeout(() => {
                if (autoReconnectRef.current && lastUrlRef.current) {
                    wsConnRef.current.connect(lastUrlRef.current);
                }
            }, 3000);
        }
        manualDisconnectRef.current = false;
    };

    const messageHandler = useCallback((json) => {
        setUavStatus(prev => ({
            ...prev,
            timeSinceMessage: Number(0)
        }));
        const pending = ("requestId" in json) ? pendingByRequestId.get(json.requestId) : null;
        switch (json.type) {
            case "status":
                if (json.status === "mode") {
                    setUavStatus(prev => ({
                        ...prev,
                        mode: json.value
                    }));
                }
                break;
            // sets most of the UI to show a specific image or uav status.
            case "load":
                setUavStatus(json.uavStatus);
                setImageName(json.imageName);
                break;
            case "log":
                setLogs((prev) => [...prev, { message: json.message, severity: json.severity }]);
                break;
            case "img": {
                setUavStatus(prev => ({
                    ...prev,
                    imageCount: Number(prev.imageCount) + 1
                }));
                const droneUrl = wsConnRef.current.url + json.value;
                setImageName(droneUrl);
                fetch("/api/saveImage", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: droneUrl })
                })
                    .then(r => r.json())
                    .then(({ filename, savedAt }) => {
                        const localUrl = `/api/images/${filename}`;
                        setImageHistory(prev => [...prev, { url: localUrl, savedAt, name: "" }]);
                        setImageName(localUrl);
                        setNamingImage({ url: localUrl, filename });
                    })
                    .catch(() => {
                        setImageHistory(prev => [...prev, { url: droneUrl, savedAt: Date.now() }]);
                    });
                break;
            }
            case "slam_data":
                if (json.points?.length) {
                    setSlamPoints(prev => {
                        const combined = [...prev, ...json.points];
                        return combined.length > MAX_SLAM_POINTS
                            ? combined.slice(combined.length - MAX_SLAM_POINTS)
                            : combined;
                    });
                }
                if (json.pose) setSlamPose(json.pose);
                break;
            case "point":
                if (!pending) {
                    return;
                }
                pendingByRequestId.delete(json.requestId);
                if (json.message === "invalid") {
                    const msg = "invalid depth point";
                    pending.reject(msg);
                    setLogs((prev) => [...prev, { message: `point: ${msg}`, severity: "normal" }]);
                    break;
                } else {
                    const point = json.message;
                    pending.resolve(json.message);
                    setLogs((prev) => [...prev, { message: `point: (${point.x}, ${point.y}, ${point.z})`, severity: "normal" }]);
                    break;
                }
        };
    }, []);
    
    wsConnRef.current.setRecvMessageCB(messageHandler);


    useEffect(() => {
        fetch("/api/savedImages")
            .then(r => r.json())
            .then(files => {
                setImageHistory(files.map(f => ({
                    url: `/api/images/${f.filename}`,
                    savedAt: f.savedAt,
                    name: f.name || ""
                })));
            })
            .catch(() => {});
    }, []);

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

    const handleImageNameConfirm = (name) => {
        if (!namingImage) return;
        fetch(`/api/images/${namingImage.filename}/name`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        }).catch(() => {});
        setImageHistory(prev => prev.map(img =>
            img.url === namingImage.url ? { ...img, name } : img
        ));
        setNamingImage(null);
    };

    return (
        <div className="flex flex-col h-screen">
            {namingImage && <NameImageDialog onConfirm={handleImageNameConfirm} onSkip={() => setNamingImage(null)} />}
            <Navbar
                isConnected={isConnected}
                connect={handleConnect}
                disconnect={handleDisconnect}
                autoReconnect={autoReconnect}
                onAutoReconnectChange={handleAutoReconnectChange}
                ledOn={ledOn}
                onLedChange={handleLedChange}
            />
            <div className="flex flex-1 min-h-0 w-screen">
                <div className="w-[250px] min-h-[400px] flex-shrink-0 flex-grow-0 p-4">
                    <UAVStatus status={uavStatus}/>
                </div>
                <div className="flex-grow h-full flex min-w-[400px] min-h-[400px] items-start justify-center p-4">
                    <ImageLayout isConnected={isConnected} filename={imageName} sendFunc={wsConnRef.current.sendMessage.bind(wsConnRef.current)} imageHistory={imageHistory} onImageSelect={setImageName} slamPoints={slamPoints} slamPose={slamPose} onClearSlam={() => { setSlamPoints([]); setSlamPose(null); }} onImageDelete={(url) => {
                        const filename = url.split("/").pop();
                        fetch(`/api/images/${filename}`, { method: "DELETE" }).catch(() => {});
                        setImageHistory(prev => prev.filter(img => img.url !== url));
                        if (imageName === url) setImageName("");
                    }} />
                </div>
                <div className="w-[400px] min-h-[400px] h-full flex-shrink-0 flex-grow-0 p-4">
                    <LogView logs={logs} />
                </div>
            </div>
        </div>
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

function ImageLayout({ filename, isConnected, sendFunc, imageHistory = [], onImageSelect, onImageDelete, slamPoints = [], slamPose = null, onClearSlam }) {
    const dialogPendingRef = useRef(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [pointsPerImage, setPointsPerImage] = useState({});
    const currentPoints = useMemo(() => pointsPerImage[filename] || [], [pointsPerImage, filename]);

    useEffect(() => {
        const match = filename?.match(/\/api\/images\/([^?]+)/);
        if (!match) return;
        const imgFilename = match[1];
        fetch(`/api/imagePoints/${imgFilename}`)
            .then(r => r.json())
            .then(pts => {
                if (pts.length > 0) {
                    setPointsPerImage(prev => ({
                        ...prev,
                        [filename]: pts
                    }));
                }
            })
            .catch(() => {});
    }, [filename]);

    const imageUriToId = (uri) => {
        const parts = uri.split("/").filter(Boolean);

        if (parts.length >= 2) {
            const last = parts[parts.length - 1].replace(/\.[^/.]+$/, "");
            const secondLast = parts[parts.length - 2];
            return `${secondLast}/${last}`;
        }

        // fallback (only one segment)
        return parts[0]?.replace(/\.[^/.]+$/, "") || "";
    };

    const handleCaptureImage = () => {
        // if no connection, just return
        if (!isConnected) {
            alert("No connection with the drone");
            return;
        }

        setIsImageLoading(true);
        sendFunc({
            type: "image",
            message: "capture"
        });
    }

    const handlePointsClicked = async (point) => {
        if (!isConnected) {
            alert("No connection with the drone");
            return;
        }
        const targetInfoPromise = new Promise((resolve, reject) => {
            dialogPendingRef.current = { resolve, reject };
        });

        setDialogOpen(true);
        const targetInfo = await targetInfoPromise;
        setDialogOpen(false);

        setPointsPerImage(prev => ({
            ...prev,
            [filename]: [...(prev[filename] || []), point]
        }));

        const match = filename?.match(/\/api\/images\/([^?]+)/);
        if (match) {
            fetch("/api/imagePoints", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename: match[1], x: point.x, y: point.y })
            }).catch(() => {});
        }

        sendFunc({
            type: "getPoint",
            message: {
                pixel: point
            }
        })
            .then(distPoint => {
                saveTarget(targetInfo.name, imageUriToId(filename), distPoint);
            })
            .catch((error) => {
                alert(error);
            });
    }

    const [tabPick, setTabPick] = useState("image");
    const [showHistory, setShowHistory] = useState(false);

    const handleTabChange = (tabName) => {
        if (tabPick === "slam" && tabName !== "slam") {
            sendFunc({ type: "slam", command: "stop" });
        }
        if (tabName === "slam" && tabPick !== "slam") {
            sendFunc({ type: "slam", command: "start" });
        }
        setTabPick(tabName);
    };

    return (
        <div className="relative w-full h-full">
            <Card className="w-full h-full shadow-2xl flex flex-col">
                <CardHeader>
                    <CardTitle className="text-center w-full">
                        Current Image
                    </CardTitle>
                </CardHeader>
                <Button className="absolute right-7 top-5 shadow-lg" onClick={handleCaptureImage} variant="outline">Capture Image</Button>
                {imageHistory.length > 0 && (
                    <Button className="absolute right-40 top-5 shadow-lg" onClick={() => setShowHistory(h => !h)} variant="outline">
                        Saved Images ({imageHistory.length})
                    </Button>
                )}
                <Tabs defaultValue="image" onValueChange={handleTabChange} className="absolute left-3 top-5 font-bold">
                    <TabsList>
                        <TabsTrigger value="image">Image</TabsTrigger>
                        <TabsTrigger value="targetMgmt">Target Management</TabsTrigger>
                        <TabsTrigger value="viewer">3D Viewer</TabsTrigger>
                        <TabsTrigger value="slam">SLAM</TabsTrigger>
                    </TabsList>
                </Tabs>
                {tabPick === "image" && (
                    <CardContent className="flex-grow flex items-center justify-center box-border relative">
                        {dialogOpen && <AddTargetDialog dialogClose={() => setDialogOpen(false)} setFormData={data => {
                            dialogPendingRef.current?.resolve(data)
                            dialogPendingRef.current = null;
                        }}></AddTargetDialog>}
                        {isImageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10 rounded-md">
                                <Spinner className="size-10 text-muted-foreground" />
                            </div>
                        )}
                        <Canvas imgSrc={`${filename}`} onPointsClicked={handlePointsClicked} onImageLoaded={() => setIsImageLoading(false)} points={currentPoints} className="object-contain max-w-full max-h-full">
                        </Canvas>
                    </CardContent>
                )}
                {tabPick === "image" && showHistory && imageHistory.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto p-2 border-t flex-shrink-0">
                        {imageHistory.map((img, i) => (
                            <div key={i} className="flex flex-col items-center flex-shrink-0 gap-1">
                                <img
                                    src={img.url}
                                    className={`h-16 w-24 object-cover rounded border-2 cursor-pointer ${filename === img.url ? "border-blue-500" : "border-transparent hover:border-gray-400"}`}
                                    onClick={() => onImageSelect(img.url)}
                                />
                                <span className="text-xs text-muted-foreground">
                                    {img.name || new Date(img.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <Button variant="destructive" className="h-6 text-xs px-2 w-24" onClick={() => onImageDelete(img.url)}>Delete</Button>
                            </div>
                        ))}
                    </div>
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
                {tabPick === "slam" && (
                    <CardContent className="flex-grow h-full w-full">
                        <SlamViewer points={slamPoints} pose={slamPose} onClear={onClearSlam} />
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
