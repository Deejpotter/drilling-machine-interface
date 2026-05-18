import { useState, useEffect, useCallback, useRef } from 'react';
import { mockMachine } from '../machine/mockServer';
import { MachineState, FaultCode } from '../machine/constants';

/* ────────────────────────────────────────────
   useMachine hook
   Provides machine state and control actions
   ──────────────────────────────────────────── */
export function useMachine() {
  const [machine, setMachine] = useState(mockMachine.getFullState());
  const [error, setError] = useState(null);
  const boundRef = useRef(false);

  useEffect(() => {
    if (boundRef.current) return;
    boundRef.current = true;

    const handleStateChange = (state) => {
      setMachine({ ...state });
    };

    const handleError = (err) => {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    };

    mockMachine.on('state_change', handleStateChange);
    mockMachine.on('error', handleError);

    return () => {
      mockMachine.off('state_change', handleStateChange);
      mockMachine.off('error', handleError);
    };
  }, []);

  const connect = useCallback(() => mockMachine.connect(), []);
  const disconnect = useCallback(() => mockMachine.disconnect(), []);
  const home = useCallback(() => mockMachine.home(), []);
  const clamp = useCallback(() => mockMachine.clamp(), []);
  const unclamp = useCallback(() => mockMachine.unclamp(), []);
  const setZero = useCallback(() => mockMachine.setZero(), []);
  const startJob = useCallback((job) => mockMachine.startJob(job), []);
  const pauseJob = useCallback(() => mockMachine.pauseJob(), []);
  const resumeJob = useCallback(() => mockMachine.resumeJob(), []);
  const stopJob = useCallback(() => mockMachine.stopJob(), []);
  const emergencyStop = useCallback(() => mockMachine.emergencyStop(), []);
  const resetFault = useCallback(() => mockMachine.resetFault(), []);
  const jog = useCallback((axis, distance) => mockMachine.jog(axis, distance), []);
  const simulateFault = useCallback((code) => mockMachine.simulateFault(code), []);

  const isReady = machine.state === MachineState.READY;
  const isRunning = machine.state === MachineState.RUNNING;
  const isPaused = machine.state === MachineState.PAUSED;
  const isFault = machine.state === MachineState.FAULT;
  const isEStop = machine.state === MachineState.EMERGENCY_STOP;
  const isConnected = machine.connected;
  const isHomed = machine.homed;
  const canRun = isConnected && isHomed && !isFault && !isEStop;

  return {
    machine,
    error,
    actions: {
      connect,
      disconnect,
      home,
      clamp,
      unclamp,
      setZero,
      startJob,
      pauseJob,
      resumeJob,
      stopJob,
      emergencyStop,
      resetFault,
      jog,
      simulateFault,
    },
    status: {
      isReady,
      isRunning,
      isPaused,
      isFault,
      isEStop,
      isConnected,
      isHomed,
      canRun,
    },
  };
}

export default useMachine;
