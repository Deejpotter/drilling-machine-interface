import React from 'react';
import { MachineState, FaultCode } from '../machine/constants';

const stateConfig = {
  [MachineState.DISCONNECTED]: { label: 'Disconnected', color: '#6b7280', bg: '#f3f4f6' },
  [MachineState.IDLE]: { label: 'Idle', color: '#6b7280', bg: '#f3f4f6' },
  [MachineState.HOMING]: { label: 'Homing...', color: '#d97706', bg: '#fef3c7' },
  [MachineState.READY]: { label: 'Ready', color: '#059669', bg: '#d1fae5' },
  [MachineState.RUNNING]: { label: 'Running', color: '#2563eb', bg: '#dbeafe', pulse: true },
  [MachineState.PAUSED]: { label: 'Paused', color: '#d97706', bg: '#fef3c7' },
  [MachineState.FAULT]: { label: 'Fault', color: '#dc2626', bg: '#fee2e2', pulse: true },
  [MachineState.EMERGENCY_STOP]: { label: 'E-STOP', color: '#fff', bg: '#dc2626', pulse: true },
};

const faultLabels = {
  [FaultCode.OVERCURRENT]: 'Overcurrent detected',
  [FaultCode.OVERTEMP]: 'Spindle overtemperature',
  [FaultCode.LIMIT_SWITCH]: 'Limit switch triggered',
  [FaultCode.COMMUNICATION_ERROR]: 'Communication error',
  [FaultCode.SAFETY_DOOR]: 'Safety door opened during cycle',
  [FaultCode.CLAMP_FAILURE]: 'Clamp failure',
  [FaultCode.TOOL_BREAK]: 'Tool breakage detected',
};

export default function MachineStatusDashboard({ machine, actions, status }) {
  const config = stateConfig[machine.state] || stateConfig[MachineState.DISCONNECTED];

  return (
    <div className="machine-status-dashboard">
      {/* Status indicator */}
      <div className="status-indicator" style={{ background: config.bg }}>
        <div
          className={`status-dot ${config.pulse ? 'pulse' : ''}`}
          style={{ background: config.color }}
        />
        <span className="status-label" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>

      {/* Connection & homing controls */}
      <div className="status-controls">
        {!status.isConnected ? (
          <button className="btn-control btn-connect" onClick={actions.connect}>
            Connect to Machine
          </button>
        ) : (
          <>
            {!status.isHomed && machine.state !== MachineState.HOMING && (
              <button className="btn-control btn-home" onClick={actions.home}>
                Home Machine
              </button>
            )}
            <button className="btn-control btn-disconnect" onClick={actions.disconnect}>
              Disconnect
            </button>
          </>
        )}
      </div>

      {/* Position display */}
      {status.isConnected && (
        <div className="position-display">
          <div className="position-axis">
            <span className="axis-label">X</span>
            <span className="axis-value">{machine.position.x.toFixed(2)}</span>
            <span className="axis-unit">mm</span>
          </div>
          <div className="position-axis">
            <span className="axis-label">Y</span>
            <span className="axis-value">{machine.position.y.toFixed(2)}</span>
            <span className="axis-unit">mm</span>
          </div>
          <div className="position-axis">
            <span className="axis-label">Z</span>
            <span className="axis-value">{machine.position.z.toFixed(2)}</span>
            <span className="axis-unit">mm</span>
          </div>
          <button className="btn-control btn-zero" onClick={actions.setZero} disabled={!status.isHomed}>
            Set Zero
          </button>
        </div>
      )}

      {/* Safety indicators */}
      {status.isConnected && (
        <div className="safety-indicators">
          <div className={`safety-item ${machine.safety.clamp === 'clamped' ? 'safe' : 'unsafe'}`}>
            <span className="safety-icon">{machine.safety.clamp === 'clamped' ? '✓' : '!'}</span>
            <span className="safety-label">Clamp</span>
          </div>
          <div className={`safety-item ${machine.tool.wear < machine.tool.maxWear * 0.8 ? 'safe' : 'warning'}`}>
            <span className="safety-icon">W</span>
            <span className="safety-label">Tool {Math.round(machine.tool.wear)}%</span>
          </div>
        </div>
      )}

      {/* Fault display */}
      {status.isFault && machine.fault && (
        <div className="fault-display">
          <span className="fault-code">FAULT: {machine.fault.toUpperCase()}</span>
          <span className="fault-desc">{faultLabels[machine.fault] || 'Unknown fault'}</span>
          <button className="btn-control btn-reset" onClick={actions.resetFault}>
            Reset Fault
          </button>
        </div>
      )}

      {/* E-Stop display */}
      {status.isEStop && (
        <div className="estop-display">
          <span className="estop-text">EMERGENCY STOP ACTIVATED</span>
          <button className="btn-control btn-reset" onClick={actions.resetFault}>
            Release E-Stop
          </button>
        </div>
      )}

      {/* Progress bar */}
      {status.isRunning && (
        <div className="progress-display">
          <div className="progress-info">
            <span>Step {machine.currentStep} of {machine.currentJob?.holes?.length || 0}</span>
            <span>{machine.progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${machine.progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
