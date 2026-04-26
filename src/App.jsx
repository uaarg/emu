import { useUAVConnection } from './comms.js';
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
            case "distance":
                console.log(json);
                setLogs((prev) => [...prev, { message: `distance: ${json.message}`, severity: "normal"}]);
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
            <Input className="max-w-sm" type="text" onChange={(e) => setUrl(e.target.value)} placeholder="http://127.0.0.1:800" />
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
    const pointsRef = useRef({
        p1: null,
        p2: null
    })

    const handleCaptureImage = () => {
        // if no connection, just return
        if (status.connection == "no") {
            alert("No connection with the drone")
            return;
        }

        //request image from UAV
        sendFunc({
            type: "image",
            message: "capture"
        })

        pointsRef.current = {
            p1: null,
            p2: null
        }
    }

    const handlePointsClicked = (point) => {

        if (!pointsRef.current.p1) {
            pointsRef.current.p1 = point
        }
        else if (!pointsRef.current.p2) {
            pointsRef.current.p2 = point
        } else {
            alert("ONLY 2 POINTS")
        }

        console.log(pointsRef.current)
    }

    const handleMeasure = () => {
        if (status.imageCount == 0) {
            alert("No image")
            return
        } else if (!pointsRef.current.p1 || !pointsRef.current.p2) {
            alert("Select exactly 2 points");
            return;
        }

        sendFunc({
            type: "getDistance",
            message: {
                p1: pointsRef.current.p1,
                p2: pointsRef.current.p2
            }
        })

        pointsRef.current = {
            p1: null,
            p2: null
        }
    }

    return (
        <div className="relative w-full h-full">
            <Card className="w-full h-full shadow-2xl flex flex-col">
                <CardHeader>
                    <CardTitle className="text-center w-full">
                        Current Image
                    </CardTitle>
                </CardHeader>
                <Button className="absolute right-8 top-5 shadow-lg" onClick={handleCaptureImage} variant="outline"> Capture Image </Button>
                <Button className="absolute left-8 top-5 shadow-lg" onClick={handleMeasure} variant="outline"> Measure Distance </Button>
                <CardContent className="flex-grow flex items-center justify-center box-border">
                    <Canvas imgSrc={`${filename}`} pointsClicked={handlePointsClicked} className="object-contain max-w-full max-h-full">
                    </Canvas>
                </CardContent>
                <Sliders sendFunc={sendFunc} />
            </Card>
        </div>
    );
}

const MAG_LENS_CSS = 140;
const MAG_ZOOM = 2.5;

function Canvas({ imgSrc, pointsClicked, className }) {
    const canvasRef = useRef(null);
    const magnifierRef = useRef(null);
    const containerRef = useRef(null);
    const pointsClickedRef = useRef(pointsClicked);
    pointsClickedRef.current = pointsClicked;

    useEffect(() => {
        const canvas = canvasRef.current;
        const magCanvas = magnifierRef.current;
        const container = containerRef.current;
        if (!canvas || !magCanvas || !container) return;

        const ctx = canvas.getContext("2d");
        const magCtx = magCanvas.getContext("2d");
        magCanvas.width = MAG_LENS_CSS;
        magCanvas.height = MAG_LENS_CSS;

        const image = new Image();
        let bitmapReady = false;

        const clientToBitmap = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY,
            };
        };

        const positionLens = (clientX, clientY) => {
            const wrap = container.getBoundingClientRect();
            const pad = 12;
            let left = clientX - wrap.left + pad;
            let top = clientY - wrap.top - MAG_LENS_CSS - pad;
            left = Math.min(Math.max(0, left), Math.max(0, wrap.width - MAG_LENS_CSS));
            top = Math.min(Math.max(0, top), Math.max(0, wrap.height - MAG_LENS_CSS));
            magCanvas.style.left = `${left}px`;
            magCanvas.style.top = `${top}px`;
        };

        const drawMagnifier = (clientX, clientY) => {
            if (!bitmapReady || canvas.width <= 0 || canvas.height <= 0) return;
            const rect = canvas.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            const { x: bx, y: by } = clientToBitmap(clientX, clientY);
            let srcW = (MAG_LENS_CSS / MAG_ZOOM) * (canvas.width / rect.width);
            let srcH = (MAG_LENS_CSS / MAG_ZOOM) * (canvas.height / rect.height);
            srcW = Math.min(srcW, canvas.width);
            srcH = Math.min(srcH, canvas.height);
            let sx = bx - srcW / 2;
            let sy = by - srcH / 2;
            sx = Math.max(0, Math.min(sx, canvas.width - srcW));
            sy = Math.max(0, Math.min(sy, canvas.height - srcH));
            magCtx.clearRect(0, 0, MAG_LENS_CSS, MAG_LENS_CSS);
            magCtx.drawImage(canvas, sx, sy, srcW, srcH, 0, 0, MAG_LENS_CSS, MAG_LENS_CSS);
            const cx = MAG_LENS_CSS / 2;
            const cy = MAG_LENS_CSS / 2;
            const arm = (MAG_LENS_CSS / 2) / 10;
            magCtx.save();
            magCtx.strokeStyle = "red";
            magCtx.lineWidth = 1.5;
            magCtx.lineCap = "square";
            magCtx.beginPath();
            magCtx.moveTo(cx - arm, cy);
            magCtx.lineTo(cx + arm, cy);
            magCtx.moveTo(cx, cy - arm);
            magCtx.lineTo(cx, cy + arm);
            magCtx.stroke();
            magCtx.restore();
        };

        image.onload = () => {
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            bitmapReady = true;
        };
        image.src = imgSrc;

        const construct_canvas = (event) => {
            if (!bitmapReady) return;
            const { x, y } = clientToBitmap(event.clientX, event.clientY);
            const rx = Math.round(x);
            const ry = Math.round(y);
            pointsClickedRef.current({ x: rx, y: ry });
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(rx, ry, 5, 0, Math.PI * 2);
            ctx.fill();
        };

        const onMove = (event) => {
            if (!bitmapReady) return;
            positionLens(event.clientX, event.clientY);
            drawMagnifier(event.clientX, event.clientY);
            magCanvas.style.visibility = "visible";
        };

        const onLeave = () => {
            magCanvas.style.visibility = "hidden";
        };

        canvas.addEventListener("click", construct_canvas);
        canvas.addEventListener("mousemove", onMove);
        canvas.addEventListener("mouseleave", onLeave);

        return () => {
            bitmapReady = false;
            canvas.removeEventListener("click", construct_canvas);
            canvas.removeEventListener("mousemove", onMove);
            canvas.removeEventListener("mouseleave", onLeave);
        };
    }, [imgSrc]);

    return (
        <div ref={containerRef} className="relative inline-block max-w-full max-h-full">
            <canvas ref={canvasRef} className={className} />
            <canvas
                ref={magnifierRef}
                width={MAG_LENS_CSS}
                height={MAG_LENS_CSS}
                className="absolute pointer-events-none rounded-full border-2 border-neutral-200 shadow-xl bg-neutral-900 ring-1 ring-black/20"
                style={{
                    width: MAG_LENS_CSS,
                    height: MAG_LENS_CSS,
                    left: 0,
                    top: 0,
                    visibility: "hidden",
                }}
            />
        </div>
    );
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
