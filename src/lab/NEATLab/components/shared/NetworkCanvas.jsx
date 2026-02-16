import { useEffect, useMemo, useRef, useState } from "react";

function nodeTypeRank(type) {
  if (type === "input") return 0;
  if (type === "hidden") return 1;
  if (type === "output") return 2;
  return 3;
}

function computeNodeLayers(genome) {
  if (!genome || !Array.isArray(genome.nodes) || !genome.nodes.length) return [];

  const nodes = [...genome.nodes].sort((a, b) => a.id - b.id);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const enabledConnections = (genome.connections || []).filter(
    (conn) => conn.enabled !== false && nodeById.has(conn.fromNode) && nodeById.has(conn.toNode)
  );

  const depth = new Map();
  nodes.forEach((node) => {
    depth.set(node.id, node.type === "input" ? 0 : 1);
  });

  for (let pass = 0; pass < nodes.length + 2; pass += 1) {
    enabledConnections.forEach((conn) => {
      const fromDepth = depth.get(conn.fromNode) ?? 0;
      const current = depth.get(conn.toNode) ?? 1;
      const targetNode = nodeById.get(conn.toNode);
      if (targetNode?.type === "input") return;
      if (fromDepth + 1 > current) {
        depth.set(conn.toNode, fromDepth + 1);
      }
    });
  }

  const maxHiddenDepth = nodes
    .filter((node) => node.type !== "output")
    .reduce((max, node) => Math.max(max, depth.get(node.id) ?? 0), 0);

  nodes.forEach((node) => {
    if (node.type === "output") depth.set(node.id, maxHiddenDepth + 1);
  });

  const grouped = new Map();
  nodes.forEach((node) => {
    const layer = depth.get(node.id) ?? 0;
    if (!grouped.has(layer)) grouped.set(layer, []);
    grouped.get(layer).push(node);
  });

  return [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, layerNodes]) =>
      layerNodes.sort((a, b) => {
        const typeDiff = nodeTypeRank(a.type) - nodeTypeRank(b.type);
        if (typeDiff !== 0) return typeDiff;
        return a.id - b.id;
      })
    );
}

function drawNetwork(ctx, genome, width, height, activeValues = {}) {
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "rgba(8, 17, 36, 0.96)");
  bg.addColorStop(1, "rgba(3, 9, 23, 0.95)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (!genome || !Array.isArray(genome.nodes) || !genome.nodes.length) {
    ctx.fillStyle = "#64748b";
    ctx.font = "14px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No genome selected", width / 2, height / 2);
    return;
  }

  const layers = computeNodeLayers(genome);
  const positions = {};

  layers.forEach((layerNodes, layerIndex) => {
    const x = (width / (layers.length + 1)) * (layerIndex + 1);
    layerNodes.forEach((node, nodeIndex) => {
      const y = (height / (layerNodes.length + 1)) * (nodeIndex + 1);
      positions[node.id] = { x, y };
    });
  });

  (genome.connections || [])
    .filter((conn) => conn.enabled !== false)
    .forEach((conn) => {
      const from = positions[conn.fromNode];
      const to = positions[conn.toNode];
      if (!from || !to) return;

      const weight = Number(conn.weight || 0);
      const isPositive = weight >= 0;
      const thickness = Math.min(Math.abs(weight) * 1.3 + 0.5, 5);
      const alpha = Math.min(Math.abs(weight) / 3 + 0.16, 0.95);

      ctx.strokeStyle = isPositive
        ? `rgba(59,130,246,${alpha})`
        : `rgba(239,68,68,${alpha})`;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      const dirX = to.x - from.x;
      const dirY = to.y - from.y;
      const len = Math.hypot(dirX, dirY) || 1;
      const ux = dirX / len;
      const uy = dirY / len;
      const tipX = to.x - ux * 11;
      const tipY = to.y - uy * 11;

      ctx.fillStyle = isPositive
        ? `rgba(147,197,253,${Math.min(alpha + 0.08, 1)})`
        : `rgba(252,165,165,${Math.min(alpha + 0.08, 1)})`;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - uy * 4 - ux * 6, tipY + ux * 4 - uy * 6);
      ctx.lineTo(tipX + uy * 4 - ux * 6, tipY - ux * 4 - uy * 6);
      ctx.closePath();
      ctx.fill();
    });

  const colors = {
    input: "#3b82f6",
    hidden: "#8b5cf6",
    output: "#10b981"
  };

  genome.nodes.forEach((node) => {
    const pos = positions[node.id];
    if (!pos) return;

    const activation = Number(activeValues?.[node.id] ?? 0);
    const glow = Math.abs(activation);
    const radius = node.type === "hidden" ? 11 : 14;

    if (glow > 0.25) {
      ctx.shadowColor = colors[node.type] || "#64748b";
      ctx.shadowBlur = Math.min(24, glow * 22);
    }

    ctx.fillStyle = colors[node.type] || "#64748b";
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(226,232,240,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "10px 'JetBrains Mono', Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(node.id), pos.x, pos.y);
  });
}

export default function NetworkCanvas({
  genome,
  activeValues = {},
  className = "",
  minHeight = 300
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const target = containerRef.current;
    if (!target) return undefined;

    const update = () => {
      const rect = target.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height))
      });
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const stableValues = useMemo(() => activeValues || {}, [activeValues]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.width || !size.height) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawNetwork(ctx, genome, size.width, size.height, stableValues);
  }, [genome, size.height, size.width, stableValues]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight }}
    >
      <canvas ref={canvasRef} className="neat-canvas" />
    </div>
  );
}
