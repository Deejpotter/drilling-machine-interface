import { MachineState, SafetyState, FaultCode } from './constants';

/* ────────────────────────────────────────────
   Mock machine simulator
   Simulates a real drilling machine controller
   ──────────────────────────────────────────── */
class MockMachineSimulator {
  constructor() {
    this._state = MachineState.DISCONNECTED;
    this._safety = {
      clamp: SafetyState.UNCLAMPED,
    };
    this._fault = FaultCode.NONE;
    this._position = { x: 0, y: 0, z: 0 };
    this._currentJob = null;
    this._currentStep = 0;
    this._progress = 0;
    this._listeners = new Map();
    this._simInterval = null;
    this._connected = false;
    this._homed = false;
    this._tool = { id: 'drill-11mm', wear: 0, maxWear: 100 };
    this._zeroPoint = { x: 0, y: 0, z: 0 };
  }

  /* Event system */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const cbs = this._listeners.get(event);
    if (cbs) {
      this._listeners.set(event, cbs.filter(cb => cb !== callback));
    }
  }

  _emit(event, data) {
    const cbs = this._listeners.get(event);
    if (cbs) {
      cbs.forEach(cb => cb(data));
    }
    if (event !== 'state_change') {
      const stateCbs = this._listeners.get('state_change');
      if (stateCbs) {
        stateCbs.forEach(cb => cb(this.getFullState()));
      }
    }
  }

  getFullState() {
    return {
      state: this._state,
      safety: { ...this._safety },
      fault: this._fault,
      position: { ...this._position },
      currentJob: this._currentJob ? { ...this._currentJob } : null,
      currentStep: this._currentStep,
      progress: this._progress,
      connected: this._connected,
      homed: this._homed,
      tool: { ...this._tool },
      zeroPoint: { ...this._zeroPoint },
    };
  }

  /* Connection */
  connect() {
    if (this._connected) return;
    this._connected = true;
    this._state = MachineState.IDLE;
    this._emit('connect');
  }

  disconnect() {
    if (!this._connected) return;
    this._connected = false;
    this._state = MachineState.DISCONNECTED;
    this._stopSimulation();
    this._emit('disconnect');
  }

  /* Homing */
  home() {
    if (!this._connected) return this._error('Not connected');
    if (this._state === MachineState.RUNNING) return this._error('Cannot home while running');

    this._state = MachineState.HOMING;
    this._emit('homing_start');

    // Simulate homing sequence
    setTimeout(() => {
      this._position = { x: 0, y: 0, z: 0 };
      this._homed = true;
      this._state = MachineState.READY;
      this._emit('homing_complete');
    }, 2000);
  }

  /* Safety controls */
  clamp() {
    if (!this._connected) return this._error('Not connected');
    this._safety.clamp = SafetyState.CLAMPED;
    this._emit('safety_change', { ...this._safety });
  }

  unclamp() {
    if (!this._connected) return this._error('Not connected');
    if (this._state === MachineState.RUNNING) return this._error('Cannot unclamp while running');
    this._safety.clamp = SafetyState.UNCLAMPED;
    this._emit('safety_change', { ...this._safety });
  }

  /* Zero point */
  setZero() {
    if (!this._connected) return this._error('Not connected');
    this._zeroPoint = { ...this._position };
    this._emit('zero_set', { ...this._zeroPoint });
  }

  /* Job execution */
  startJob(job) {
    if (!this._connected) return this._error('Not connected');
    if (!this._homed) return this._error('Machine not homed');
    if (this._safety.clamp === SafetyState.UNCLAMPED) return this._error('Material not clamped');
    if (this._state === MachineState.RUNNING) return this._error('Already running');

    this._currentJob = job;
    this._currentStep = 0;
    this._progress = 0;
    this._state = MachineState.RUNNING;
    this._emit('job_start', { job });

    this._startSimulation(job);
  }

  pauseJob() {
    if (this._state !== MachineState.RUNNING) return this._error('Not running');
    this._state = MachineState.PAUSED;
    this._stopSimulation();
    this._emit('job_pause');
  }

  resumeJob() {
    if (this._state !== MachineState.PAUSED) return this._error('Not paused');
    this._state = MachineState.RUNNING;
    this._emit('job_resume');
    this._startSimulation(this._currentJob);
  }

  stopJob() {
    if (this._state !== MachineState.RUNNING && this._state !== MachineState.PAUSED) return;
    this._stopSimulation();
    this._currentJob = null;
    this._currentStep = 0;
    this._progress = 0;
    this._state = MachineState.READY;
    this._emit('job_stop');
  }

  emergencyStop() {
    this._stopSimulation();
    this._state = MachineState.EMERGENCY_STOP;
    this._currentJob = null;
    this._currentStep = 0;
    this._progress = 0;
    this._emit('emergency_stop');
  }

  resetFault() {
    if (this._state !== MachineState.FAULT && this._state !== MachineState.EMERGENCY_STOP) return;
    this._fault = FaultCode.NONE;
    this._state = this._homed ? MachineState.READY : MachineState.IDLE;
    this._emit('fault_reset');
  }

  /* Jog control */
  jog(axis, distance) {
    if (!this._connected) return this._error('Not connected');
    if (this._state === MachineState.RUNNING) return this._error('Cannot jog while running');
    this._position[axis] = (this._position[axis] || 0) + distance;
    this._emit('position_change', { ...this._position });
  }

  /* Internal simulation */
  _startSimulation(job) {
    this._stopSimulation();
    const totalSteps = job?.holes?.length || 1;
    const stepTime = 800; // ms per hole

    this._simInterval = setInterval(() => {
      if (this._currentStep >= totalSteps) {
        this._stopSimulation();
        this._currentJob = null;
        this._currentStep = 0;
        this._progress = 100;
        this._state = MachineState.READY;
        this._emit('job_complete');
        return;
      }

      this._currentStep++;
      this._progress = Math.round((this._currentStep / totalSteps) * 100);
      this._position.x = job?.holes?.[this._currentStep - 1]?.distance_from_end_mm || 0;

      this._emit('step_complete', {
        step: this._currentStep,
        total: totalSteps,
        progress: this._progress,
        hole: job?.holes?.[this._currentStep - 1],
      });

      // Simulate occasional tool wear
      this._tool.wear = Math.min(this._tool.maxWear, this._tool.wear + 0.1);
    }, stepTime);
  }

  _stopSimulation() {
    if (this._simInterval) {
      clearInterval(this._simInterval);
      this._simInterval = null;
    }
  }

  _triggerFault(code) {
    this._fault = code;
    this._state = MachineState.FAULT;
    this._stopSimulation();
    this._emit('fault', { code });
  }

  _error(msg) {
    this._emit('error', { message: msg });
    return { error: msg };
  }

  /* Simulate random faults for testing */
  simulateFault(code = FaultCode.OVERTEMP) {
    if (this._state === MachineState.DISCONNECTED) return;
    this._triggerFault(code);
  }
}

export const mockMachine = new MockMachineSimulator();
export default mockMachine;
