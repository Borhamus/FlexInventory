import React from "react";
import GanttChart from "../components/GanttChart";

export default function App() {
  const processes = ["P1", "P2", "P3", "P4"];

  // Ejemplo Round Robin (quantum=2)
  const schedule = [
    { process: "P1", start: 0, end: 2 },
    { process: "P2", start: 2, end: 4 },
    { process: "P1", start: 4, end: 5 },
    { process: "P3", start: 5, end: 6 },
    { process: "P2", start: 6, end: 7 },
    { process: "P1", start: 7, end: 12 },
    { process: "P4", start: 13, end: 23 }
  ];

  return (
    <div>
      <h1>Simulador CPU Scheduling</h1>
      <GanttChart schedule={schedule} processes={processes} totalTime={23} />
    </div>
  );
}
