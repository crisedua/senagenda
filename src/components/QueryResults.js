import React from 'react';

const QueryResults = ({ data, queryType }) => {
  const getQueryTitle = (type) => {
    switch (type) {
      case 'citaciones':
        return 'Citaciones de Comisiones';
      case 'sesiones':
        return 'Tabla de Sesiones';
      case 'calendario':
        return 'Calendario Semanal';
      default:
        return 'Resultados';
    }
  };

  const getQueryIcon = (type) => {
    switch (type) {
      case 'citaciones':
        return '🏛';
      case 'sesiones':
        return '⏰';
      case 'calendario':
        return '📅';
      default:
        return '📄';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    try {
      return new Date(dateString).toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const renderContent = () => {
    if (!data || !data.content) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No se encontraron datos para mostrar.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Información procesada por IA */}
        {data.summary && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Resumen Procesado por IA
            </h3>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {data.summary}
              </p>
            </div>
          </div>
        )}

        {/* Contenido extraído */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
            </svg>
            Información Extraída
          </h3>
          
          {Array.isArray(data.content) ? (
            <div className="space-y-4">
              {data.content.map((item, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="space-y-2">
                    {item.title && (
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                    )}
                    {item.date && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Fecha:</span> {formatDate(item.date)}
                      </p>
                    )}
                    {item.time && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Hora:</span> {item.time}
                      </p>
                    )}
                    {item.location && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Lugar:</span> {item.location}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-gray-700">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="prose max-w-none">
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {data.content}
              </div>
            </div>
          )}
        </div>

        {/* Metadatos */}
        <div className="card p-6 bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Información de la Agenda
            </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-900">Fuente:</span>
              <p className="text-gray-600">{data.source || 'Senado de Chile'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Consultado:</span>
              <p className="text-gray-600">
                {data.timestamp ? formatDate(data.timestamp) : 'Ahora'}
              </p>
            </div>
            {data.url && (
              <div className="md:col-span-2">
                <span className="font-medium text-gray-900">URL de origen:</span>
                <a 
                  href={data.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-senate-blue hover:text-senate-dark underline ml-2"
                >
                  {data.url}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-6xl">{getQueryIcon(queryType)}</div>
        <h2 className="text-3xl font-bold text-gray-900">
          {getQueryTitle(queryType)}
        </h2>
        <p className="text-gray-600">
          Información actualizada del Senado de Chile
        </p>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default QueryResults; 