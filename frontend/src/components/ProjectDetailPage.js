// frontend/src/components/ProjectDetailPage.js (VERSIÓN COMPLETA Y CORREGIDA)

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import useApi from '../hooks/useApi';
import DrillChart from './DrillChart';
import FileUpload from './FileUpload';
import TimingPanel from './TimingPanel';
import TimingAnalysisChart from './TimingAnalysisChart';
import ReliefMapChart from './ReliefMapChart';
import CouplingChart from './CouplingChart';
import SimulationControls from './SimulationControls';
import '../App.css';

function ProjectDetailPage() {
  const { projectId } = useParams();
  const api = useApi();
  const [project, setProject] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [reliefData, setReliefData] = useState(null);
  const [histogramData, setHistogramData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [preselectedDrill, setPreselectedDrill] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [initiatorMode, setInitiatorMode] = useState(false);
  const [highlightedLabels, setHighlightedLabels] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  // Nuevo estado para el retardo continuo
  const [currentDelay, setCurrentDelay] = useState(17);

  const maxTime = project ? Math.max(...project.drills.map(d => d.tiempo), 0) + 50 : 100;

  const handleTimeChange = (newTime) => {
    if (isPlaying) handlePause();
    setCurrentTime(newTime);
  };

  const handlePlay = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setCurrentTime(prevTime => {
        const nextTime = prevTime + (maxTime / 200);
        if (nextTime >= maxTime) {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          return maxTime;
        }
        return nextTime;
      });
    }, 20);
  };

  const handlePause = () => {
    setIsPlaying(false);
    clearInterval(intervalRef.current);
  };

  const handleReset = () => {
    setIsPlaying(false);
    clearInterval(intervalRef.current);
    setCurrentTime(0);
  };

  const fetchProjectData = useCallback(async () => {
    try {
      const [projectResponse, analysisResponse, reliefResponse, histogramResponse] = await Promise.all([
        api.get(`/api/projects/${projectId}`),
        api.get(`/api/projects/${projectId}/timing-analysis`),
        api.get(`/api/projects/${projectId}/relief-analysis`),
        api.get(`/api/projects/${projectId}/timing-histogram`)
      ]);
      setProject(projectResponse.data);
      setAnalysisData(analysisResponse.data.data);
      setReliefData(reliefResponse.data.data);
      setHistogramData(histogramResponse.data.data);
    } catch (err) {
      setError('No se pudo cargar el proyecto y su análisis.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, api]);

  useEffect(() => {
    fetchProjectData();
    return () => clearInterval(intervalRef.current);
  }, [fetchProjectData]);

  const handleSetInitiator = async (drill) => {
      let startTime = 0; // Valor por defecto

      if (drill.is_initiator) {
          // Si ya es un iniciador, preguntamos si quiere eliminarlo
          const confirmRemove = window.confirm(`El taladro ${drill.label} ya es un iniciador. ¿Deseas quitarlo?`);
          if (confirmRemove) {
              startTime = -1; // Enviamos -1 para que el backend lo desactive
          } else {
              setInitiatorMode(false); // Si cancela, salimos del modo
              return;
          }
      } else {
          // Si no es un iniciador, pedimos el tiempo de inicio como antes
          const startTimeInput = prompt("Introduce el tiempo de inicio en ms para este taladro:", "0");
          if (startTimeInput === null) {
              setInitiatorMode(false);
              return;
          }
          const parsedTime = parseInt(startTimeInput, 10);
          if (isNaN(parsedTime)) {
              alert("Por favor, introduce un número válido.");
              return;
          }
          startTime = parsedTime;
      }

      try {
          // --- ¡ESTA ES LA PARTE CLAVE! ---
          // Enviamos los datos en el CUERPO de la petición, no en la URL.
          const response = await api.post(
              `/api/projects/${projectId}/set-initiator/${drill.id}`, 
              { delay_ms: startTime, mode: 'initiator' } // <--- El cuerpo JSON
          );
          setProject(response.data);
      } catch (err) {
          alert("Error al modificar el iniciador.");
          console.error("Error en set-initiator:", err.response); // Añadimos un log más detallado
      }
      
      setInitiatorMode(false);
  };


  const handleDrillClick = (clickedDrill) => {
    if (initiatorMode) {
      handleSetInitiator(clickedDrill);
      return;
    }
    const existingTargets = new Set(project.drills.flatMap(d => d.sequences_from.map(link => link.to_drill_id)));
    
    if (!preselectedDrill) {
      setPreselectedDrill(clickedDrill);
      setIsPanelOpen(false);
    } else {
      if (preselectedDrill.id === clickedDrill.id) {
        setPreselectedDrill(null);
        return;
      }
      if (existingTargets.has(clickedDrill.id)) {
        alert("Este taladro ya es el destino de otra secuencia. No se puede conectar.");
        setPreselectedDrill(null);
        return;
      }
      
      handleApplyTiming({
        from_drill_id: preselectedDrill.id,
        to_drill_id: clickedDrill.id,
        delay_ms: currentDelay,
        mode: 'single',
      });
    }
  };

  const handleUploadSuccess = async () => {
    await fetchProjectData();
    handleReset();
  };

  const handleApplyTiming = async (timingData) => {
      try {
        const { from_drill_id, to_drill_id, delay_ms, mode } = timingData;
        const response = await api.post(`/api/projects/${projectId}/apply-sequence/${from_drill_id}/${to_drill_id}`, { delay_ms, mode });
        
        // Actualizamos el estado local con la respuesta inmediata para la malla
        setProject(response.data); 
        
        // --- ¡AÑADE ESTA LÍNEA DE NUEVO! ---
        // Volvemos a pedir todos los datos de análisis para que las otras pestañas se actualicen.
        await fetchProjectData();

        const nextPreselectedDrill = response.data.drills.find(d => d.id === to_drill_id);
        setPreselectedDrill(nextPreselectedDrill || null);
      } catch (err) {
        alert(err.response?.data?.detail || "Error al aplicar los tiempos.");
      }
  };

  const handleUndo = async () => {
      try {
        const response = await api.post(`/api/projects/${projectId}/undo-last-sequence`);
        // Actualizamos el estado de la malla con la respuesta inmediata
        setProject(response.data);
        // --- ¡ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ AQUÍ! ---
        // Volvemos a pedir todos los datos para que el simulador y los análisis se sincronicen.
        await fetchProjectData();
      } catch (err) {
        alert(err.response?.data?.detail || "Error al deshacer.");
      }
  };

  const handleSaveDelay = (newDelay) => {
    setCurrentDelay(newDelay);
    alert(`Retardo por defecto actualizado a ${newDelay} ms.`);
  };

  if (loading) return <div className="App">Cargando proyecto...</div>;
  if (error) return <div className="App" style={{ color: 'red' }}>{error}</div>;

  return (
    <div className="project-detail-page">
      <div className="project-header">
        <h1>Proyecto: {project?.name}</h1>
        <Link to="/dashboard">← Volver al Dashboard</Link>
      </div>

      <Tabs className="main-tabs" forceRenderTabPanel={true}>
        <TabList>
          <Tab>Diseño de Malla</Tab>
          <Tab>Análisis de Tiempos</Tab>
          <Tab>Mapa de Relief</Tab>
          <Tab>Análisis de Acoples</Tab>
        </TabList>

        <TabPanel>
          <div className="design-view-container">
            <div className="chart-area-main">
              <div style={{ height: '100%', position: 'relative' }}>
                {project?.drills && project.drills.length > 0 ? (
                  <>
                    <DrillChart 
                      drills={project.drills} 
                      preselectedDrill={preselectedDrill} 
                      onClick={handleDrillClick} 
                      highlightedLabels={highlightedLabels}
                      currentTime={currentTime}
                    />
                    <p style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                      Usa la rueda del ratón para hacer zoom. Arrastra para mover la vista.
                    </p>
                  </>
                ) : (
                  <FileUpload projectId={projectId} onUploadSuccess={handleUploadSuccess} />
                )}
              </div>
            </div>
            <div className={`tools-panel ${isPanelOpen ? 'open' : ''}`}>
              <TimingPanel 
                initialDelay={currentDelay} 
                onSaveDelay={handleSaveDelay}
                onClose={() => setIsPanelOpen(false)}
              />
            </div>
          </div>
          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <button onClick={() => setInitiatorMode(!initiatorMode)} style={{ backgroundColor: initiatorMode ? '#ffdd57' : '#4f545c', color: initiatorMode ? 'black' : 'white', border: '1px solid #6c757d', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer' }}>
              {initiatorMode ? 'Selecciona un Taladro...' : 'Modificar Inicios'}
            </button>
            <button onClick={() => setIsPanelOpen(true)} style={{ marginLeft: '10px' }}>
              Configurar Retardo ({currentDelay} ms)
            </button>
            <button onClick={handleUndo} style={{ marginLeft: '10px' }}>
              Deshacer Última Conexión
            </button>
          </div>
          {project?.drills && project.drills.length > 0 && (
            <SimulationControls
              maxTime={maxTime}
              currentTime={currentTime}
              onTimeChange={handleTimeChange}
              onPlay={handlePlay}
              onPause={handlePause}
              onReset={handleReset}
              isPlaying={isPlaying}
            />
          )}
        </TabPanel>

        <TabPanel>
          <div className="analysis-panel">
            {analysisData && analysisData.length > 0 ? ( <TimingAnalysisChart analysisData={analysisData} /> ) : ( <p>No hay datos suficientes.</p> )}
          </div>
        </TabPanel>
        
        <TabPanel>
            <div className="analysis-panel">
                <h2>Mapa de Calor de Velocidad de Alivio (Relief)</h2>
                {reliefData && reliefData.length > 0 ? ( <ReliefMapChart reliefData={reliefData} /> ) : ( <p>No hay secuencias definidas para analizar.</p> )}
            </div>
        </TabPanel>

        <TabPanel>
            <div className="analysis-panel">
                <h2>Análisis de Acoplamiento de Tiempos</h2>
                <p>Haz clic en una barra para resaltar los taladros correspondientes en la pestaña "Diseño de Malla".</p>
                <button onClick={() => setHighlightedLabels([])} style={{ marginBottom: '15px' }} disabled={highlightedLabels.length === 0}>
                  Limpiar Resaltado
                </button>
                {histogramData && histogramData.length > 0 ? (
                  <CouplingChart histogramData={histogramData} onHover={setHighlightedLabels} />
                ) : (
                  <p>No hay datos de tiempos para analizar.</p>
                )}
            </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}

export default ProjectDetailPage;