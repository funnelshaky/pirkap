// frontend/src/components/DrillChart.js (VERSIÓN COMPLETA CON ZOOM)

import React from 'react';
import { Scatter } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { arrowPlugin } from './chartjs-plugin-arrows';
// --- ¡NUEVO! Importamos el plugin de zoom ---
import zoomPlugin from 'chartjs-plugin-zoom';
import 'hammerjs'; // Importamos hammerjs para gestos táctiles

// --- ¡NUEVO! Registramos el plugin de zoom ---
ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, arrowPlugin, zoomPlugin);

const DrillChart = ({ drills, preselectedDrill, onClick, currentTime, highlightedLabels = [] }) => {
  
  const plotData = drills.map(d => ({ x: d.x, y: d.y, id: d.id }));

  const pointStyle = (context) => {
    const pointId = context.raw.id;
    const drill = drills.find(d => d.id === pointId);
    
    let style = {
      radius: 6,
      borderColor: '#555',
      borderWidth: 1,
      backgroundColor: '#8a8f98',
    };

    // Lógica de simulación (si está activa)
    if (currentTime !== undefined && currentTime > 0) {
      if (drill && drill.tiempo <= currentTime) {
        style = { ...style, backgroundColor: '#4f545c' }; // Detonado
      }
      if (drill && Math.abs(drill.tiempo - currentTime) < 10) {
        style = { radius: 12, borderColor: '#ffdd57', borderWidth: 4, backgroundColor: '#fffae1' }; // Chispeo
      }
    }

    // Estilo de iniciador (sobrescribe)
    if (drill && drill.is_initiator) {
      style.backgroundColor = '#e74c3c';
      style.radius = 10;
      style.borderColor = 'white';
      style.borderWidth = 2;
    }

    // Estilo de pre-selección (sobrescribe)
    if (preselectedDrill && pointId === preselectedDrill.id) {
      style.radius = 10;
      style.borderColor = 'white';
      style.borderWidth = 3;
    }

    // Resaltado del histograma (máxima prioridad)
    if (highlightedLabels.includes(drill?.label)) {
      style.radius = 12;
      style.borderColor = '#f1c40f';
      style.borderWidth = 4;
    }

    return style;
  };

  const datasets = [{
      type: 'scatter',
      label: 'Taladros',
      data: plotData,
      radius: (context) => pointStyle(context).radius,
      borderColor: (context) => pointStyle(context).borderColor,
      borderWidth: (context) => pointStyle(context).borderWidth,
      backgroundColor: (context) => pointStyle(context).backgroundColor,
      hoverRadius: (context) => pointStyle(context).radius,
      hoverBorderWidth: (context) => pointStyle(context).borderWidth,
  }];

  const data = { datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const element = elements[0];
        const drillData = data.datasets[element.datasetIndex].data[element.index];
        const clickedDrill = drills.find(d => d.id === drillData.id);
        if (clickedDrill && onClick) {
            onClick(clickedDrill);
        }
      }
    },
    scales: {
      x: { title: { display: true, text: 'Coordenada X' } },
      y: { title: { display: true, text: 'Coordenada Y' } }
    },
    plugins: {
      arrowPlugin: { drills: drills },
      tooltip: {
        callbacks: {
          label: function(context) {
            const point = context.raw;
            const drill = drills.find(d => d.x === point.x && d.y === point.y);
            return drill ? `${drill.label}: (${drill.x}, ${drill.y}) - ${drill.tiempo}ms` : '';
          }
        }
      },
      legend: {
        display: false
      },
      // --- ¡NUEVO! Configuración del plugin de zoom ---
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy', // Permite mover la gráfica en cualquier dirección
          threshold: 5, // Píxeles a mover antes de que empiece el paneo
        },
        zoom: {
          wheel: {
            enabled: true, // Permite hacer zoom con la rueda del ratón
          },
          pinch: {
            enabled: true // Permite hacer zoom con los dedos en pantallas táctiles
          },
          mode: 'xy', // Permite hacer zoom en ambos ejes
        }
      }
    }
  };

  return <Scatter options={options} data={data} />;
};

export default DrillChart;