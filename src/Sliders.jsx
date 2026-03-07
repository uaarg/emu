import { useState } from 'react';
import { Button } from './components/ui/button';

function Sliders({ sendFunc }) {
    const [vertical, setVertical] = useState(90);
    const [horizontal, setHorizontal] = useState(0);

    const handleVerticalChange = (value) => {
        setVertical(value);
        sendFunc({
            type: "aim",
            vertical: value,
            horizontal: horizontal
        });
    };

    const handleHorizontalChange = (value) => {
        setHorizontal(value);
        sendFunc({
            type: "aim",
            vertical: vertical,
            horizontal: value
        });
    };

    const handleReset = () => {
        setVertical(90);
        setHorizontal(0);
        sendFunc({
            type: "aim",
            vertical: 90,
            horizontal: 0
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
                        onChange={(e) => handleVerticalChange(Number(e.target.value))}
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
                        onChange={(e) => handleHorizontalChange(Number(e.target.value))}
                        className="w-full"
                    />
                    <span className="text-sm">{horizontal}°</span>
                </div>
                <Button onClick={handleReset} variant="outline">Reset Sliders</Button>
            </div>
        </div>
    );
}

export default Sliders;
