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
Create venv
```
python3 -m venv venv
```
Activate venv, different for each environment
```
source ./venv/bin/activate  # (MacOS/Linux/...) unix shell
venv\Scripts\activate.bat   # (Windows) cmd.exe
venv\Scripts\Activate.ps1   # (Windoes) PowerShell
```
Install dependencies
```
pip install -r requirements.txt
```

Running Emu
--------------
### run the frontend
From the base project directory run the gui using command
```
npm run dev
```

### run the mock uav
For testing you need a second terminal, one for frontend and test code
in the first terminal, run the above command.

In the second terminal, from base directory run
```
python tests/mock-uav.py
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
* Please follow pep8 for style: https://www.python.org/dev/peps/pep-0008/
* Please run the tests and make sure they pass before commiting
  anything: if the tests don't pass, it means you broke something
  somehow (or, someone else commited a break, in which case find who
  and get them to fix it).

