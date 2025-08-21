// frontend/src/components/TimingPanel.js (VERSIÓN MODIFICADA)
import React, { useState, useEffect } from 'react';

// --- CAMBIO 1: Nuevas props ---
// Ya no recibe 'connection', ahora recibe el retardo actual y una función para guardarlo.
const TimingPanel = ({ initialDelay, onSaveDelay, onClose }) => {
  const [delay, setDelay] = useState(initialDelay);

  // Sincroniza el estado local si la prop inicial cambia
  useEffect(() => {
    setDelay(initialDelay);
  }, [initialDelay]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveDelay(parseInt(delay, 10));
    onClose(); // Cierra el panel después de guardar
  };

  return (
    <div>
      {/* --- CAMBIO 2: Título y propósito actualizados --- */}
      <h2>Configurar Retardo</h2>
      <p>Establece el retardo (en ms) que se usará para las próximas conexiones.</p>
      
      <form onSubmit={handleSubmit} className="login-form">
        <label htmlFor="delay">Retardo por defecto (ms)</label>
        <input
          id="delay"
          type="number"
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
          required
        />
        {/* --- CAMBIO 3: Botón actualizado --- */}
        <button type="submit">Guardar y Cerrar</button>
      </form>
    </div>
  );
};

export default TimingPanel;