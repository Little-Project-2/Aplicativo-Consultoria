import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { fetchProfile, updateProfile } from '../services/supabaseData';
import { setSession } from '../state/session';

function generateCode() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function ProfileSetup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    role: 'trainer',
    name: '',
    age: '',
    weight: '',
    height: '',
    goal: '',
    experience: '',
    bio: ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        navigate('/');
        return;
      }

      const profile = await fetchProfile(data.user.id);
      if (profile?.profile_complete) {
        setSession({ role: profile.role, name: profile.name || 'Perfil' });
        navigate(profile.role === 'student' ? '/student' : '/trainer');
        return;
      }

      setForm((prev) => ({
        ...prev,
        role: profile?.role || 'trainer',
        name: profile?.name || data.user.email?.split('@')[0] || ''
      }));
    };

    load();
  }, [navigate]);

  const handlePhotoChange = (file) => {
    setPhotoFile(file || null);
    if (!file) {
      setPreview('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result || '');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) throw new Error('Usuário não autenticado.');

      let avatarUrl = undefined;
      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const filePath = `profiles/${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, photoFile, { upsert: true });

        if (!uploadError) {
          const { data: publicUrl } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          avatarUrl = publicUrl?.publicUrl;
        } else {
          setMessage('Foto não enviada (bucket avatars não configurado).');
        }
      }

      const payload = {
        role: form.role,
        name: form.name,
        age: form.age ? Number(form.age) : null,
        weight: form.weight ? Number(form.weight) : null,
        height: form.height ? Number(form.height) : null,
        goal: form.goal || null,
        experience: form.experience || null,
        bio: form.bio || null,
        avatar_url: avatarUrl,
        profile_complete: true
      };

      if (form.role === 'trainer') {
        payload.trainer_code = generateCode();
      }

      const updated = await updateProfile(user.id, payload);
      setSession({ role: updated.role, name: updated.name || 'Perfil' });

      if (updated.role === 'student') {
        navigate('/student-connect');
      } else {
        navigate('/trainer');
      }
    } catch (err) {
      setError(err.message || 'Não foi possível salvar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-setup-page">
      <div className="profile-setup-card">
        <h1>Complete seu perfil</h1>
        <p className="subtitle">Essas informações ajudam a personalizar sua experiência.</p>

        {error && (
          <div className="gl-error-banner">
            <i className="ph-bold ph-warning-circle"></i>
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="gl-success-banner">
            <i className="ph-bold ph-check-circle"></i>
            <span>{message}</span>
          </div>
        )}

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="profile-section">
            <label>Você é</label>
            <div className="role-toggle">
              <label className={`role-option ${form.role === 'trainer' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="trainer"
                  checked={form.role === 'trainer'}
                  onChange={() => setForm({ ...form, role: 'trainer' })}
                />
                Treinador
              </label>
              <label className={`role-option ${form.role === 'student' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={form.role === 'student'}
                  onChange={() => setForm({ ...form, role: 'student' })}
                />
                Aluno
              </label>
            </div>
          </div>

          <div className="profile-grid">
            <div className="input-group">
              <label>Nome completo</label>
              <input
                className="q-input"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <label>Idade</label>
              <input
                className="q-input"
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Peso (kg)</label>
              <input
                className="q-input"
                type="number"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Altura (cm)</label>
              <input
                className="q-input"
                type="number"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
              />
            </div>
          </div>

          <div className="profile-grid">
            <div className="input-group">
              <label>Objetivo</label>
              <input
                className="q-input"
                type="text"
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                placeholder="Ex: Hipertrofia"
              />
            </div>
            <div className="input-group">
              <label>Nível de experiência</label>
              <input
                className="q-input"
                type="text"
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                placeholder="Ex: Intermediário"
              />
            </div>
          </div>

          <div className="input-group">
            <label>Bio</label>
            <textarea
              className="q-input"
              rows="3"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Fale um pouco sobre você"
            />
          </div>

          <div className="input-group">
            <label>Foto de perfil</label>
            <div className="photo-upload">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoChange(e.target.files?.[0])}
              />
              {preview && <img className="photo-preview" src={preview} alt="Prévia" />}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar perfil'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfileSetup;
