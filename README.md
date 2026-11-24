Emu readme
=============
Emu is UAARG's ground station software. It is based on 
the old ground station software - pigeon 

Emu currently:
- Keeps a redundant connection to the AEAC competition telemetry server
- Counts telemetry ACKs and shows them in a console (#58)
- Shows the server's infraction counts and score (#60)
- Compares Shepard's telemetry with the server's ACKs to spot a dropped link (#59)
- Shows the server's simulated traffic and our separation from it
- Logs messages from Shepard

```
Shepard  --ws-->  Emu backend (src/server)  <--ws-->  AEAC telemetry server
                        |
                        v  ws /ws
                  Emu frontend (src)
```
The browser only talks to the backend; the backend holds all the state
(`src/server/groundState.js` lists every message it pushes to the frontend).


Install dependancies
--------------------
For linux or MacOS
```
./scripts/install.sh
```
Reload your shell after running the install script.

For Windows (powershell) run the following commands from the base directory (emu).
```
npm install --prefix
npm install -D tailwindcss postcss autoprefixer
```

Running Emu
--------------
Two terminals: one for the backend and one for the frontend.
```
# Backend. The token comes from the AEAC Credentials page; never commit it.
AEAC_CONNECTION_TOKEN=<token> npm run server

# Frontend, then open the printed URL (http://localhost:5173)
npm run dev
```
Connect to Shepard from the top bar (e.g. `http://<shepard-ip>:8080`), or start
the backend with `SHEPARD_URL` set. Without a token the telemetry server
connection is disabled.

### Testing without the drone or the real server
```
npm run mock-atc        # fake telemetry server on :8766
npm run mock-shepard    # fake Shepard on :8080, streams to the fake server
ATC_URL=ws://127.0.0.1:8766 AEAC_CONNECTION_TOKEN=test SHEPARD_URL=http://127.0.0.1:8080 npm run server
npm run dev
curl -X POST localhost:8080/toggle-atc   # simulate Shepard's server link dropping
```
`scripts/run-atc-test.sh` runs the real Shepard demo and the backend together.
`npm run test:server` runs the backend tests.

## Contribution Guidlines
------------
### Found a Bug or Have a Feature Request?
* Please create a new issue to report bugs or to request features.
* Include steps to reproduce the bug or a clear description of the feature.

### When contributing
* Pick an open issue. 
* Create a new branch for your work using an appropriate name. 
* Make your changes then open a Pull Request to the main branch of this repository. Be sure to link the issue it resolves. 
* Please feel free to ask any question at any time.
* Please feel free to ask for help.
