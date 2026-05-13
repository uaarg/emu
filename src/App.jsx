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

    const handleCaptureImage = () => {
        if (!isConnected) {
            alert("No connection with the drone");
            return;
        }

        sendFunc({
            type: "image",
            message: "capture"
        }).catch((error) => {
            alert(error);
        });
    };

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
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm">Viewer</CardTitle>
                        <Button size="sm" variant="outline" onClick={handleCaptureImage}>Capture Image</Button>
                    </div>
                    <Tabs defaultValue="image" onValueChange={setTabPick} className="mt-2">
                        <TabsList className="grid w-full grid-cols-3 h-8">
                            <TabsTrigger value="image" className="text-xs">Image</TabsTrigger>
                            <TabsTrigger value="targetMgmt" className="text-xs">Measure</TabsTrigger>
                            <TabsTrigger value="viewer" className="text-xs">3D</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
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
