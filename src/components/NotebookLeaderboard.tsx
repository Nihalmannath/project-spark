import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { NOTEBOOKS } from "../data/notebooks";

/**
 * Macro-F1 leaderboard across notebooks. Visual centerpiece for the
 * comparison page and a teaser block on the overview.
 */
export function NotebookLeaderboard({ height = 280 }: { height?: number }) {
  const data = NOTEBOOKS
    .map((n) => ({
      id: n.number,
      label: `${n.number}`,
      macroF1: n.metrics.macroF1,
      headline: n.isHeadline,
    }))
    .sort((a, b) => b.macroF1 - a.macroF1);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: 8, bottom: 8 }}>
        <XAxis
          type="number" domain={[0, 0.8]}
          stroke="#8e9db1"
          tick={{ fontFamily: "Roboto Mono", fontSize: 10, fill: "#465468" }}
          axisLine={{ stroke: "#8e9db1" }}
          tickLine={false}
        />
        <YAxis
          type="category" dataKey="label" width={48}
          stroke="#8e9db1"
          tick={{ fontFamily: "Roboto Mono", fontSize: 11, fill: "#1a1a1a" }}
          axisLine={false} tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "#eee9df" }}
          contentStyle={{
            background: "#ffffff", border: "1px solid #d8d2c4",
            borderRadius: 4, fontFamily: "Roboto Mono", fontSize: 11,
          }}
          formatter={(v: number) => v.toFixed(3)}
        />
        <Bar dataKey="macroF1" radius={[0, 2, 2, 0]} label={{
          position: "right", fontFamily: "Roboto Mono", fontSize: 10, fill: "#1a1a1a",
          formatter: (v: number) => v.toFixed(3),
        }}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.headline ? "#ffc000" : "#3d5a80"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
