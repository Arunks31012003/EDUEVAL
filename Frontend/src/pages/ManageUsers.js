import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/crud.css'; // Make sure this path is correct

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + '/api';

const ManageUsers = ({ showToast }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showUserDetails, setShowUserDetails] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // State to track the ID of the currently hovered row
    const [hoveredRowId, setHoveredRowId] = useState(null);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user',
        status: 'active',
    });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/superadmin/users`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setUsers(response.data);
            if (showToast) {
                showToast('success', 'User list loaded successfully!', { autoClose: 2000 });
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            setError(err.response?.data?.message || 'Failed to fetch users. Please try again.');
            if (showToast) {
                showToast('error', err.response?.data?.message || 'Failed to load user data.', { autoClose: 5000 });
            }
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/superadmin/users`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setFormData({ username: '', email: '', password: '', role: 'user', status: 'active' });
            setShowAddForm(false);
            if (showToast) {
                showToast('success', `User '${formData.username}' added successfully!`, { autoClose: 3000 });
            }
            fetchUsers();
        } catch (err) {
            console.error('Error adding user:', err);
            setError(err.response?.data?.message || 'Failed to add user.');
            if (showToast) {
                showToast('error', err.response?.data?.message || 'Failed to add user.', { autoClose: 5000 });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/superadmin/users/${currentUser.id}`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setFormData({ username: '', email: '', password: '', role: 'user', status: 'active' });
            setShowEditForm(false);
            setCurrentUser(null);
            if (showToast) {
                showToast('success', `User '${formData.username || currentUser.username}' updated successfully!`, { autoClose: 3000 });
            }
            fetchUsers();
        } catch (err) {
            console.error('Error editing user:', err);
            setError(err.response?.data?.message || 'Failed to edit user.');
            if (showToast) {
                showToast('error', err.response?.data?.message || 'Failed to update user.', { autoClose: 5000 });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        // IMPORTANT: Replace window.confirm with a custom modal/dialog for better UX
        // For now, keeping as is based on previous code.
        if (!window.confirm('Are you sure you want to delete/deactivate this user?')) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/superadmin/users/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (showToast) {
                showToast('info', `User ID ${userId} deleted/deactivated successfully.`, { autoClose: 3000 });
            }
            fetchUsers();
        } catch (err) {
            console.error('Error deleting user:', err);
            setError(err.response?.data?.message || 'Failed to delete user.');
            if (showToast) {
                showToast('error', err.response?.data?.message || 'Failed to delete user.', { autoClose: 5000 });
            }
        } finally {
            setLoading(false);
        }
    };

    const openEditForm = (user) => {
        setCurrentUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            password: '',
            role: user.role,
            status: user.status,
        });
        setShowEditForm(true);
        setShowAddForm(false);
        setShowUserDetails(false);
    };

    const openUserDetails = (user) => {
        setCurrentUser(user);
        setShowUserDetails(true);
        setShowAddForm(false);
        setShowEditForm(false);
    };

    const closeFormsAndDetails = () => {
        setShowAddForm(false);
        setShowEditForm(false);
        setShowUserDetails(false);
        setCurrentUser(null);
        setFormData({ username: '', email: '', password: '', role: 'user', status: 'active' });
    };

    return (
        <div className="manage-section bg-white">
            <h3>Manage Users</h3>
            <button onClick={() => { closeFormsAndDetails(); setShowAddForm(true); }} className="add-btn">Add New User</button>

            {loading && <p>Loading users...</p>}
            {error && <p className="error-message">{error}</p>}

            {/* Add User Form */}
            {showAddForm && (
                <div className="form-panel">
                    <h4>Add New User</h4>
                    <form onSubmit={handleAddUser}>
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
                        <button type="submit" className="submit-btn">Add User</button>
                        <button type="button" onClick={() => setShowAddForm(false)} className="cancel-btn">Cancel</button>
                    </form>
                </div>
            )}

            {/* Edit User Form */}
            {showEditForm && currentUser && (
                <div className="form-panel">
                    <h4>Edit User: {currentUser.username}</h4>
                    <form onSubmit={handleEditUser}>
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
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
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
                        <button type="submit" className="submit-btn">Update User</button>
                        <button type="button" onClick={() => setShowEditForm(false)} className="cancel-btn">Cancel</button>
                    </form>
                </div>
            )}

            {/* User Details View */}
            {showUserDetails && currentUser && (
                <div className="details-panel">
                    <h4>User Details: {currentUser.username}</h4>
                    <p><strong>ID:</strong> {currentUser.id}</p>
                    <p><strong>Username:</strong> {currentUser.username}</p>
                    <p><strong>Email:</strong> {currentUser.email}</p>
                    <p><strong>Role:</strong> {currentUser.role}</p>
                    <p><strong>Status:</strong> {currentUser.status}</p>
                    <p><strong>Created At:</strong> {new Date(currentUser.created_at).toLocaleString()}</p>
                    <p><strong>Last Updated:</strong> {new Date(currentUser.updated_at).toLocaleString()}</p>
                    <button onClick={() => setShowUserDetails(false)} className="back-btn">Back to List</button>
                </div>
            )}

            {/* User List */}
            {!showAddForm && !showEditForm && !showUserDetails && (
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
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <tr
                                        key={user.id}
                                        style={{
                                            transition: 'background-color 0.3s ease-in-out !important', // Added !important
                                            backgroundColor: hoveredRowId === user.id ? '#f3f4f6 !important' : 'transparent', // Added !important
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={() => setHoveredRowId(user.id)}
                                        onMouseLeave={() => setHoveredRowId(null)}
                                    >
                                        <td>{user.id}</td>
                                        <td>{user.username}</td>
                                        <td>{user.email}</td>
                                        <td>{user.role}</td>
                                        <td>{user.status}</td>
                                        <td>
                                            <button onClick={() => openUserDetails(user)} className="view-btn">View</button>
                                            <button onClick={() => openEditForm(user)} className="edit-btn">Edit</button>
                                            <button onClick={() => handleDeleteUser(user.id)} className="delete-btn">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6">No users found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ManageUsers;
