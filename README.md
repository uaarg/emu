Emu readme
=============
Emu is UAARG's latest ground station imaging software. It is based on 
the old ground station software - pigeon 

Emu is used to:
- Monitor drone status.
- Send commands.
- Display maps and images.
- Log messages.
- Create an SSH connection with the onboard computer.

Emu does this through a combination of manual and
automatic processes. The ultimate objective is to offer a view into 
the drone's operations.

# Warning
--------------
**THIS REPOSITORY IS STILL UNDER DEVELOPMENT**


Install front end dependancies
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

Setup the python for testing
--------------------
To test Emu install and setup Shephard.

Running Emu
--------------
### run the frontend
From the base project directory run the gui using command
```
npm run dev
```

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
