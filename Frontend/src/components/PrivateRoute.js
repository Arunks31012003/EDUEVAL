// src/components/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

// Changed 'role' to 'allowedRoles' and made it an array
const PrivateRoute = ({ element: Element, roles: allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user'));

  // Log for debugging: Check user status and role
  console.log('PrivateRoute (V3): Checking access...');
  console.log('PrivateRoute (V3): User in localStorage:', user);
  console.log('PrivateRoute (V3): Allowed roles for this route:', allowedRoles);

  if (!user) {
    console.log('PrivateRoute (V3): No user found in localStorage. Redirecting to /login.');
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is provided, check if the user's role is among them
  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      console.log(`PrivateRoute (V3): User role '${user.role}' not in allowed roles [${allowedRoles.join(', ')}]. Redirecting to /login.`);
      // If the user's role is not in the allowed list, redirect to login
      return <Navigate to="/login" replace />;
    }
    console.log(`PrivateRoute (V3): User role '${user.role}' is authorized. Proceeding.`);
  } else {
    // If no specific roles are required, just check if user is logged in
    console.log('PrivateRoute (V3): No specific roles required, user is logged in. Proceeding.');
  }

  // If user is authenticated and authorized, render the element
  return <Element />;
};

export default PrivateRoute;