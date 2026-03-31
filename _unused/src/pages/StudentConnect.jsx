import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { fetchProfile, updateProfile, fetchTrainerByCode, createStudent } from '../services/supabaseData';
import { setSession } from '../state/session';
import useLocalStorage from '../hooks/useLocalStorage';

function StudentConnect() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [, setCurrentStudentId] = useLocalStorage('currentStudentId', '');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        navigate('/');
        return;
      }
      const profile = await fetchProfile(data.user.id);
      if (!profile) return;
      if (profile.role !== 'student') {
        setSession({ role: profile.role, name: profile.name || 'Treinador' });
        navigate('/trainer');
        return;
      }
      if (profile.trainer_id) {
        setSession({ role: 'student', name: profile.name || 'Aluno' });
        navigate('/student');
      }
    };

    load();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanCode = code.replace(/\D/g, '').slice(0, 5);
      if (cleanCode.length !== 5) {
        setError('Digite um código válido de 5 dígitos.');
        return;
      }

      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) throw new Error('Usuário não autenticado.');

      const trainer = await fetchTrainerByCode(cleanCode);
      if (!trainer) {
        setError('Código não encontrado. Confirme com seu treinador.');
        return;
      }

      const student = await createStudent({
        trainer_id: trainer.id,
        user_id: user.id,
        name: trainer.student_name || (user.user_metadata?.full_name || user.email || 'Aluno'),
        status: 'active',
        status_text: 'Ativo'
      });

      await updateProfile(user.id, {
        trainer_id: trainer.id,
        connected_trainer_code: cleanCode
      });

      setCurrentStudentId(student.id);
      setSession({ role: 'student', name: student.name || 'Aluno' });
      navigate('/student');
    } catch (err) {
      setError(err.message || 'Não foi possível conectar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-setup-page">
      <div className="profile-setup-card">
        <h1>Conectar com seu treinador</h1>
        <p className="subtitle">Digite o código fornecido pelo seu treinador para liberar seu painel.</p>

        {error && (
          <div className="gl-error-banner">
            <i className="ph-bold ph-warning-circle"></i>
            <span>{error}</span>
          </div>
        )}

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Código do treinador</label>
            <input
              className="q-input gl-input-code"
              type="tel"
              placeholder="00000"
              maxLength="5"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Conectando...' : 'Conectar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default StudentConnect;
