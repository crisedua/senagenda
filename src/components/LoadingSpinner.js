import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-senate-blue rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-senate-light rounded-full animate-spin animation-delay-150"></div>
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Procesando agenda...
        </h3>
        <p className="text-gray-600">
          Obteniendo información del Senado de Chile
        </p>
      </div>
      
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-senate-blue rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-senate-blue rounded-full animate-pulse animation-delay-75"></div>
        <div className="w-2 h-2 bg-senate-blue rounded-full animate-pulse animation-delay-150"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner; 