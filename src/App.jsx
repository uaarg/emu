import AckConsole from "./components/AckConsole";
import AckCounter from "./components/AckCounter";
import FennecCard from "./components/FennecCard";
import InfractionCounter from "./components/InfractionCounter";
import LinkHealth from "./components/LinkHealth";
import LogView from "./components/LogView";
import StatusBar from "./components/StatusBar";
import TrafficCard from "./components/TrafficCard";
import { useGroundStation, useNow } from "./lib/groundStation";

function App() {
    const { state, backendConnected } = useGroundStation();
    const now = useNow();

    // Our best known position: the latest ACK, else Shepard's latest packet
    const ownPosition = state.acks.at(-1) ?? state.shepardTelemetry?.packet ?? null;

    return (
        <div className="min-h-screen bg-muted/40">
            <StatusBar state={state} backendConnected={backendConnected} />
            <main className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 xl:grid-cols-3">
                <AckCounter acks={state.acks} ackCount={state.ackCount} now={now} />
                <InfractionCounter infractions={state.infractions} now={now} />
                <LinkHealth state={state} now={now} />
                <AckConsole acks={state.acks} className="lg:col-span-2" />
                <TrafficCard traffic={state.traffic} ownPosition={ownPosition} now={now} />
                <LogView logs={state.logs} serverErrors={state.serverErrors} className="lg:col-span-2" />
                <FennecCard />
            </main>
        </div>
    );
}

export default App;
