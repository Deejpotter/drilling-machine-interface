import React from 'react';
import useJobState from './hooks/useJobState';
import useJobDerived from './hooks/useJobDerived';
import SlotPatternForm from './components/SlotPatternForm';
import ExtrusionViz from './components/ExtrusionViz';
import ExportBar from './components/ExportBar';
import GcodePreview from './components/GcodePreview';

export default function App() {
  const state = useJobState();

  const derived = useJobDerived({
    profile: state.profile,
    face: state.face,
    faceNumber: state.faceNumber,
    materialLength: state.materialLength,
    orderNumber: state.orderNumber,
    slotPatternsSorted: state.slotPatternsSorted,
    slotMap: state.slotMap,
    slotPatterns: state.slotPatterns,
    filteredProfiles: state.filteredProfiles,
    profileId: state.profileId,
    selectedFaceIndex: state.selectedFaceIndex,
    setProfileId: state.setProfileId,
    setSelectedFaceIndex: state.setSelectedFaceIndex,
    setSlotPatterns: state.setSlotPatterns,
    setSlotToAdd: state.setSlotToAdd,
    setMaterialLength: state.setMaterialLength,
    setOrderNumber: state.setOrderNumber,
    setSaveMessage: state.setSaveMessage,
    setRepetitions: state.setRepetitions,
    repetitions: state.repetitions,
  });

  return (
    <div className="app">
      <header className="app-header">
        <h1>Drilling Machine Interface</h1>
        <button
          type="button"
          className="mode-toggle"
          onClick={state.toggleMode}
          title="Switch between simple and advanced mode"
        >
          {state.mode === 'simple' ? '⚙ Simple' : '⚙ Advanced'}
        </button>
      </header>

      <main className="main-content">
        <SlotPatternForm
          profile={state.profile}
          face={state.face}
          faceNumber={state.faceNumber}
          materialLength={state.materialLength}
          orderNumber={state.orderNumber}
          repetitions={state.repetitions}
          slotPatternsSorted={state.slotPatternsSorted}
          slotMap={state.slotMap}
          remainingSlots={state.remainingSlots}
          slotToAdd={state.slotToAdd}
          setSlotToAdd={state.setSlotToAdd}
          filteredHoleTypes={state.filteredHoleTypes}
          availableHolesForFace={state.availableHolesForFace}
          slotFitChecks={derived.slotFitChecks}
          setOrderNumber={state.setOrderNumber}
          setMaterialLength={state.setMaterialLength}
          setRepetitions={state.setRepetitions}
          updatePattern={state.updatePattern}
          updateEndFitting={state.updateEndFitting}
          addSlotPattern={state.addSlotPattern}
          removeSlotPattern={state.removeSlotPattern}
          addPatternToSlotHandler={state.addPatternToSlotHandler}
          removePatternFromSlotHandler={state.removePatternFromSlotHandler}
          copyPreviousPattern={state.copyPreviousPattern}
          handleProfileChange={state.handleProfileChange}
          handleFaceChange={state.handleFaceChange}
          filteredProfiles={state.filteredProfiles}
          selectedFaceIndex={state.selectedFaceIndex}
        />

        {/* Validity */}
        {!derived.hasOrderNumber && (
          <div className="validity-error">
            Order number is required for every job
          </div>
        )}
        {!derived.fits && (
          <div className="validity-error">
            Pattern overruns on S{derived.firstOverrun?.slotId} by {Math.abs(
              (derived.firstOverrun?.clearanceEnd ?? 0) < 0
                ? derived.firstOverrun.clearanceEnd
                : (derived.firstOverrun?.clearanceStart ?? 0)
            ).toFixed(0)}mm — reduce holes, spacing, or increase length
          </div>
        )}
        {!derived.slotSpacingValid && (
          <div className="validity-error">
            Slot spacing is {derived.firstSpacingViolation?.spacing}mm — milled slots must be at least {derived.firstSpacingViolation?.minRequired}mm apart
          </div>
        )}
        {derived.fits && derived.minClearance > 0 && derived.minClearance < 20 && (
          <div className="validity-warning">
            Last hole on at least one slot ends {derived.minClearance.toFixed(0)}mm from {derived.tightEnd} — tight clearance
          </div>
        )}

        <ExtrusionViz
          vizRows={derived.vizRows}
          materialLength={state.materialLength}
          faceWidth={state.faceWidth}
          vizScale={state.vizScale}
          fits={derived.fits}
          faceNumber={state.faceNumber}
        />

        <ExportBar
          job={derived.job}
          profile={state.profile}
          faceNumber={state.faceNumber}
          fits={derived.fits}
          canDownload={derived.canDownload}
          hasOrderNumber={derived.hasOrderNumber}
          slotPatternsSorted={state.slotPatternsSorted}
          handleSaveToDrive={derived.handleSaveToDrive}
          handleResetJob={derived.handleResetJob}
          saveMessage={state.saveMessage}
        />

        <GcodePreview
          gcode={derived.gcode}
          orderLabel={state.orderLabel}
          faceNumber={state.faceNumber}
          selectedSlotTags={state.selectedSlotTags}
          job={derived.job}
          materialLength={state.materialLength}
          slotPatternsSorted={state.slotPatternsSorted}
        />
      </main>
    </div>
  );
}
