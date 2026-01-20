import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/crud.css'; // Make sure this path is correct

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + '/api';

const ManageSuperAdmins = ({ showToast }) => {
    const [superAdmins, setSuperAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showSuperAdminDetails, setShowSuperAdminDetails] = useState(false);
    const [currentSuperAdmin, setCurrentSuperAdmin] = useState(null);

    // State to track the ID of the currently hovered row
    const [hoveredRowId, setHoveredRowId] = useState(null);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        phone: '',
        status: 'active',
    });

    const fetchSuperAdmins = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/superadmin/superadmins`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setSuperAdmins(response.data);
            if (showToast) {
                showToast('success', 'Super Admin list loaded successfully!', { autoClose: 2000 });
            }
        } catch (err) {
            console.error('Error fetching super admins:', err);
            setError(err.response?.data?.message || 'Failed to fetch super admins. Please try again.');
            if (showToast) {
                showToast('error', err.response?.data?.message || 'Failed to load super admin data.', { autoClose: 5000 });
            }
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchSuperAdmins();
    }, [fetchSuperAdmins]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddSuperAdmin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/superadmin/superadmins`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setFormData({ username: '', email: '', password: '', phone: '', status: 'active' });
            setShowAddForm(false);
            if (showToast) {
                showToast('success', `Super Admin '${formData.username}' added successfully!`, { autoClose: 3000 });
            }
            fetchSuperAdmins();
        } catch (err) {
            console.error('Error adding super admin:', err);
            setError(err.response?.data?.message || 'Failed to add super admin.');
            if (showToast) {
                showToast('error', err.response?.data?.message || 'Failed to add super admin.', { autoClose: 5000 });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEditSuperAdmin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/superadmin/superadmins/${currentSuperAdmin.id}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setFormData({ username: '', email: '', password: '', phone: '', status: 'active' });
            setShowEditForm(false);
            setCurrentSuperAdmin(null);
            if (showToast) {
                showToast('success', `Super Admin '${formData.username || currentSuperAdmin.username}' updated successfully!`, { autoClose: 3000 });
            }
            fetchSuperAdmins();
        } catch (err) {
            console.error('Error editing super admin:', err);
            setError(err.response?.data?.message || 'Failed to edit super admin.');
            if (showToast) {
                showToast('error', err.response?.data?.message || 'Failed to update super admin.', { autoClose: 5000 });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSuperAdmin = async (superAdminId) => {
        // IMPORTANT: Replace window.confirm with a custom modal/dialog for better UX
        // For now, keeping as is based on previous code.
        if (!window.confirm('Are you sure you want to delete/deactivate this super admin?')) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/superadmin/superadmins/${superAdminId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (showToast) {
                showToast('info', `Super Admin ID ${superAdminId} deleted/deactivated successfully.`, { autoClose: 3000 });
            }
            fetchSuperAdmins();
        } catch (err) {
            console.error('Error deleting super admin:', err);
            setError(err.response?.data?.message || 'Failed to delete super admin.');
            if (showToast) {
                showToast('error', err.response?.data?.message || 'Failed to delete super admin.', { autoClose: 5000 });
            }
        } finally {
            setLoading(false);
        }
    };

    const openEditForm = (superAdmin) => {
        setCurrentSuperAdmin(superAdmin);
        setFormData({
            username: superAdmin.username,
            email: superAdmin.email,
            password: '',
            phone: superAdmin.phone || '',
            status: superAdmin.status,
        });
        setShowEditForm(true);
        setShowAddForm(false);
        setShowSuperAdminDetails(false);
    };

    const openSuperAdminDetails = (superAdmin) => {
        setCurrentSuperAdmin(superAdmin);
        setShowSuperAdminDetails(true);
        setShowAddForm(false);
        setShowEditForm(false);
    };

    const closeFormsAndDetails = () => {
        setShowAddForm(false);
        setShowEditForm(false);
        setShowSuperAdminDetails(false);
        setCurrentSuperAdmin(null);
        setFormData({ username: '', email: '', password: '', phone: '', status: 'active' });
    };

    return (
        <div className="manage-section superadmin bg-white">
            <h3 className="superadmin-title">Manage Super Admins</h3>
            <button onClick={() => { closeFormsAndDetails(); setShowAddForm(true); }} className="add-btn">Add New Super Admin</button>

            {loading && <p>Loading super admins...</p>}
            {error && <p className="error-message">{error}</p>}

            {showAddForm && (
                <div className="form-panel">
                    <h4>Add New Super Admin</h4>
                    <form onSubmit={handleAddSuperAdmin}>
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
                            Phone:
                            <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
                        </label>
                        <label>
                            Status:
                            <select name="status" value={formData.status} onChange={handleChange}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </label>
                        <button type="submit" className="submit-btn">Add Super Admin</button>
                        <button type="button" onClick={() => setShowAddForm(false)} className="cancel-btn">Cancel</button>
                    </form>
                </div>
            )}

            {showEditForm && currentSuperAdmin && (
                <div className="form-panel">
                    <h4>Edit Super Admin: {currentSuperAdmin.username}</h4>
                    <form onSubmit={handleEditSuperAdmin}>
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
                            Phone:
                            <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
                        </label>
                        <label>
                            Status:
                            <select name="status" value={formData.status} onChange={handleChange}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </label>
                        <button type="submit" className="submit-btn">Update Super Admin</button>
                        <button type="button" onClick={() => setShowEditForm(false)} className="cancel-btn">Cancel</button>
                    </form>
                </div>
            )}

            {showSuperAdminDetails && currentSuperAdmin && (
                <div className="details-panel">
                    <h4>Super Admin Details: {currentSuperAdmin.username}</h4>
                    <p><strong>ID:</strong> {currentSuperAdmin.id}</p>
                    <p><strong>Username:</strong> {currentSuperAdmin.username}</p>
                    <p><strong>Email:</strong> {currentSuperAdmin.email}</p>
                    <p><strong>Phone:</strong> {currentSuperAdmin.phone}</p>
                    <p><strong>Role:</strong> {currentSuperAdmin.role}</p>
                    <p><strong>Status:</strong> {currentSuperAdmin.status}</p>
                    <p><strong>Created At:</strong> {new Date(currentSuperAdmin.created_at).toLocaleString()}</p>
                    <p><strong>Last Updated:</strong> {new Date(currentSuperAdmin.updated_at).toLocaleString()}</p>
                    <button onClick={() => setShowSuperAdminDetails(false)} className="back-btn">Back to List</button>
                </div>
            )}

            {!showAddForm && !showEditForm && !showSuperAdminDetails && (
                <div className="table-container overview-card-plain bg-white">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {superAdmins.length > 0 ? (
                                superAdmins.map((superAdmin) => (
                                    <tr
                                        key={superAdmin.id}
                                        style={{
                                            transition: 'background-color 0.3s ease-in-out !important', // Added !important
                                            backgroundColor: hoveredRowId === superAdmin.id ? '#f3f4f6 !important' : 'transparent', // Added !important
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={() => setHoveredRowId(superAdmin.id)}
                                        onMouseLeave={() => setHoveredRowId(null)}
                                    >
                                        <td>{superAdmin.id}</td>
                                        <td>{superAdmin.username}</td>
                                        <td>{superAdmin.email}</td>
                                        <td>{superAdmin.phone || 'N/A'}</td>
                                        <td>{superAdmin.status}</td>
                                        <td>
                                            <button onClick={() => openSuperAdminDetails(superAdmin)} className="view-btn">View</button>
                                            <button onClick={() => openEditForm(superAdmin)} className="edit-btn">Edit</button>
                                            <button onClick={() => handleDeleteSuperAdmin(superAdmin.id)} className="delete-btn">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6">No super admins found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ManageSuperAdmins;



