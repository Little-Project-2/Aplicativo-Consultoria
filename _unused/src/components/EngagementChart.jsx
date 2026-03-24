import React from 'react';

function EngagementChart({ total, counts }) {
  const width = 300;
  const height = 120;
  const padding = 18;
  const maxVal = Math.max(...counts, 1);
  const xStep = (width - padding * 2) / (counts.length - 1);
  const yScale = (height - padding * 2) / maxVal;

  const points = counts.map((count, i) => {
    const x = padding + i * xStep;
    const y = height - padding - count * yScale;
    return { x, y, value: count };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']; // Simplificado

  return (
    <div className="engagement-card">
      <div className="engagement-header">
        <div>
          <h3>Engajamento semanal</h3>
          <p className="subtitle">Treinos concluídos nos últimos 7 dias</p>
        </div>
        <div className="engagement-total">
          <span>Total</span>
          <strong>{total}</strong>
        </div>
      </div>
      <div className="engagement-chart">
        <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
          <path className="engagement-area" d={areaPath}></path>
          <path className="engagement-line" d={linePath}></path>
          {points.map((p, i) => (
            <circle key={i} className="engagement-dot" cx={p.x} cy={p.y} r="3"></circle>
          ))}
        </svg>
        <div className="engagement-labels">
          {labels.map((label, i) => (
            <div key={i} className="engagement-label">
              <span>{label}</span>
              <strong>{counts[i] || 0}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EngagementChart;
