// frontend/src/components/TimingAnalysisChart.js
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registramos los componentes necesarios para una gráfica de líneas
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TimingAnalysisChart = ({ analysisData }) => {
  const data = {
    labels: analysisData.map(p => p.time.toFixed(0)), // Eje X: Tiempo
    datasets: [
      {
        label: 'Energía de Detonación Acumulada',
        data: analysisData.map(p => p.energy), // Eje Y: Energía
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        fill: true,
        pointRadius: 0, // No queremos ver los puntos individuales
        tension: 0.4, // Suaviza la línea
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Análisis de Interferencia de Tiempos',
      },
    },
    scales: {
        x: {
            title: {
                display: true,
                text: 'Tiempo (ms)'
            }
        },
        y: {
            title: {
                display: true,
                text: 'Energía Relativa'
            },
            beginAtZero: true
        }
    }
  };

  return <Line options={options} data={data} />;
};

export default TimingAnalysisChart;