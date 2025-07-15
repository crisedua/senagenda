import React from 'react';

const QueryButton = ({ query, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="card p-6 text-left w-full hover:scale-105 transition-all duration-300 group"
    >
      <div className="flex items-start space-x-4">
        <div className="text-4xl">{query.icon}</div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-senate-blue transition-colors">
            {query.title}
          </h3>
          <p className="text-gray-600 mt-2 leading-relaxed">
            {query.description}
          </p>
          <div className="mt-4 flex items-center text-senate-blue font-medium">
            <span>Realizar consulta</span>
            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
};

export default QueryButton; 