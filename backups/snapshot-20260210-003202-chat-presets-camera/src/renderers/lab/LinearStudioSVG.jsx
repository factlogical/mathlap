import React from "react";

const LinearStudioSVG = ({
    matrix, // [ [a, c], [b, d] ] - Column major or matching mathjs output
    gridSize = 6,
    showArea = true
}) => {
    // MathJS matrix is roughly: [[a,b], [c,d]] for rows?
    // Let's assume input is the raw 2x2 array [ [m11, m12], [m21, m22] ]
    // We need to verify the format passed from LinearTransformRenderer.
    // The previous code: const res = math.multiply(currentM, v);
    // If currentM is [[a,b],[c,d]], then [x,y] * M is row-mult? No, M * v is [[ax+by], [cx+dy]].
    // So basis i(1,0) -> [a, c]. basis j(0,1) -> [b, d].

    // Helper to apply matrix
    const apply = (x, y) => {
        if (!matrix) return [x, y];
        // matrix is [[a, b], [c, d]]
        // res[0] = matrix[0][0]*x + matrix[0][1]*y
        // res[1] = matrix[1][0]*x + matrix[1][1]*y
        const nx = matrix[0][0] * x + matrix[0][1] * y;
        const ny = matrix[1][0] * x + matrix[1][1] * y;
        return [nx, ny];
    };

    // Range for grid
    const range = Array.from({ length: gridSize * 2 + 1 }, (_, i) => i - gridSize);

    // SVG ViewBox
    // We want (0,0) in center.
    // Let's say size is 100 logical units? 
    // Grid goes from -gridSize to gridSize.
    const viewBoxSize = gridSize * 2 + 1; // Minimal padding for larger appearance
    const viewBoxStr = `${-viewBoxSize / 2} ${-viewBoxSize / 2} ${viewBoxSize} ${viewBoxSize}`;

    // Colors
    const COLOR_GRID = "#334155"; // More visible grid
    const COLOR_AXIS = "#94a3b8"; // Brighter axis
    const COLOR_I = "#22c55e"; // Green
    const COLOR_J = "#3b82f6"; // Blue
    const COLOR_AREA = "rgba(239, 68, 68, 0.35)"; // More visible red tint
    const COLOR_AREA_STROKE = "#ef4444";

    return (
        <div className="w-full h-full flex items-center justify-center bg-[var(--panel-2)]">
            {/* 
                SVG Coordinate System:
                y is down. We want y up.
                We can use transform="scale(1, -1)" on a group.
            */}
            <svg
                viewBox={viewBoxStr}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full max-w-full max-h-full"
                style={{ overflow: "visible" }}
            >
                <g transform="scale(1, -1)">

                    {/* 1. Static Background Grid (Coordinate System) */}
                    {range.map(i => (
                        <g key={`grid-${i}`}>
                            {/* Vertical x=i */}
                            <line
                                x1={i} y1={-gridSize}
                                x2={i} y2={gridSize}
                                stroke={i === 0 ? COLOR_AXIS : COLOR_GRID}
                                strokeWidth={i === 0 ? 0.1 : 0.04}
                            />
                            {/* Horizontal y=i */}
                            <line
                                x1={-gridSize} y1={i}
                                x2={gridSize} y2={i}
                                stroke={i === 0 ? COLOR_AXIS : COLOR_GRID}
                                strokeWidth={i === 0 ? 0.1 : 0.04}
                            />
                        </g>
                    ))}

                    {/* 2. Transformed Grid (Optional, allows visualizing the warp) 
                        For now, let's just show the Transformed Unit Square and Basis Vectors
                        Maybe Transformed Grid Lines to show linearity?
                        Let's render a few transformed grid lines faintly.
                    */}
                    {range.map(i => {
                        // Transform vertical line x=i
                        const p1 = apply(i, -gridSize);
                        const p2 = apply(i, gridSize);
                        // Transform horizontal line y=i
                        const p3 = apply(-gridSize, i);
                        const p4 = apply(gridSize, i);

                        return (
                            <g key={`t-grid-${i}`} opacity="0.3">
                                <line
                                    x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]}
                                    stroke={COLOR_GRID} strokeWidth={0.02}
                                />
                                <line
                                    x1={p3[0]} y1={p3[1]} x2={p4[0]} y2={p4[1]}
                                    stroke={COLOR_GRID} strokeWidth={0.02}
                                />
                            </g>
                        );
                    })}


                    {/* 3. Unit Square */}
                    {showArea && (
                        <path
                            d={`
                                M ${apply(0, 0)[0]} ${apply(0, 0)[1]}
                                L ${apply(1, 0)[0]} ${apply(1, 0)[1]}
                                L ${apply(1, 1)[0]} ${apply(1, 1)[1]}
                                L ${apply(0, 1)[0]} ${apply(0, 1)[1]}
                                Z
                            `}
                            fill={COLOR_AREA}
                            stroke={COLOR_AREA_STROKE}
                            strokeWidth={0.05}
                        />
                    )}

                    {/* 4. Basis Vectors */}
                    {/* i (1,0) */}
                    <line
                        x1={apply(0, 0)[0]} y1={apply(0, 0)[1]}
                        x2={apply(1, 0)[0]} y2={apply(1, 0)[1]}
                        stroke={COLOR_I} strokeWidth={0.08}
                    />
                    <circle cx={apply(1, 0)[0]} cy={apply(1, 0)[1]} r={0.15} fill={COLOR_I} />

                    {/* j (0,1) */}
                    <line
                        x1={apply(0, 0)[0]} y1={apply(0, 0)[1]}
                        x2={apply(0, 1)[0]} y2={apply(0, 1)[1]}
                        stroke={COLOR_J} strokeWidth={0.08}
                    />
                    <circle cx={apply(0, 1)[0]} cy={apply(0, 1)[1]} r={0.15} fill={COLOR_J} />

                    {/* Origin Dot */}
                    <circle cx={apply(0, 0)[0]} cy={apply(0, 0)[1]} r={0.1} fill="white" />

                </g>
            </svg>
        </div>
    );
};

export default LinearStudioSVG;
