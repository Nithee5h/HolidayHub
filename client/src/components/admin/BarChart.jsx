import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { niceMax } from './chartScale';

const W = 600;
const H = 240;
const M = { top: 12, right: 8, bottom: 28, left: 56 };

/** Path for a bar with 4px rounded top corners, square at the baseline. */
function barPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * Single-series vertical bar chart (one hue, one axis). Hover/focus shows a
 * tooltip; a data table is available for screen readers and on request.
 */
export default function BarChart({ data, title, formatValue = (v) => v.toLocaleString('en-IN'), formatTick = formatValue }) {
  const uid = useId();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const band = innerW / data.length;
  const barW = Math.min(44, band * 0.56);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const y = (v) => M.top + innerH - (v / max) * innerH;
  const empty = data.every((d) => d.value === 0);

  return (
    <figure className="chart" aria-labelledby={`${uid}-title`}>
      <figcaption id={`${uid}-title`} className="visually-hidden">
        {title}
      </figcaption>
      {empty ? (
        <p className="chart__empty">No paid bookings in this period yet.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} — bar chart; data table follows`}>
          <g className="chart__grid" aria-hidden="true">
            {ticks.map((t) => (
              <line key={t} x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            ))}
          </g>
          <g className="chart__axis" aria-hidden="true">
            {ticks.map((t) => (
              <text key={t} x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {formatTick(t)}
              </text>
            ))}
            {data.map((d, i) => (
              <text key={d.label} x={M.left + band * i + band / 2} y={H - 8} textAnchor="middle">
                {d.label}
              </text>
            ))}
          </g>
          {data.map((d, i) => {
            const x = M.left + band * i + (band - barW) / 2;
            const h = (d.value / max) * innerH;
            return (
              <g key={d.label}>
                {h > 0 && (
                  <motion.path
                    className={`chart__bar ${active !== null && active !== i ? 'is-dim' : ''}`}
                    d={barPath(x, y(d.value), barW, h)}
                    style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
                    initial={reduce ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                {/* Hit target: the full column, larger than the mark; focusable for keyboard users. */}
                <rect
                  className="chart__hit"
                  x={M.left + band * i}
                  y={M.top}
                  width={band}
                  height={innerH}
                  tabIndex={0}
                  aria-label={`${d.label}: ${d.detail ?? formatValue(d.value)}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {active !== null && !empty && (
        <div className="chart__tooltip" style={{ left: `${((M.left + band * active + band / 2) / W) * 100}%`, top: `${(y(data[active].value) / H) * 100}%` }} aria-hidden="true">
          <strong>{data[active].label}</strong>
          {data[active].detail ?? formatValue(data[active].value)}
        </div>
      )}
      <button type="button" className="chart__toggle" aria-expanded={showTable} aria-controls={`${uid}-table`} onClick={() => setShowTable((s) => !s)}>
        {showTable ? 'Hide table' : 'View as table'}
      </button>
      <div id={`${uid}-table`} className={showTable ? 'chart__table table-responsive' : 'visually-hidden'}>
        <table className="table table-sm mb-0">
          <caption className="visually-hidden">{title}</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <th scope="row">{d.label}</th>
                <td>{d.detail ?? formatValue(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
