import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Point = { fecha: string; fechaCompleta: string; sesiones: number }

export function TrendChart({ data }: { data: Point[] }) {
  return (
    <div aria-hidden="true" className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 18, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9D5FF" />
          <XAxis dataKey="fecha" />
          <YAxis allowDecimals={false} />
          <Tooltip labelFormatter={(_, items) => items[0]?.payload.fechaCompleta || ''} />
          <Line type="monotone" dataKey="sesiones" name="Sesiones" stroke="#6D28D9" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
