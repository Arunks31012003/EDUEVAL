import React from 'react';
import { useNavigate } from 'react-router-dom';


const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center">
        <center>
          <h1 className="text-7xl md:text-9xl font-extrabold text-red-600 animate-pulse mb-4">404</h1>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Page Not Found</h2>
          <p className="text-lg mb-6 max-w-sm">
            Oops! The page you are looking for does not exist. It might have been moved or deleted.
          </p>
        </center>
        <center>
          <button
            onClick={() => navigate('/')}
            className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800"
          >
            <span className="relative px-5 py-2.5 transition-all ease-in -login- bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
              Go to Home Page
            </span>

          </button>
        </center>
      </div>
    </div>
  );
};

export default NotFoundPage;
