import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

export function Navbar({ isConnected, connect, disconnect, autoReconnect, onAutoReconnectChange, ledOn, onLedChange }) {
    const [url, setUrl] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!url) return;
        if (isConnected) {
            disconnect();
        } else {
            connect(url);
        }
    };

    return (
        <nav className="h-14 border-b flex items-center px-4 gap-4 bg-background shrink-0">
            <span className="font-bold text-lg tracking-tight shrink-0">Emu</span>
            <Separator orientation="vertical" className="h-6" />
            <form className="flex items-center gap-2 flex-1 max-w-sm" onSubmit={handleSubmit}>
                <Input
                    className="h-8"
                    type="text"
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8765"
                    disabled={isConnected}
                />
                <Button type="submit" variant="outline" size="sm">
                    {isConnected ? "Disconnect" : "Connect"}
                </Button>
            </form>
            <div className="ml-auto flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <Switch checked={autoReconnect} onCheckedChange={onAutoReconnectChange} />
                    Auto Reconnect
                </label>
                <Separator orientation="vertical" className="h-6" />
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <Switch checked={ledOn} onCheckedChange={onLedChange} />
                    LED
                </label>
            </div>
        </nav>
    );
}
