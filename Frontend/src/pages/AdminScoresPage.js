import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import '../styles/admin.css';

const AdminScoresPage = () => {
    const [scores, setScores] = useState([]);
    const [filters, setFilters] = useState({
        name: '',
        id: '',
        course_type: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchScores = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get('/api/tests/results/admin', {
                params: filters
            });
            setScores(response.data.results);
        } catch (err) {
            setError('Failed to fetch scores');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScores();
    }, []);

    const handleFilterChange = (e) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value
        });
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchScores();
    };

    return (
        <div className="admin-scores-page">
            <h2>Scores of Previous Tests</h2>
            <form onSubmit={handleFilterSubmit} className="filters-form">
                <input
                    type="text"
                    name="name"
                    placeholder="Filter by name"
                    value={filters.name}
                    onChange={handleFilterChange}
                />
                <input
                    type="text"
                    name="id"
                    placeholder="Filter by ID"
                    value={filters.id}
                    onChange={handleFilterChange}
                />
                <select name="course_type" value={filters.course_type} onChange={handleFilterChange}>
                    <option value="">All Types</option>
                    <option value="Reading">Reading</option>
                    <option value="Writing">Writing</option>
                    <option value="Listening">Listening</option>
                    <option value="Speaking">Speaking</option>
                </select>
                <button type="submit">Filter</button>
            </form>

            {loading && <p>Loading...</p>}
            {error && <p className="error">{error}</p>}

            <div className="scores-table-container">
                <table className="scores-table">
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>User Name</th>
                            <th>Course Name</th>
                            <th>Course Type</th>
                            <th>Score</th>
                            <th>Total Questions</th>
                            <th>Taken At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scores.length > 0 ? (
                            scores.map((score) => (
                                <tr key={score.id}>
                                    <td>{score.user_id}</td>
                                    <td>{score.user_name}</td>
                                    <td>{score.course_name}</td>
                                    <td>{score.course_type}</td>
                                    <td>{score.score}</td>
                                    <td>{score.total_questions}</td>
                                    <td>{new Date(score.taken_at).toLocaleString()}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7">No scores found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminScoresPage;
