// frontend/src/components/SimulationControls.js
import React from 'react';

const SimulationControls = ({ maxTime, currentTime, onTimeChange, onPlay, onPause, onReset, isPlaying }) => {
  return (
    <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#3a404a', borderRadius: '8px' }}>
      <h4>Simulador de Detonación</h4>
      <input
        type="range"
        min="0"
        max={maxTime}
        value={currentTime}
        onChange={(e) => onTimeChange(Number(e.target.value))}
        style={{ width: '80%' }}
      />
      <span style={{ marginLeft: '10px' }}>{currentTime.toFixed(0)} ms</span>
      <div style={{ marginTop: '10px' }}>
        <button onClick={onPlay} disabled={isPlaying}>Play</button>
        <button onClick={onPause} disabled={!isPlaying} style={{ marginLeft: '10px' }}>Pause</button>
        <button onClick={onReset} style={{ marginLeft: '10px' }}>Reset</button>
      </div>
    </div>
  );
};

export default SimulationControls;