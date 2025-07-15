import React, { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import QueryResults from './components/QueryResults';
import LoadingSpinner from './components/LoadingSpinner';
import './index.css';

function App() {
  const [currentQuery, setCurrentQuery] = useState(null);
  const [queryResults, setQueryResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleQuery = async (queryType) => {
    setLoading(true);
    setError(null);
    setCurrentQuery(queryType);
    
    try {
      const response = await fetch(`/api/query/${queryType}`);
      if (!response.ok) {
        throw new Error('Error al realizar la consulta');
      }
      
      const data = await response.json();
      setQueryResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetQuery = () => {
    setCurrentQuery(null);
    setQueryResults(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="animate-fade-in">
          {!currentQuery ? (
            <Dashboard onQuery={handleQuery} />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Resultados de la Agenda
                </h2>
                <button
                  onClick={resetQuery}
                  className="btn-secondary"
                >
                  ← Volver al Dashboard
                </button>
              </div>
              
              {loading && <LoadingSpinner />}
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-800 font-medium">Error: {error}</span>
                  </div>
                </div>
              )}
              
              {queryResults && !loading && (
                <QueryResults 
                  data={queryResults} 
                  queryType={currentQuery} 
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App; 