import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/axiosInstance';
import { toast } from 'react-toastify';

const ViewTestPage = () => {
  const { courseId } = useParams();
  const [courseTitle, setCourseTitle] = useState('');
  const [testQuestions, setTestQuestions] = useState([]);

  useEffect(() => {
    const fetchTestQuestions = async () => {
      try {
        const response = await api.get(`/api/tests/course/${courseId}`);
        setCourseTitle(response.data.course_title || 'Course');
        setTestQuestions(response.data.tests || []);
      } catch (error) {
        console.error('Error fetching test questions:', error);
        toast.error('Failed to load test questions');
      }
    };

    fetchTestQuestions();
  }, [courseId]);

  const isCorrect = (question, optionKey) =>
    question.correct_option?.trim().toUpperCase() === optionKey.toUpperCase();

  const getCorrectOptionText = (question) => {
    switch (question.correct_option?.trim().toUpperCase()) {
      case 'A': return question.option_a;
      case 'B': return question.option_b;
      case 'C': return question.option_c;
      case 'D': return question.option_d;
      default: return 'Answer not available';
    }
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#f1f2f6', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' }}>
        Test Questions for {courseTitle}
      </h2>

      {testQuestions.length === 0 ? (
        <p>No test questions found for this course.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {testQuestions.map((q, i) => (
            <li
              key={i}
              style={{
                marginBottom: '30px',
                backgroundColor: '#fff',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <p style={{ fontWeight: 'bold' }}>Q{i + 1}: {q.question}</p>
              <ul style={{ paddingLeft: '20px' }}>
                <li style={{ color: isCorrect(q, 'A') ? 'green' : 'black' }}>A. {q.option_a}</li>
                <li style={{ color: isCorrect(q, 'B') ? 'green' : 'black' }}>B. {q.option_b}</li>
                <li style={{ color: isCorrect(q, 'C') ? 'green' : 'black' }}>C. {q.option_c}</li>
                <li style={{ color: isCorrect(q, 'D') ? 'green' : 'black' }}>D. {q.option_d}</li>
              </ul>
              <p style={{ marginTop: '10px' }}>
                <strong>Correct Answer:</strong> {getCorrectOptionText(q)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ViewTestPage;
