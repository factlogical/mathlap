import React from "react";

export default function SplitView({ left, right, leftClassName = "", rightClassName = "" }) {
  return (
    <div className="topology-split-container">
      <section className={`topology-pane topology-pane-2d ${leftClassName}`.trim()}>{left}</section>
      <section className={`topology-pane topology-pane-3d ${rightClassName}`.trim()}>{right}</section>
    </div>
  );
}
