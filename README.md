Emu readme
=============
Emu is UAARG's latest ground station imaging software. It is based on 
the old ground station software pigeon and is used to:
- Monitor drone status.
- Send commands.
- Display maps and images.
- Log messages.
- Create an SSH connection with the onboard computer.
Emu does this through a combination of manual and
automatic processes. The ultimate objective is to offer a view into 
the drone's operations.


Installation & Setup
--------------------

Make sure you have python >=3.10 installed on your machine and that it is in
your `PATH`.

Install front end dependancies
--------------------
./install.sh

Setup the python virtual environment (do this once)
--------------------
python3 -m venv venv

Activate the virtual environment (different for each OS)
--------------------
```
source ./venv/bin/activate  # (MacOS/Linux/...) unix shell
venv\Scripts\activate.bat   # (Windows) cmd.exe
venv\Scripts\Activate.ps1   # (Windoes) PowerShell
```

Install dependencies (do this at setup and/or when requirements.txt changes)
--------------------
pip install -r requirements.txt

Warning
--------------
This repository is still under development

Running Emu
--------------

run the gui using command
npm run dev

Contributing
------------
A few notes about contributing:

* Please feel free to ask any question at any time.
* Please feel free to ask for help.
* Please follow pep8 for style: https://www.python.org/dev/peps/pep-0008/
* Please run the tests and make sure they pass before commiting
  anything: if the tests don't pass, it means you broke something
  somehow (or, someone else commited a break, in which case find who
  and get them to fix it).

