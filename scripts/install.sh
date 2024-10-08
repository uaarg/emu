#!/bin/bash


while true;
do
	read -p "Do you have node/npm installed? (y/n): " ans
	if [[ $ans == "n" ]];then
# installs nvm (Node Version Manager)
		curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# download and install Node.js (you may need to restart the terminal)
		nvm install 20

# verifies the right Node.js version is in the environment
		node -v # should print `v20.18.0`

# verifies the right npm version is in the environment
		npm -v # should print `10.8.2`
		break
	elif [[ $ans == "y" ]];then
		break
	else
		echo "Wrong input"
	fi
done

# install dependancies
npm install
npm install -D tailwindcss postcss autoprefixer
# (so you can import "path" without error)
npm i -D @types/node
