// frontend/src/components/ColumnMappingModal.js (CÓDIGO COMPLETO Y CORREGIDO)
import React, { useState } from 'react';
import '../App.css';

const ColumnMappingModal = ({ headers, onConfirm, onCancel }) => {
  // Asignamos valores por defecto de forma más segura, evitando errores si hay menos de 3 columnas
  const [mapping, setMapping] = useState({
    label: headers[0] || '',
    x: headers[1] || '',
    y: headers[2] || '',
    z: '', // 'z' es opcional y empieza vacío
  });

  const handleSelectChange = (e, field) => {
    setMapping({ ...mapping, [field]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validación para evitar duplicados en los campos requeridos
    const requiredValues = [mapping.label, mapping.x, mapping.y];
    if (new Set(requiredValues).size !== requiredValues.length) {
      alert('Por favor, asigna una columna diferente a los campos Label, X, y Y.');
      return;
    }
    onConfirm(mapping);
  };

  const renderSelect = (field, isRequired = true) => (
    <div className="mapping-row">
      <label htmlFor={field}>{field.toUpperCase()}:{isRequired ? '' : ' (Opcional)'}</label>
      <select id={field} value={mapping[field]} onChange={(e) => handleSelectChange(e, field)}>
        {/* Añadimos una opción para "No usar" en campos opcionales */}
        {!isRequired && <option value="">-- No usar --</option>}
        {headers.map((header, index) => (
          <option key={`${header}-${index}`} value={header}>{header}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Mapeo de Columnas CSV</h2>
        <p>Por favor, asigna las columnas de tu archivo a los campos requeridos.</p>
        <form onSubmit={handleSubmit}>
          {renderSelect('label')}
          {renderSelect('x')}
          {renderSelect('y')}
          {/* Indicamos que 'z' no es requerido */}
          {renderSelect('z', false)}
          <div className="modal-actions">
            <button type="button" onClick={onCancel}>Cancelar</button>
            <button type="submit">Confirmar y Subir</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColumnMappingModal;