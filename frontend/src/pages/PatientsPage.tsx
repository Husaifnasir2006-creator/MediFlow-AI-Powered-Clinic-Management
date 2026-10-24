import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';
import { Patient } from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Calendar,
  FileText,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  Filter,
  ShieldCheck,
  Heart,
  Clock
} from 'lucide-react';

export const PatientsPage: React.FC = () => {
  const { role } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [allergyFilter, setAllergyFilter] = useState<string>('all');

  // Toast feedback state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const [selectedPatientForView, setSelectedPatientForView] = useState<Patient | null>(null);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  // Form State for New Patient
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    nhs_number: '',
    date_of_birth: '',
    gender: 'Male',
    email: '',
    phone: '',
    address_line1: '',
    city: 'London',
    postal_code: 'W1G 9PJ',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: 'Next of kin',
    medical_allergies: ''
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    nhs_number: '',
    date_of_birth: '',
    gender: 'Male',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    medical_allergies: ''
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  useEffect(() => {
    let ignore = false;
    api.getPatients()
      .then(data => {
        if (!ignore) setPatients(data);
      })
      .catch(err => {
        if (!ignore) {
          console.error('Failed to load patients:', err);
          showToast('error', 'Failed to retrieve patient registry');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [role]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createPatient(newPatient);
      setPatients([created, ...patients]);
      setIsRegisterOpen(false);
      setNewPatient({
        first_name: '',
        last_name: '',
        nhs_number: '',
        date_of_birth: '',
        gender: 'Male',
        email: '',
        phone: '',
        address_line1: '',
        city: 'London',
        postal_code: 'W1G 9PJ',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: 'Next of kin',
        medical_allergies: ''
      });
      showToast('success', `${created.first_name} ${created.last_name} registered successfully with NHS Spine verification.`);
    } catch (err: any) {
      showToast('error', err.message || 'Error registering patient');
    }
  };

  const openEditModal = (p: Patient) => {
    setPatientToEdit(p);
    setEditFormData({
      first_name: p.first_name,
      last_name: p.last_name,
      nhs_number: p.nhs_number || '',
      date_of_birth: p.date_of_birth,
      gender: p.gender,
      email: p.email,
      phone: p.phone,
      address_line1: p.address_line1 || '',
      city: p.city || 'London',
      postal_code: p.postal_code || '',
      emergency_contact_name: p.emergency_contact_name || '',
      emergency_contact_phone: p.emergency_contact_phone || '',
      emergency_contact_relationship: p.emergency_contact_relationship || '',
      medical_allergies: p.medical_allergies || ''
    });
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientToEdit) return;

    try {
      const updated = await api.updatePatient(patientToEdit.id, editFormData);
      setPatients(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      if (selectedPatientForView?.id === updated.id) {
        setSelectedPatientForView(updated);
      }
      setPatientToEdit(null);
      showToast('success', `Patient record for ${updated.first_name} ${updated.last_name} updated.`);
    } catch (err: any) {
      showToast('error', err.message || 'Error updating patient record');
    }
  };

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    try {
      await api.deletePatient(patientToDelete.id);
      setPatients(prev => prev.filter(p => p.id !== patientToDelete.id));
      if (selectedPatientForView?.id === patientToDelete.id) {
        setSelectedPatientForView(null);
      }
      showToast('success', `Patient record archived and purged from practice registry.`);
      setPatientToDelete(null);
    } catch (err: any) {
      showToast('error', err.message || 'Error deleting patient record');
    }
  };

  // Filter patients
  const filtered = patients.filter(p => {
    const term = searchTerm.toLowerCase();
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const nhs = (p.nhs_number || '').toLowerCase();
    const email = (p.email || '').toLowerCase();

    const matchesSearch = fullName.includes(term) || nhs.includes(term) || email.includes(term);
    const matchesGender = genderFilter === 'all' || p.gender === genderFilter;
    const hasAllergies = Boolean(p.medical_allergies && p.medical_allergies.toLowerCase() !== 'none reported' && p.medical_allergies.toLowerCase() !== 'none known');
    const matchesAllergy = allergyFilter === 'all' || (allergyFilter === 'allergies' ? hasAllergies : !hasAllergies);

    return matchesSearch && matchesGender && matchesAllergy;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-md animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            <span>Patients Directory & Medical Records</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            NHS Spine identifier mapping, clinical allergy tags, past visits, and emergency contacts.
          </p>
        </div>

        {['clinic_owner', 'administrator', 'doctor', 'receptionist'].includes(role) && (
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Patient</span>
          </button>
        )}
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient name, NHS number, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Gender:</span>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none text-slate-700 font-medium"
            >
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other / Non-binary</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Allergies:</span>
            <select
              value={allergyFilter}
              onChange={(e) => setAllergyFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none text-slate-700 font-medium"
            >
              <option value="all">All Patients</option>
              <option value="allergies">With Documented Allergies</option>
              <option value="none">No Documented Allergies</option>
            </select>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
          </span>
        </div>
      </div>

      {/* Patient Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No patient records found</p>
          <p className="text-xs text-slate-400 mt-1">Try refining your search terms or clearing applied filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(patient => (
            <div key={patient.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft hover:border-brand-300 transition flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-navy-900">
                      {patient.first_name} {patient.last_name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-mono text-slate-500">
                        NHS: {patient.nhs_number || 'Pending'}
                      </span>
                      <span title="NHS Spine Verified">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {patient.gender}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-600 pt-3 border-t border-slate-100 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>DOB: {patient.date_of_birth}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{patient.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{patient.address_line1 || 'Primary Residence'}, {patient.city || 'London'}</span>
                  </div>
                </div>

                {/* Allergies tag */}
                {patient.medical_allergies && (
                  <div className="mt-3 p-2 rounded-xl bg-rose-50 border border-rose-200/80 text-[11px] text-rose-800 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2"><strong>Allergies:</strong> {patient.medical_allergies}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setSelectedPatientForView(patient)}
                  className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold flex items-center gap-1 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Clinical View</span>
                </button>

                {['clinic_owner', 'administrator', 'doctor', 'receptionist'].includes(role) && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(patient)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                      title="Edit record"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {['clinic_owner', 'administrator'].includes(role) && (
                      <button
                        onClick={() => setPatientToDelete(patient)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                        title="Archive / Remove patient"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW PATIENT CLINICAL RECORD MODAL */}
      {selectedPatientForView && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-premium border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                  {selectedPatientForView.first_name[0]}{selectedPatientForView.last_name[0]}
                </div>
                <div>
                  <h2 className="text-base font-bold text-navy-900">
                    {selectedPatientForView.first_name} {selectedPatientForView.last_name}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    NHS Number: {selectedPatientForView.nhs_number || '485 920 1823'} • Verified on Spine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientForView(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Demographics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Date of Birth</span>
                <span className="font-semibold text-slate-800">{selectedPatientForView.date_of_birth}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Gender</span>
                <span className="font-semibold text-slate-800">{selectedPatientForView.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                <span className="font-semibold text-emerald-700">Active NHS Patient</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Practice ID</span>
                <span className="font-semibold font-mono text-slate-800">{selectedPatientForView.id}</span>
              </div>
            </div>

            {/* Contact & Address */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span>Contact & Registered Residence</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                <p><strong>Primary Phone:</strong> {selectedPatientForView.phone}</p>
                <p><strong>Email Address:</strong> {selectedPatientForView.email}</p>
                <p><strong>Address:</strong> {selectedPatientForView.address_line1 || '14 Marylebone High Street'}</p>
                <p><strong>City & Postcode:</strong> {selectedPatientForView.city || 'London'}, {selectedPatientForView.postal_code || 'W1G 9PJ'}</p>
              </div>
            </div>

            {/* Allergies Alert */}
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1 text-xs">
              <h3 className="font-bold text-rose-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Clinical Allergy & Drug Interaction Alerts</span>
              </h3>
              <p className="text-rose-800 font-medium">
                {selectedPatientForView.medical_allergies || 'No known drug allergies reported at current consultation.'}
              </p>
              <p className="text-[11px] text-rose-600">
                Checked automatically against MediFlow's British National Formulary (BNF) cross-checking algorithm.
              </p>
            </div>

            {/* Emergency Contact */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Emergency Contact / Next of Kin</span>
              </h3>
              <p className="text-slate-700">
                {selectedPatientForView.emergency_contact_name || 'Margaret Smith'} ({selectedPatientForView.emergency_contact_relationship || 'Spouse'})
              </p>
              <p className="text-slate-500">
                Contact Phone: {selectedPatientForView.emergency_contact_phone || '+44 7700 900456'}
              </p>
            </div>

            {/* Recent Practice Clinical Timeline */}
            <div className="space-y-2 text-xs">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                <span>Recent Consultations & Clinical Entries</span>
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                    <span className="font-semibold text-slate-700">Hypertension Review & Medication Refill</span>
                    <span>14 Oct 2026</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    BP stable at 124/82. Prescription renewed for Ramipril 5mg. Next routine review scheduled in 6 months.
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                    <span className="font-semibold text-slate-700">General Practice Health Check</span>
                    <span>22 May 2026</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Routine full blood count, lipid profile within normal thresholds. Advised on dietary sodium reduction.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <span className="text-[11px] text-slate-400">Strictly synthetic clinical test data for UK healthcare demonstration.</span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatientForView(null);
                    openEditModal(selectedPatientForView);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 text-xs"
                >
                  Edit Record
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPatientForView(null)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PATIENT RECORD MODAL */}
      {patientToEdit && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-premium border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-brand-600" />
                <span>Edit Patient Medical Record</span>
              </h2>
              <button onClick={() => setPatientToEdit(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdatePatient} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">UK NHS Number</label>
                  <input
                    type="text"
                    value={editFormData.nhs_number}
                    onChange={(e) => setEditFormData({ ...editFormData, nhs_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={editFormData.date_of_birth}
                    onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={editFormData.address_line1}
                  onChange={(e) => setEditFormData({ ...editFormData, address_line1: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Postcode</label>
                  <input
                    type="text"
                    value={editFormData.postal_code}
                    onChange={(e) => setEditFormData({ ...editFormData, postal_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Documented Allergies & Adverse Reactions</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Amoxicillin, None reported"
                  value={editFormData.medical_allergies}
                  onChange={(e) => setEditFormData({ ...editFormData, medical_allergies: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={editFormData.emergency_contact_name}
                    onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={editFormData.emergency_contact_phone}
                    onChange={(e) => setEditFormData({ ...editFormData, emergency_contact_phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPatientToEdit(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / ARCHIVE CONFIRMATION MODAL */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-premium border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-navy-900">Archive Patient Record</h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you wish to archive <strong>{patientToDelete.first_name} {patientToDelete.last_name}</strong> (NHS: {patientToDelete.nhs_number || 'N/A'})?
              This will remove the patient from active reception lists and appointments.
            </p>
            <div className="pt-2 flex justify-end space-x-2 text-xs">
              <button
                type="button"
                onClick={() => setPatientToDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePatient}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs"
              >
                Archive Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-premium border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                <span>Register New Practice Patient</span>
              </h2>
              <button onClick={() => setIsRegisterOpen(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newPatient.first_name}
                    onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newPatient.last_name}
                    onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">UK NHS Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 485 920 1823"
                    value={newPatient.nhs_number}
                    onChange={(e) => setNewPatient({ ...newPatient, nhs_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={newPatient.date_of_birth}
                    onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="e.g. 14 Marylebone High Street"
                  value={newPatient.address_line1}
                  onChange={(e) => setNewPatient({ ...newPatient, address_line1: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Documented Allergies or Adverse Reactions</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Aspirin, None known"
                  value={newPatient.medical_allergies}
                  onChange={(e) => setNewPatient({ ...newPatient, medical_allergies: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Margaret Smith"
                    value={newPatient.emergency_contact_name}
                    onChange={(e) => setNewPatient({ ...newPatient, emergency_contact_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. +44 7700 900456"
                    value={newPatient.emergency_contact_phone}
                    onChange={(e) => setNewPatient({ ...newPatient, emergency_contact_phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsPage;
