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
      <Card className="max-w-xs m-4">
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
  )
}

function App() {
  return (
    <>
      <UAVStatus />
    </>
    )
}

export default App
