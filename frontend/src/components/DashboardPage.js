// frontend/src/components/DashboardPage.js

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Asegúrate de importar Link
import useApi from '../hooks/useApi'; // Importamos nuestro hook
import '../App.css';

function DashboardPage() {
  const navigate = useNavigate();
  const api = useApi(); // Obtenemos nuestra instancia de axios configurada

  const [projects, setProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Este useEffect se ejecuta cuando el componente se monta por primera vez
  useEffect(() => {
  const fetchProjects = async () => {
    try {   
    const response = await api.get('/api/projects/');
    setProjects(response.data);
    } catch (err) {
      setError('No se pudieron cargar los proyectos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  fetchProjects();
  }, [api]); // <-- ¡ARRAY DE DEPENDENCIAS VACÍO!

  // Función para manejar la creación de un nuevo proyecto
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return; // No hacer nada si el nombre está vacío

    try {
      const response = await api.post('/api/projects/', { name: newProjectName });
      setProjects([...projects, response.data]); // Añadimos el nuevo proyecto a la lista existente
      setNewProjectName(''); // Limpiamos el campo de texto
    } catch (err) {
      setError('No se pudo crear el proyecto.');
      console.error(err);
    }
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Mientras carga los datos, mostramos un mensaje
  if (loading) {
    return <div className="App">Cargando...</div>;
  }

  return (
    <div className="App">
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <button onClick={handleLogout}>Logout</button>
      </div>
      <h1>Dashboard de Proyectos</h1>
      
      {/* Formulario para crear nuevos proyectos */}
      <form onSubmit={handleCreateProject} className="login-form" style={{ marginBottom: '30px' }}>
        <input
          type="text"
          placeholder="Nombre del nuevo proyecto"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
        />
        <button type="submit">Crear Proyecto</button>
      </form>

      {/* Lista de proyectos existentes */}
      <div className="project-list">
        <h2>Mis Proyectos</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {projects.length > 0 ? (
          <ul>
            {/* --- AQUÍ ESTÁ EL CAMBIO CLAVE --- */}
            {projects.map((project) => (
              <li key={project.id}>
                <Link to={`/project/${project.id}`}>
                  {project.name} (ID: {project.id})
                </Link>
              </li>
            ))}
            {/* ------------------------------------ */}
          </ul>
        ) : (
          <p>Aún no tienes proyectos. ¡Crea uno!</p>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;