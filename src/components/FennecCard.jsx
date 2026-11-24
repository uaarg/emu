// Fennec GPS over the telemetry radio (#62, #63). Placeholder until the backend
// reads the SiK radio: it will show GPS_RAW_INT from Fennec and start/stop CSV recording.
import { Field, Panel } from "./common";
import { Button } from "./ui/button";

const GPS_FIELDS = [
    ["Fix type", "fix_type"],
    ["Satellites", "satellites_visible"],
    ["Latitude", "lat"],
    ["Longitude", "lon"],
    ["Altitude (MSL)", "alt"],
    ["GPS time", "time_usec"],
];

export default function FennecCard() {
    return (
        <Panel title="Fennec GPS" issue="#62 #63"
               actions={<span className="text-xs text-muted-foreground">radio link not implemented</span>}>
            <div className="divide-y">
                {GPS_FIELDS.map(([label]) => <Field key={label} label={label} value="—" level="idle" />)}
            </div>
            <div className="mt-3 flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>Start CSV recording</Button>
                <span className="text-xs text-muted-foreground">available once Emu reads Fennec&apos;s GPS_RAW_INT</span>
            </div>
        </Panel>
    );
}
