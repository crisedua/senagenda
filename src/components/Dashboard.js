import React from 'react';
import QueryButton from './QueryButton';

const Dashboard = ({ onQuery }) => {
  const queries = [
    {
      id: 'citaciones',
      icon: '🏛',
      title: 'Citaciones de Comisiones',
      description: 'Consulta las citaciones de comisiones programadas para esta semana',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      id: 'sesiones',
      icon: '⏰',
      title: 'Tabla de Sesiones',
      description: 'Revisa la tabla de sesiones actual del Senado',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      id: 'calendario',
      icon: '📅',
      title: 'Calendario Semanal',
      description: 'Consulta el calendario de actividades de esta semana',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-gray-900 animate-slide-up">
          Consultas Legislativas
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto animate-slide-up">
          Accede a información actualizada sobre la actividad legislativa del Senado de Chile
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Información Oficial</h3>
          <p className="text-gray-600">Datos directos del sitio web del Senado</p>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Actualizado</h3>
          <p className="text-gray-600">Información procesada en tiempo real</p>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Procesado por IA</h3>
          <p className="text-gray-600">Análisis inteligente de la información</p>
        </div>
      </div>

      {/* Query Buttons */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-900 text-center">
          Selecciona una consulta
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {queries.map((query) => (
            <QueryButton
              key={query.id}
              query={query}
              onClick={() => onQuery(query.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-100 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center space-x-2 text-gray-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>Los datos se obtienen directamente del sitio web oficial del Senado de Chile</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 