// frontend/src/components/FileUpload.js (VERSIÓN MODIFICADA)
import React, { useState } from 'react';
import useApi from '../hooks/useApi';
import Papa from 'papaparse';
import ColumnMappingModal from './ColumnMappingModal'; // ¡Importamos el nuevo modal!

function FileUpload({ projectId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const api = useApi();

  // Nuevos estados para el modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    // Leemos los encabezados del archivo para el modal
    Papa.parse(selectedFile, {
      header: false,
      preview: 1, // Solo la primera fila
      complete: (results) => {
        setCsvHeaders(results.data[0]);
        setIsModalOpen(true);
      }
    });
  };

  const handleConfirmMapping = async (mapping) => {
    setIsModalOpen(false);
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    // ¡Añadimos el mapeo al FormData!
    formData.append('mapping', JSON.stringify(mapping));

    setUploading(true);
    setError('');

    try {
      const response = await api.post(`/api/projects/${projectId}/upload-csv/`, formData, {
        headers: {
          // El Content-Type lo pone el navegador automáticamente para multipart/form-data
        },
      });
      onUploadSuccess(response.data.drills);
    } catch (err) {
      setError('Error al subir el archivo. Revisa el mapeo y el formato del CSV.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelMapping = () => {
    setIsModalOpen(false);
    setFile(null);
    // Limpiamos el input para que se pueda seleccionar el mismo archivo de nuevo
    document.getElementById('csv-input').value = '';
  };

  return (
    <>
      {isModalOpen && (
        <ColumnMappingModal 
          headers={csvHeaders}
          onConfirm={handleConfirmMapping}
          onCancel={handleCancelMapping}
        />
      )}
      <form className="login-form" style={{ marginTop: '20px' }}>
        <h3>Cargar Datos de Taladros</h3>
        <input id="csv-input" type="file" onChange={handleFileChange} accept=".csv" />
        <button type="button" disabled={uploading} onClick={() => document.getElementById('csv-input').click()}>
          {uploading ? 'Subiendo...' : 'Seleccionar CSV'}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </>
  );
}

export default FileUpload;