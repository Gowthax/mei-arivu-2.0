import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [role, setRole] = useState(localStorage.getItem('role'));

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
        if (role) {
            localStorage.setItem('role', role);
        } else {
            localStorage.removeItem('role');
        }
    }, [token, role]);

    const login = (newToken, newRole) => {
        setToken(newToken);
        setRole(newRole);
    };

    const logout = () => {
        setToken(null);
        setRole(null);
    };

    const isViewer = role === 'viewer';
    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{ token, role, isViewer, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
