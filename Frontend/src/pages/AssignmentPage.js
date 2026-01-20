import React, { useState } from 'react';
import Timer from '../components/Timer';
import MCQSection from '../components/MCQSection';
import DescriptiveSection from '../components/DescriptiveSection';
import SpeakingSection from '../components/SpeakingSection';
import ScorePage from '../components/ScorePage';

const AssignmentPage = () => {
  const TEST_DURATION = 60 * 5; // 5 minutes for testing
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({ mcq: [], descriptive: [], speaking: null });
  const [score, setScore] = useState(0);
  const [totalMCQs, setTotalMCQs] = useState(0); // NEW: total number of MCQs

  // Callback from MCQSection to track total MCQs
  const handleTotalMCQs = (total) => {
    setTotalMCQs(total);
  };

  const handleSubmit = () => {
    const scoreCalculated = answers.mcq.filter(ans => ans.isCorrect).length;
    setScore(scoreCalculated);
    setSubmitted(true);
  };

  const onTimeUp = () => {
    console.log("Time's up! Auto-submitting.");
    handleSubmit();
  };

  if (submitted) {
    return <ScorePage score={score} total={totalMCQs} answers={answers} />;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-2">Assignment/Test</h2>
      <Timer duration={TEST_DURATION} onTimeUp={onTimeUp} />

      <MCQSection setAnswers={setAnswers} setTotalMCQs={handleTotalMCQs} />
      <DescriptiveSection setAnswers={setAnswers} />
      <SpeakingSection setAnswers={setAnswers} />

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 mt-4 rounded hover:bg-blue-700"
      >
        End Test
      </button>
    </div>
  );
};

export default AssignmentPage;
