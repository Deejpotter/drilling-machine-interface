import React, { useState } from 'react';

export default function CalibrationHelper({ machine, actions, status }) {
  const [step, setStep] = useState(0);
  const [jogDistance, setJogDistance] = useState(1);

  const steps = [
    {
      title: 'Home the Machine',
      description: 'Ensure the machine is homed before calibration.',
      action: 'home',
    },
    {
      title: 'Position at Reference Edge',
      description: 'Use jog controls to move the spindle to the reference edge of the material.',
    },
    {
      title: 'Set X Zero',
      description: 'Set the current X position as zero.',
      action: 'setZeroX',
    },
    {
      title: 'Position at Reference Face',
      description: 'Jog to the reference face of the material.',
    },
    {
      title: 'Set Y Zero',
      description: 'Set the current Y position as zero.',
      action: 'setZeroY',
    },
    {
      title: 'Set Z Zero (Touch Off)',
      description: 'Lower the tool until it touches the material surface, then set Z zero.',
      action: 'setZeroZ',
    },
    {
      title: 'Verify Calibration',
      description: 'Jog away and return to zero to verify accuracy.',
    },
  ];

  const currentStep = steps[step];

  function handleNext() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  }

  function handlePrev() {
    if (step > 0) {
      setStep(step - 1);
    }
  }

  function handleJog(axis, direction) {
    actions.jog(axis, direction * jogDistance);
  }

  if (!status.isConnected) {
    return (
      <div className="calibration-helper">
        <h3>Calibration Helper</h3>
        <p>Connect to the machine to begin calibration.</p>
      </div>
    );
  }

  return (
    <div className="calibration-helper">
      <h3>Calibration Helper</h3>

      {/* Step indicator */}
      <div className="calibration-steps">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`step-dot ${i < step ? 'completed' : ''} ${i === step ? 'active' : ''}`}
            onClick={() => setStep(i)}
          >
            {i < step ? '✓' : i + 1}
          </div>
        ))}
      </div>

      {/* Current step */}
      <div className="calibration-step-content">
        <h4>{currentStep.title}</h4>
        <p>{currentStep.description}</p>

        {/* Jog controls */}
        {step >= 1 && step <= 5 && (
          <div className="jog-controls">
            <div className="jog-distance">
              <label>Jog Distance (mm)</label>
              <div className="jog-distance-buttons">
                {[0.1, 1, 10].map(d => (
                  <button
                    key={d}
                    className={`btn-jog-dist ${jogDistance === d ? 'active' : ''}`}
                    onClick={() => setJogDistance(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="jog-axes">
              {['x', 'y', 'z'].map(axis => (
                <div key={axis} className="jog-axis">
                  <span className="axis-label">{axis.toUpperCase()}</span>
                  <button className="btn-jog" onClick={() => handleJog(axis, -1)}>−</button>
                  <button className="btn-jog" onClick={() => handleJog(axis, 1)}>+</button>
                </div>
              ))}
            </div>

            <div className="current-position">
              <span>X: {machine.position.x.toFixed(2)}</span>
              <span>Y: {machine.position.y.toFixed(2)}</span>
              <span>Z: {machine.position.z.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Set zero buttons */}
        {currentStep.action?.startsWith('setZero') && (
          <button
            className="btn-control btn-set-zero"
            onClick={actions.setZero}
          >
            Set {currentStep.action.replace('setZero', '') || 'All'} Zero
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="calibration-nav">
        <button
          className="btn-secondary"
          onClick={handlePrev}
          disabled={step === 0}
        >
          Previous
        </button>
        <button
          className="btn-primary"
          onClick={handleNext}
          disabled={step === steps.length - 1}
        >
          {step === steps.length - 1 ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );
}
