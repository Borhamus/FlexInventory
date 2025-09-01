// GanttChart.js
import React from "react";
import "../styles/GanttChart.css";

function GanttChart({ schedule, processes, totalTime }) {
  return (
    <div
      className="gantt"
      style={{
        gridTemplateRows: `repeat(${processes.length}, 40px)`,
        gridTemplateColumns: `repeat(${totalTime}, 40px)`
      }}
    >
      {/* Etiquetas de procesos */}
      {processes.map((p, i) => (
        <div
          key={p}
          className="process-label"
          style={{ gridRow: i + 1, gridColumn: "1 / -1" }}
        >
          {p}
        </div>
      ))}

      {/* Bloques de ejecución */}
      {schedule.map((block, idx) => (
        <div
          key={idx}
          className="block"
          style={{
            gridRow: processes.indexOf(block.process) + 1,
            gridColumn: `${block.start + 1} / ${block.end + 1}`,
            backgroundColor: `hsl(${(processes.indexOf(block.process) * 60) %
              360}, 70%, 70%)`
          }}
        >
          {block.process}
        </div>
      ))}
    </div>
  );
}

export default GanttChart;
