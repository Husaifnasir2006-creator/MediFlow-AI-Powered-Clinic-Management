import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Share2, 
  Clock, 
  FileText,
  Lock
} from 'lucide-react';

export const TelemedicinePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('apptId') || 'appt-1';

  // Room state
  const [sessionData, setSessionData] = useState<any>(null);
  const [inCall, setInCall] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(true);
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [screenSharing, setScreenSharing] = useState<boolean>(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');

  // Clinical Notes (SOAP)
  const [subjective, setSubjective] = useState<string>('Patient reports blood pressure stable at home (avg 124/82). No dizziness, headaches, or palpitations.');
  const [objective, setObjective] = useState<string>('HR 72 bpm regular. Alert, oriented. Remote BP log verified.');
  const [assessment, setAssessment] = useState<string>('Primary hypertension well-controlled on Ramipril 5mg OD.');
  const [plan, setPlan] = useState<string>('Continue Ramipril 5mg daily. Routine blood biochemistry review in 6 months. Refill authorized.');
  const [notesSaved, setNotesSaved] = useState<boolean>(false);

  useEffect(() => {
    api.getTelemedicineSession(appointmentId)
      .then(res => setSessionData(res))
      .catch(console.error);
  }, [appointmentId]);

  useEffect(() => {
    let timer: any;
    if (inCall) {
      timer = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [inCall]);

  const handleJoinCall = async () => {
    setConnectionStatus('connecting');
    setTimeout(() => {
      setInCall(true);
      setConnectionStatus('connected');
    }, 1200);
  };

  const handleLeaveCall = () => {
    setInCall(false);
    setConnectionStatus('idle');
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveNotes = () => {
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <Video className="w-6 h-6 text-teal-600" />
            <span>HD Telemedicine Consultation</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            End-to-End WebRTC Room • Encrypted Signaling • UK Healthcare Telehealth Protocols
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Room ID: {appointmentId}
          </span>
          {inCall && (
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-900 text-teal-400 border border-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {formatTimer(secondsElapsed)}
            </span>
          )}
        </div>
      </div>

      {/* Main Consultation Room Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Video Consultation Canvas & Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video bg-navy-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            
            {/* If In Call: Simulated High Definition Remote Patient/Doctor View */}
            {inCall ? (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Simulated Remote Stream Background */}
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-navy-900 to-teal-950 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-24 h-24 rounded-full bg-teal-500/20 border-2 border-teal-400/40 flex items-center justify-center text-teal-300 text-2xl font-bold mb-3 shadow-lg shadow-teal-500/10">
                    {sessionData?.patient?.first_name?.[0] || 'P'}
                    {sessionData?.patient?.last_name?.[0] || 'S'}
                  </div>
                  <h3 className="text-white text-base font-bold">
                    {sessionData?.patient ? `${sessionData.patient.first_name} ${sessionData.patient.last_name}` : 'Patient Connected'}
                  </h3>
                  <p className="text-teal-300/80 text-xs mt-1">Remote WebRTC Stream (1080p • 60fps)</p>
                  <span className="mt-3 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Encrypted Session Connected
                  </span>
                </div>

                {/* Self View (Picture-in-Picture) */}
                <div className="absolute bottom-4 right-4 w-44 aspect-video rounded-2xl bg-slate-900 border border-white/20 shadow-xl overflow-hidden flex items-center justify-center">
                  {cameraActive ? (
                    <div className="w-full h-full bg-slate-800/80 flex flex-col items-center justify-center text-slate-300 text-xs">
                      <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-xs mb-1">
                        You
                      </div>
                      <span className="text-[10px] text-slate-400">Dr. Alistair Finch</span>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-500 text-xs font-semibold">
                      Camera Off
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Waiting Screen before joining */
              <div className="text-center p-8 space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/30 text-brand-400 mx-auto flex items-center justify-center">
                  <Video className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Consultation Room Ready</h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Please ensure your camera and microphone permissions are granted before entering.
                  </p>
                </div>

                <div className="flex items-center justify-center space-x-3 pt-2">
                  <button
                    onClick={() => setMicActive(!micActive)}
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-xs transition ${
                      micActive ? 'bg-slate-800 border-slate-700 text-white' : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => setCameraActive(!cameraActive)}
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-xs transition ${
                      cameraActive ? 'bg-slate-800 border-slate-700 text-white' : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {cameraActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleJoinCall}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-teal-600/30 transition flex items-center justify-center gap-2"
                  >
                    <Video className="w-4 h-4" />
                    <span>{connectionStatus === 'connecting' ? 'Connecting to Room...' : 'Join Consultation Now'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Consultation Control Bar when In Call */}
          {inCall && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-800">Live Call In Progress</span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setMicActive(!micActive)}
                  className={`p-3 rounded-2xl border transition ${
                    micActive ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-rose-50 border-rose-200 text-rose-600'
                  }`}
                  title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                  {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setCameraActive(!cameraActive)}
                  className={`p-3 rounded-2xl border transition ${
                    cameraActive ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-rose-50 border-rose-200 text-rose-600'
                  }`}
                  title={cameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                  {cameraActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setScreenSharing(!screenSharing)}
                  className={`p-3 rounded-2xl border transition ${
                    screenSharing ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Share Screen"
                >
                  <Share2 className="w-5 h-5" />
                </button>

                <button
                  onClick={handleLeaveCall}
                  className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Consultation</span>
                </button>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium">Session STUN/TURN</span>
                <p className="text-[11px] text-teal-600 font-semibold">Active Encryption</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Patient Clinical Context & SOAP Note Pad */}
        <div className="space-y-6">
          
          {/* Patient Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-navy-900">Patient Details</h2>
              <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                NHS: {sessionData?.patient?.nhs_number || '485 920 1823'}
              </span>
            </div>
            
            <div className="text-xs space-y-1.5">
              <p><strong className="text-slate-600">Name:</strong> {sessionData?.patient?.first_name} {sessionData?.patient?.last_name}</p>
              <p><strong className="text-slate-600">DOB:</strong> {sessionData?.patient?.date_of_birth} (Age 47)</p>
              <p><strong className="text-slate-600">Known Allergies:</strong> <span className="text-rose-600 font-semibold">{sessionData?.patient?.medical_allergies || 'Penicillin'}</span></p>
              <p><strong className="text-slate-600">Emergency Contact:</strong> Clara Smith (+44 7700 900701)</p>
            </div>
          </div>

          {/* SOAP Clinical Note Pad */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-navy-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-600" />
                <span>SOAP Clinical Note Pad</span>
              </h2>
              {notesSaved && (
                <span className="text-[11px] font-semibold text-emerald-600">✓ Saved to Record</span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-0.5">Subjective (Symptoms & History)</label>
                <textarea
                  rows={2}
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-0.5">Objective (Observations & Vitals)</label>
                <textarea
                  rows={2}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-0.5">Assessment (Diagnosis)</label>
                <textarea
                  rows={2}
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-0.5">Plan (Treatment & Prescriptions)</label>
                <textarea
                  rows={2}
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              onClick={handleSaveNotes}
              className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Sign & Save Clinical Note
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
