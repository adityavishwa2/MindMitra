"use client";
import { Text } from "@/components/translation";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
export function ActivityChart({
  data,
}: {
  data: { date: string; questions: number; correct: number }[];
}) {
  return (
    <div
      className="chart"
      role="img"
      aria-label={`Practice activity: ${data.map((d) => `${d.date}: ${d.questions} answers`).join(", ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--line)"
          />
          <XAxis
            dataKey="date"
            fontSize={9}
            tickFormatter={(v) => v.slice(5)}
          />
          <YAxis fontSize={10} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              borderColor: "var(--line)",
            }}
          />
          <Bar dataKey="questions" fill="#8273ec" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function AccuracyChart({
  data,
}: {
  data: { date: string; questions: number; correct: number }[];
}) {
  return (
    <div
      className="chart"
      role="img"
      aria-label="Daily correct answers as a percentage of recorded answers"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data.map((d) => ({
            ...d,
            accuracy: d.questions
              ? Math.round((d.correct / d.questions) * 100)
              : 0,
          }))}
        >
          <XAxis
            dataKey="date"
            fontSize={9}
            tickFormatter={(v) => v.slice(5)}
          />
          <YAxis domain={[0, 100]} fontSize={10} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="#14b8a6"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function PrintReport() {
  return (
    <button
      className="button secondary no-print"
      onClick={() => window.print()}
    >
      <Text value="Print / save as PDF" />
    </button>
  );
}
