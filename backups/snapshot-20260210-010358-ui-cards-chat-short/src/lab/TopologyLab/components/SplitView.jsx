import React from "react";

export default function SplitView({ left, right }) {
  return (
    <div className="topology-split-container">
      <section className="topology-pane topology-pane-2d">{left}</section>
      <section className="topology-pane topology-pane-3d">{right}</section>
    </div>
  );
}

