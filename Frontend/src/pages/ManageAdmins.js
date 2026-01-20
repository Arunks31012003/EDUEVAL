import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/crud.css'; // Make sure this path is correct

// Get the API URL from environment variables 
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + '/api';

const ManageAdmins = ({ showToast }) => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showAdminDetails, setShowAdminDetails] = useState(false);
    const [currentAdmin, setCurrentAdmin] = useState(null);

    // State to track the ID of the currently hovered row
    const [hoveredRowId, setHoveredRowId] = useState(null);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'admin',
        status: 'active',
    });

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/superadmin/admins`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setAdmins(response.data);
            if (showToast) {
                showToast('success', 'Admin list loaded successfully!', { autoClose: 2000 });
            }
        } catch (err) {
            console.error('Error fetching admins:', err);
            setError(err.response?.data?.message || 'Failed to fetch admins. Please try again.');
            if (showToast) {
                showToast('error', err.response?.data?.message || 'Failed to load admin data.', { autoClose: 5000 });
            }
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/superadmin/admins`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setFormData({ username: '', email: '', password: '', role: 'admin', status: 'active' });
            setShowAddForm(false);
            if (showToast) {
                showToast('success', `Admin '${formData.username}' added successfully!`, { autoClose: 3000 });
            }
            fetchAdmins();
        } catch (err) {
            console.error('Error adding admin:', err);
            setError(err.response?.data?.message || 'Failed to add admin.');
            if (showToast) {
                showToast('error', err.response?.data?.message || 'Failed to add admin.', { autoClose: 5000 });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEditAdmin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/superadmin/admins/${currentAdmin.id}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setFormData({ username: '', email: '', password: '', role: 'admin', status: 'active' });
            setShowEditForm(false);
            setCurrentAdmin(null);
            if (showToast) {
                showToast('success', `Admin '${formData.username || currentAdmin.username}' updated successfully!`, { autoClose: 3000 });
            }
            fetchAdmins();
        } catch (err) {
            console.error('Error editing admin:', err);
            setError(err.response?.data?.message || 'Failed to edit admin.');
            if (showToast) {
                showToast('error', err.response?.data?.message || 'Failed to update admin.', { autoClose: 5000 });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAdmin = async (adminId) => {
        // IMPORTANT: Replace window.confirm with a custom modal/dialog for better UX
        // For now, keeping as is based on previous code.
        if (!window.confirm('Are you sure you want to delete/deactivate this admin?')) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/superadmin/admins/${adminId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (showToast) {
                showToast('info', `Admin ID ${adminId} deleted/deactivated successfully.`, { autoClose: 3000 });
            }
            fetchAdmins();
        } catch (err) {
            console.error('Error deleting admin:', err);
            setError(err.response?.data?.message || 'Failed to delete admin.');
            if (showToast) {
                showToast('error', err.response?.data?.message || 'Failed to delete admin.', { autoClose: 5000 });
            }
        } finally {
            setLoading(false);
        }
    };

    const openEditForm = (admin) => {
        setCurrentAdmin(admin);
        setFormData({
            username: admin.username,
            email: admin.email,
            password: '',
            role: admin.role,
            status: admin.status,
        });
        setShowEditForm(true);
        setShowAddForm(false);
        setShowAdminDetails(false);
    };

    const openAdminDetails = (admin) => {
        setCurrentAdmin(admin);
        setShowAdminDetails(true);
        setShowAddForm(false);
        setShowEditForm(false);
    };

    const closeFormsAndDetails = () => {
        setShowAddForm(false);
        setShowEditForm(false);
        setShowAdminDetails(false);
        setCurrentAdmin(null);
        setFormData({ username: '', email: '', password: '', role: 'admin', status: 'active' });
    };

    return (
        <div className="manage-section bg-white">
            <h3>Manage Admins</h3>
            <button onClick={() => { closeFormsAndDetails(); setShowAddForm(true); }} className="add-btn">Add New Admin</button>

            {loading && <p>Loading admins...</p>}
            {error && <p className="error-message">{error}</p>}

            {showAddForm && (
                <div className="form-panel">
                    <h4>Add New Admin</h4>
                    <form onSubmit={handleAddAdmin}>
                        <label>
                            Username:
                            <input type="text" name="username" value={formData.username} onChange={handleChange} required />
                        </label>
                        <label>
                            Email:
                            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                        </label>
                        <label>
                            Password:
                            <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                        </label>
                        <label>
                            Status:
                            <select name="status" value={formData.status} onChange={handleChange}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </label>
                        <button type="submit" className="submit-btn">Add Admin</button>
                        <button type="button" onClick={() => setShowAddForm(false)} className="cancel-btn">Cancel</button>
                    </form>
                </div>
            )}

            {showEditForm && currentAdmin && (
                <div className="form-panel">
                    <h4>Edit Admin: {currentAdmin.username}</h4>
                    <form onSubmit={handleEditAdmin}>
                        <label>
                            Username:
                            <input type="text" name="username" value={formData.username} onChange={handleChange} required />
                        </label>
                        <label>
                            Email:
                            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                        </label>
                        <label>
                            New Password (leave blank if not changing):
                            <input type="password" name="password" value={formData.password} onChange={handleChange} />
                        </label>
                        <label>
                            Role:
                            <select name="role" value={formData.role} onChange={handleChange}>
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                            </select>
                        </label>
                        <label>
                            Status:
                            <select name="status" value={formData.status} onChange={handleChange}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </label>
                        <button type="submit" className="submit-btn">Update Admin</button>
                        <button type="button" onClick={() => setShowEditForm(false)} className="cancel-btn">Cancel</button>
                    </form>
                </div>
            )}

            {showAdminDetails && currentAdmin && (
                <div className="details-panel">
                    <h4>Admin Details: {currentAdmin.username}</h4>
                    <p><strong>ID:</strong> {currentAdmin.id}</p>
                    <p><strong>Username:</strong> {currentAdmin.username}</p>
                    <p><strong>Email:</strong> {currentAdmin.email}</p>
                    <p><strong>Role:</strong> {currentAdmin.role}</p>
                    <p><strong>Status:</strong> {currentAdmin.status}</p>
                    <p><strong>Created At:</strong> {new Date(currentAdmin.created_at).toLocaleString()}</p>
                    <p><strong>Last Updated:</strong> {new Date(currentAdmin.updated_at).toLocaleString()}</p>
                    <button onClick={() => setShowAdminDetails(false)} className="back-btn">Back to List</button>
                </div>
            )}

            {!showAddForm && !showEditForm && !showAdminDetails && (
                <div className="table-container overview-card-plain bg-white">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admins.length > 0 ? (
                                admins.map((admin) => (
                                    <tr
                                        key={admin.id}
                                        style={{
                                            transition: 'background-color 0.3s ease-in-out !important', // Added !important
                                            backgroundColor: hoveredRowId === admin.id ? '#f3f4f6 !important' : 'transparent', // Added !important
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={() => setHoveredRowId(admin.id)}
                                        onMouseLeave={() => setHoveredRowId(null)}
                                    >
                                        <td>{admin.id}</td>
                                        <td>{admin.username}</td>
                                        <td>{admin.email}</td>
                                        <td>{admin.role}</td>
                                        <td>{admin.status}</td>
                                        <td>
                                            <button onClick={() => openAdminDetails(admin)} className="view-btn">View</button>
                                            <button onClick={() => openEditForm(admin)} className="edit-btn">Edit</button>
                                            <button onClick={() => handleDeleteAdmin(admin.id)} className="delete-btn">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6">No admins found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ManageAdmins;
