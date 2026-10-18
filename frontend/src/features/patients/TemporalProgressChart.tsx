import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const numberFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

export type TemporalChartPoint = {
  fecha: string
  valor: number
  fechaCompleta: string
}

export function TemporalProgressChart({ data }: { data: TemporalChartPoint[] }) {
  return (
    <>
      <figure aria-labelledby="temporal-chart-caption" className="m-0">
        <figcaption id="temporal-chart-caption" className="sr-only">Gráfica de puntaje promedio por fecha</figcaption>
        <div aria-hidden="true" className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#E9E1F2" strokeDasharray="4 4" />
              <XAxis dataKey="fecha" tick={{ fill: '#574C65', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#574C65', fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${numberFormat.format(Number(value))}%`, 'Puntaje']} />
              <Line type="monotone" dataKey="valor" name="Puntaje" stroke="#6D28D9" strokeWidth={2.5} dot={{ r: 4, fill: '#6D28D9' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <div className="sr-only">
        <table>
          <caption>Evolución de puntajes por fecha</caption>
          <thead><tr><th>Fecha</th><th>Puntaje</th></tr></thead>
          <tbody>{data.map((point) => <tr key={point.fechaCompleta}><td>{point.fechaCompleta || '—'}</td><td>{numberFormat.format(point.valor)}%</td></tr>)}</tbody>
        </table>
      </div>
    </>
  )
}
