import { useState } from 'react';
import { Button } from './components/ui/button';

function Sliders({ sendFunc }) {
    const [vertical, setVertical] = useState(90);
    const [horizontal, setHorizontal] = useState(0);

    const handleSendAiming = () => {
        sendFunc({
            type: "aim",
            vertical: vertical,
            horizontal: horizontal
        });
    };

    return (
        <div className="p-4">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Vertical Slider (Servo Angle: 0-180°)</label>
                    <input
                        type="range"
                        min="0"
                        max="180"
                        value={vertical}
                        onChange={(e) => setVertical(Number(e.target.value))}
                        className="w-full"
                    />
                    <span className="text-sm">{vertical}°</span>
                </div>
                <div>
                    <label className="block text-sm font-medium">Horizontal Slider (Drone Yaw: -180° to 180°)</label>
                    <input
                        type="range"
                        min="-180"
                        max="180"
                        value={horizontal}
                        onChange={(e) => setHorizontal(Number(e.target.value))}
                        className="w-full"
                    />
                    <span className="text-sm">{horizontal}°</span>
                </div>
                <Button onClick={handleSendAiming} variant="outline">Send Aiming Values</Button>
            </div>
        </div>
    );
}

export default Sliders;
