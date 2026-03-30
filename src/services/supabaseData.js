import { supabase } from '../lib/supabaseClient';

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function fetchProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function ensureProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const existing = await fetchProfile(user.id);
  if (existing) return existing;

  const profile = {
    id: user.id,
    role: 'trainer',
    name: user.user_metadata?.full_name || user.email || 'Treinador',
    profile_complete: false
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId, payload) {
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTrainerByCode(code) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, trainer_code')
    .eq('trainer_code', code)
    .eq('role', 'trainer')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createStudent(payload) {
  const { data, error } = await supabase
    .from('students')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStudent(id, payload) {
  const { data, error } = await supabase
    .from('students')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchWorkoutPlan(studentId) {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveWorkoutPlan(studentId, blocks) {
  const { data, error } = await supabase
    .from('workout_plans')
    .upsert({ student_id: studentId, blocks }, { onConflict: 'student_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchDietPlan(studentId) {
  const { data, error } = await supabase
    .from('diet_plans')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveDietPlan(studentId, meals) {
  const { data, error } = await supabase
    .from('diet_plans')
    .upsert({ student_id: studentId, meals }, { onConflict: 'student_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchWorkoutHistory(studentId) {
  const { data, error } = await supabase
    .from('workout_history')
    .select('*')
    .eq('student_id', studentId)
    .order('completed_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchRecentWorkoutHistory(limit = 6) {
  const { data, error } = await supabase
    .from('workout_history')
    .select('*')
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function addWorkoutHistory(entry) {
  const { data, error } = await supabase
    .from('workout_history')
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data;
}
