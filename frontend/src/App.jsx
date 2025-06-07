import { useState } from 'react'

import {
  Card,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from './components/ui/card'

import { Switch } from "./components/ui/switch"


function UAVStatusComponent({ label, value }) {
  return (
    <div className="flex justify-between items-center space-x-2">
      <p className="basis-1/2">{label}</p>
      <div className="basis-1/2 rounded-md border px-2 py-2 font-mono text-sm">
        {value}
      </div>
    </div>
  );
}


function UAVStatus() {
  return (
    <>
      <Card className="w-full h-full shadow-2xl">
        <CardHeader>
          <CardTitle>UAV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <UAVStatusComponent label="Connected" value="no" />
          <UAVStatusComponent label="Time since last message" value="0 sec" />
          <UAVStatusComponent label="Current mode" value="Idle" />
          <UAVStatusComponent label="Pictures captured" value="0" />
        </CardContent>
        <CardFooter className="flex justify-center space-x-4">
          <Switch />
          <p> Connect </p>
        </CardFooter>
      </Card>
    </>
  );
}


function ImageLayout() {
  return (
    <div className="w-full h-full">
      <Card className="w-full h-full shadow-2xl flex flex-col">
        <CardHeader>
          <CardTitle className="text-center w-full">
            Images
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center box-border">
          <img src="sample3.png"
            alt="no image"
            className="object-contain max-w-full max-h-full"
          />
        </CardContent>
      </Card>
    </div>
  );
}


function RightSide() {
  return (
    <>
      <Card className="w-full h-full shadow-2xl">
      </Card>
    </>
  );
}


function App() {
  return (
    <div className="flex w-screen h-screen">
      <div className="w-[250px] min-h-[400px] flex-shrink-0 flex-grow-0 p-4">
        <UAVStatus/>
      </div>
      <div className="flex-grow h-full flex min-w-[400px] min-h-[400px] items-start justify-center p-4">
        <ImageLayout/>
      </div>
      <div className="w-[250px] min-h-[400px] flex-shrink-0 flex-grow-0 p-4">
        <RightSide/>
      </div>
    </div>
    );
}

export default App
