// frontend/src/components/ReliefMapChart.js
import React from 'react';
import { Bubble } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

// Función para mapear un valor a un color (azul -> verde -> rojo)
const getColorForValue = (value, min, max) => {
  if (max === min) return 'rgb(100, 255, 100)'; // Verde si todos los valores son iguales
  const ratio = (value - min) / (max - min);
  
  // Interpolación de color: Azul (baja velocidad) -> Verde (media) -> Rojo (alta velocidad)
  let r, g, b;
  if (ratio < 0.5) {
    // De Azul a Verde
    const localRatio = ratio * 2;
    r = 75 * (1 - localRatio);
    g = 192 * (1 - localRatio) + 255 * localRatio;
    b = 192 * (1 - localRatio) + 100 * localRatio;
  } else {
    // De Verde a Rojo
    const localRatio = (ratio - 0.5) * 2;
    r = 255 * localRatio;
    g = 255 * (1 - localRatio) + 99 * localRatio;
    b = 100 * (1 - localRatio);
  }
  return `rgb(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)})`;
};

const ReliefMapChart = ({ reliefData }) => {
  if (!reliefData || reliefData.length === 0) {
    return <p>No hay datos de secuencia para analizar el relief.</p>;
  }

  const velocities = reliefData.map(p => p.relief_velocity);
  const minVelocity = Math.min(...velocities);
  const maxVelocity = Math.max(...velocities);

  const data = {
    datasets: [{
      label: 'Velocidad de Relief (m/ms)',
      data: reliefData.map(p => ({
        x: p.x,
        y: p.y,
        r: 5 + ((p.relief_velocity - minVelocity) / (maxVelocity - minVelocity)) * 15, // Radio de 5 a 20
        v: p.relief_velocity // Guardamos el valor original para el tooltip
      })),
      backgroundColor: reliefData.map(p => getColorForValue(p.relief_velocity, minVelocity, maxVelocity)),
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { title: { display: true, text: 'Coordenada X' } },
      y: { title: { display: true, text: 'Coordenada Y' } }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw.v;
            return `Relief: ${value.toFixed(2)} m/ms`;
          }
        }
      }
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <Bubble options={options} data={data} />
      <div className="color-legend">
        <span>Bajo ({minVelocity.toFixed(2)})</span>
        <div className="gradient-bar"></div>
        <span>Alto ({maxVelocity.toFixed(2)})</span>
      </div>
    </div>
  );
};

export default ReliefMapChart;