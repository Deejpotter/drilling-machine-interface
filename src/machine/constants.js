/* ────────────────────────────────────────────
   Machine state constants
   ──────────────────────────────────────────── */
export const MachineState = {
  DISCONNECTED: 'disconnected',
  IDLE: 'idle',
  HOMING: 'homing',
  READY: 'ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  FAULT: 'fault',
  EMERGENCY_STOP: 'emergency_stop',
};

export const SafetyState = {
  DOOR_OPEN: 'door_open',
  DOOR_CLOSED: 'door_closed',
  CLAMPED: 'clamped',
  UNCLAMPED: 'unclamped',
};

export const MachineCommand = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  HOME: 'home',
  START_JOB: 'start_job',
  PAUSE_JOB: 'pause_job',
  RESUME_JOB: 'resume_job',
  STOP_JOB: 'stop_job',
  EMERGENCY_STOP: 'emergency_stop',
  RESET_FAULT: 'reset_fault',
  CLAMP: 'clamp',
  UNCLAMP: 'unclamp',
  SET_ZERO: 'set_zero',
  JOG: 'jog',
};

export const FaultCode = {
  NONE: null,
  OVERCURRENT: 'overcurrent',
  OVERTEMP: 'overtemp',
  LIMIT_SWITCH: 'limit_switch',
  COMMUNICATION_ERROR: 'comm_error',
  SAFETY_DOOR: 'safety_door',
  CLAMP_FAILURE: 'clamp_failure',
  TOOL_BREAK: 'tool_break',
};
