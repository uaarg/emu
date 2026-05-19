import { UAVConnection, pendingByRequestId } from './comms.js';
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
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs.jsx';
import Canvas from './components/Canvas.jsx';
import { AddTargetDialog } from './components/Dialog.jsx';
import { saveTarget } from './targets.js';
import { DistanceTable } from './components/DistancesTable.jsx';
import TargetViewer from './components/TargetViewer.jsx';
import ImageLibrary from './components/ImageLibrary.jsx';
import RGBDViewer from './components/RGBDViewer.jsx';

function App() {
    const [uavStatus, setUavStatus] = useState({
        connection: "no",
        mode: "null",
        imageCount: 0,
        timeSinceMessage: 0
    });
    const [imageName, setImageName] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [logs, setLogs] = useState([]);
    const wsConnRef = useRef(new UAVConnection());
    const [isConnected, setIsConnected] = useState(false);
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
            case "img":
                setUavStatus(prev => ({
                    ...prev,
                    imageCount: Number(prev.imageCount) + 1
                }));
                setImageName(wsConnRef.current.url + json.value);
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
            <ConnectComponent isConnected={isConnected}
                connect={wsConnRef.current.connect.bind(wsConnRef.current)}
                disconnect={wsConnRef.current.disconnect.bind(wsConnRef.current)}
            />
            <div className="flex w-screen h-screen gap-2 p-2">
                {/* Left panel: UAV Status */}
                <div className="w-[250px] flex-shrink-0 flex-grow-0">
                    <UAVStatus status={uavStatus}/>
                </div>
                
                {/* Center panel: Image Library and RGBD Viewer */}
                <div className="flex-grow flex gap-2 min-w-[400px] min-h-[400px]">
                    {/* Image Library */}
                    <div className="w-[300px] flex-shrink-0">
                        <FilingSystemLayout 
                            selectedImage={selectedImage}
                            onSelectImage={setSelectedImage}
                        />
                    </div>
                    
                    {/* RGBD Viewer and measurement tools */}
                    <div className="flex-grow">
                        <MeasurementLayout 
                            selectedImage={selectedImage}
                            isConnected={isConnected}
                            sendFunc={wsConnRef.current.sendMessage.bind(wsConnRef.current)}
                        />
                    </div>
                </div>
                
                {/* Right panel: Logs */}
                <div className="w-[350px] flex-shrink-0 flex-grow-0">
                    <LogView logs={logs} />
                </div>
            </div>
        </div>
    );
}

function ConnectComponent({ isConnected, connect, disconnect }) {
    const [url, setUrl] = useState("");
    const connectBtnTxt = isConnected ? "Disconnect" : "Connect";
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!url) {
            return;
        }
        if (isConnected) {
            disconnect();
        }
        else {
            connect(url);
        }
    };
    return (
        <form className="flex items-center gap-2 m-2" onSubmit={handleSubmit}>
            <label> Drone URL </label>
            <Input className="max-w-sm" type="text" onChange={(e) => setUrl(e.target.value)} placeholder="http://127.0.0.1:800" />
            <Button type="submit" variant="outline"> {connectBtnTxt} </Button>
        </form>
    );
}

function UAVStatus({ status }) {
    return (
        <Card className="w-full h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm">UAV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                    <span>Connected</span>
                    <span className="font-mono">{status.connection}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span>Mode</span>
                    <span className="font-mono">{status.mode}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span>Images</span>
                    <span className="font-mono">{status.imageCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span>Time</span>
                    <span className="font-mono">{status.timeSinceMessage}s</span>
                </div>
            </CardContent>
        </Card>
    );
}

function FilingSystemLayout({ selectedImage, onSelectImage }) {
    return <ImageLibrary onSelectImage={onSelectImage} selectedImage={selectedImage} />;
}

/**
 * MeasurementLayout displays the selected image with measurement tools
 * Points taken on the image are only recorded when the image is displayed
 */
function MeasurementLayout({ selectedImage, isConnected, sendFunc }) {
    const dialogPendingRef = useRef(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [tabPick, setTabPick] = useState("image");

    const handlePointsClicked = async (point, imageName) => {
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

        sendFunc({
            type: "getPoint",
            message: {
                pixel: point
            }
        })
            .then(distPoint => {
                saveTarget(targetInfo.name, imageName, distPoint);
            })
            .catch((error) => {
                alert(error);
            });
    };

    return (
        <Card className="w-full h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">Viewer</CardTitle>
                <Tabs defaultValue="image" onValueChange={setTabPick} className="mt-2">
                    <TabsList className="grid w-full grid-cols-3 h-8">
                        <TabsTrigger value="image" className="text-xs">Image</TabsTrigger>
                        <TabsTrigger value="targetMgmt" className="text-xs">Measure</TabsTrigger>
                        <TabsTrigger value="viewer" className="text-xs">3D</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>

            <CardContent className="flex-grow overflow-hidden p-2">
                {dialogOpen && <AddTargetDialog dialogClose={() => setDialogOpen(false)} setFormData={data => {
                    dialogPendingRef.current?.resolve(data);
                    dialogPendingRef.current = null;
                }}/>}
                
                {tabPick === "image" && <RGBDViewer imageName={selectedImage} onPointsClicked={handlePointsClicked} />}
                {tabPick === "targetMgmt" && (
                    !selectedImage ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-500">
                            <div>Nothing to measure yet</div>
                            <div>Select an image from the library or return to the Image tab.</div>
                            <Button size="sm" variant="outline" onClick={() => setTabPick('image')}>Back to library</Button>
                        </div>
                    ) : (
                        <DistanceTable />
                    )
                )}
                {tabPick === "viewer" && (
                    !selectedImage ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-500">
                            <div>Nothing to measure yet</div>
                            <div>Select an image from the library or return to the Image tab.</div>
                            <Button size="sm" variant="outline" onClick={() => setTabPick('image')}>Back to library</Button>
                        </div>
                    ) : (
                        <TargetViewer />
                    )
                )}
            </CardContent>
        </Card>
    );
}

function ImageLayout({ filename, isConnected, sendFunc }) {
    const dialogPendingRef = useRef(null);
    const [dialogOpen, setDialogOpen] = useState(false);

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

        //request image from UAV
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
            </Card>
        </div >
    );
}

function LogView({ logs }) {
    return (
        <Card className="w-full h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">Logs</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-2">
                <ScrollArea className="h-full">
                    <div className="space-y-1 text-xs">
                        {logs.map((log, i) => (
                            <div key={i} className={`p-1 rounded ${
                                log.severity === "warning" ? "bg-red-100 text-red-700" :
                                log.severity === "error" ? "bg-orange-100 text-orange-700" :
                                "bg-gray-100"
                            }`}>
                                <span className="font-mono text-xs">[{log.severity}]</span> {log.message}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

export default App
