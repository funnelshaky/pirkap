// frontend/src/components/CouplingChart.js

import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registramos todos los componentes que necesita una gráfica de barras
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CouplingChart = ({ histogramData, onHover }) => {
  const data = {
    // El eje X son los tiempos únicos
    labels: histogramData.map(bin => `${bin.time} ms`),
    datasets: [
      {
        label: 'Número de Taladros (Frecuencia)',
        // El eje Y es la cantidad de taladros en ese tiempo
        data: histogramData.map(bin => bin.frequency),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    
    // --- ¡CAMBIO CLAVE! ---
    // Cambiamos el evento de 'onHover' a 'onClick' para una interacción más intencionada
    onClick: (event, chartElement) => {
      if (chartElement.length > 0) {
        const index = chartElement[0].index;
        const labels = histogramData[index].drill_labels;
        onHover(labels); // La prop se sigue llamando onHover, pero ahora se activa con un clic
      }
    },
    // --------------------

    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Histograma de Frecuencia de Tiempos',
        color: 'white',
        font: { size: 16 }
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Tiempo de Detonación (ms)',
          color: '#ccc'
        },
        ticks: { color: '#ccc' }
      },
      y: {
        title: {
          display: true,
          text: 'Frecuencia (Nº de Taladros)',
          color: '#ccc'
        },
        ticks: {
          color: '#ccc',
          stepSize: 1 // Asegura que el eje Y vaya de 1 en 1
        },
        beginAtZero: true
      },
    },
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <Bar options={options} data={data} />
    </div>
  );
};

export default CouplingChart;