import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Button from '../components/common/Button';
import CityCombobox from '../components/common/CityCombobox';
import { validateEmail, validatePassword, checkEmailAvailable } from '../utils/auth';
import styles from './AuthPage.module.css';

// ─── Configuração dos tipos de participante ────────────────────────────────

const PARTICIPANT_TYPES = [
  { id: 'aluno',         label: 'Aluno',                        icon: '🎒' },
  { id: 'professor',     label: 'Professor(a)',                  icon: '📚' },
  { id: 'direcao',       label: 'Direção',                       icon: '🏫' },
  { id: 'administrativo',label: 'Administrativo',                icon: '💼' },
  { id: 'outra_escola',  label: 'Outra escola',                  icon: '🏛️' },
  { id: 'visitante',     label: 'Visitante / comunidade externa', icon: '🤝' },
];

// Campos extras por tipo: key = chave no form, required = se obriga validação
// cidadeSigla removida daqui — agora é gerada automaticamente da cidade selecionada
const EXTRA_FIELDS_CONFIG = {
  aluno: [
    {
      key: 'classGroup',
      label: 'Turma',
      placeholder: 'Ex: 9A, Turma 2',
      required: true,
    },
  ],
  professor: [
    { key: 'disciplina', label: 'Disciplina (opcional)',       placeholder: 'Ex: Matemática, Ciências', required: false },
    { key: 'escola',     label: 'Nome da escola (opcional)',   placeholder: 'Ex: E.E. João Silva',      required: false },
  ],
  direcao: [
    { key: 'cargo',      label: 'Cargo (opcional)',            placeholder: 'Ex: Diretor(a)',           required: false },
    { key: 'escola',     label: 'Nome da escola (opcional)',   placeholder: 'Ex: E.E. João Silva',     required: false },
  ],
  administrativo: [
    { key: 'funcao',     label: 'Função / Setor (opcional)',   placeholder: 'Ex: Secretaria',          required: false },
    { key: 'escola',     label: 'Nome da escola (opcional)',   placeholder: 'Ex: E.E. João Silva',     required: false },
  ],
  visitante: [
    { key: 'relacao',    label: 'Relação com a escola (opcional)', placeholder: 'Ex: Familiar de aluno', required: false },
    { key: 'escola',     label: 'Nome da escola (opcional)',   placeholder: 'Ex: E.E. João Silva',     required: false },
  ],
};

// ─── Componente ────────────────────────────────────────────────────────────

/** Subtipo apenas para participantType === outra_escola */
const OUTRA_ESCOLA_SUBTIPOS = [
  { id: 'aluno', label: 'Aluno' },
  { id: 'professor', label: 'Professor(a)' },
  { id: 'funcionario', label: 'Funcionário(a)' },
  { id: 'visitante', label: 'Visitante' },
];

const INITIAL_FORM = {
  name: '', email: '', password: '', participantType: '',
  classGroup: '', disciplina: '', cargo: '', funcao: '',
  escola: '', relacao: '',
  outraEscolaSubtipo: '',
};

// city = { nome, codigoIbge } | null

export default function RegisterPage() {
  const { registerUser } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [city, setCity] = useState(null);         // objeto { nome, codigoIbge } selecionado
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const extraFields = EXTRA_FIELDS_CONFIG[form.participantType] || [];

  function handle(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  }

  function selectType(typeId) {
    // Limpa campos extras ao trocar o tipo
    setForm((f) => ({
      ...INITIAL_FORM,
      name: f.name,
      email: f.email,
      password: f.password,
      participantType: typeId,
    }));
    setErrors((e) => ({ name: e.name, email: e.email, password: e.password }));
  }

  function selectOutraEscolaSubtipo(subId) {
    setForm((f) => ({
      ...f,
      outraEscolaSubtipo: subId,
      classGroup: subId === 'funcionario' || subId === 'visitante' ? '' : f.classGroup,
    }));
    setErrors((e) => ({ ...e, outraEscolaSubtipo: '', classGroup: '' }));
  }

  async function validate() {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = 'Digite seu nome completo.';
    if (!validateEmail(form.email))
      e.email = 'E-mail inválido.';
    else if (!(await checkEmailAvailable(form.email)))
      e.email = 'Este e-mail já está em uso.';
    if (!validatePassword(form.password))
      e.password = 'A senha deve ter pelo menos 6 caracteres.';
    if (!form.participantType)
      e.participantType = 'Selecione seu tipo de participante.';
    if (!city)
      e.cidade = 'Selecione sua cidade.';

    extraFields.forEach(({ key, label, required }) => {
      if (required && !form[key]?.trim()) {
        e[key] = `Informe ${label.replace(' (opcional)', '').toLowerCase()}.`;
      }
    });

    if (form.participantType === 'outra_escola') {
      if (!form.escola?.trim()) {
        e.escola = 'Informe o nome da escola.';
      }
      if (!form.outraEscolaSubtipo) {
        e.outraEscolaSubtipo = 'Selecione uma opção em “Você é”.';
      }
      if (form.outraEscolaSubtipo === 'aluno' && !form.classGroup?.trim()) {
        e.classGroup = 'Informe a turma.';
      }
    }

    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = await validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await registerUser({ ...form, cidade: city });
      navigate('/login');
    } catch (err) {
      if (err.code === 'email_in_use') {
        setErrors((prev) => ({ ...prev, email: 'Este e-mail já está em uso.' }));
      } else {
        setErrors((prev) => ({ ...prev, email: 'Não foi possível cadastrar. Tente novamente.' }));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card} style={{ maxWidth: 500 }}>
        <div className={styles.brand}>
          <span className={styles.brandEmoji}>🌿</span>
          <h1 className={styles.brandName}>Eco Ação</h1>
        </div>

        <h2 className={styles.heading}>Criar conta</h2>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>

          {/* ── Campos base ── */}
          <div className={styles.field}>
            <label className={styles.label}>Nome completo</label>
            <input
              className={[styles.input, errors.name ? styles.inputError : ''].join(' ')}
              type="text"
              placeholder="Ex: Ana Silva"
              value={form.name}
              onChange={(e) => handle('name', e.target.value)}
              autoFocus
              autoComplete="name"
            />
            {errors.name && <span className={styles.error}>{errors.name}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>E-mail</label>
            <input
              className={[styles.input, errors.email ? styles.inputError : ''].join(' ')}
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => handle('email', e.target.value)}
              autoComplete="email"
            />
            {errors.email && <span className={styles.error}>{errors.email}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Senha</label>
            <input
              className={[styles.input, errors.password ? styles.inputError : ''].join(' ')}
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={(e) => handle('password', e.target.value)}
              autoComplete="new-password"
            />
            {errors.password && <span className={styles.error}>{errors.password}</span>}
          </div>

          {/* ── Tipo de participante ── */}
          <div className={styles.field}>
            <label className={styles.label}>Você é…</label>
            <div className={styles.typeGrid}>
              {PARTICIPANT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={[
                    styles.typeCard,
                    form.participantType === t.id ? styles.typeCardSelected : '',
                  ].join(' ')}
                  onClick={() => selectType(t.id)}
                >
                  <span className={styles.typeIcon}>{t.icon}</span>
                  <span className={styles.typeLabel}>{t.label}</span>
                </button>
              ))}
            </div>
            {errors.participantType && (
              <span className={styles.error}>{errors.participantType}</span>
            )}
          </div>

          {/* ── Cidade (sempre visível, obrigatório) ── */}
          <div className={styles.field}>
            <label className={styles.label}>
              Cidade — RS
              <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.75rem', marginLeft: 6 }}>
                🔍 Busque ou use 📍
              </span>
            </label>
            <CityCombobox
              value={city}
              onChange={(c) => { setCity(c); setErrors((e) => ({ ...e, cidade: '' })); }}
              error={errors.cidade}
            />
            {errors.cidade && <span className={styles.error}>{errors.cidade}</span>}
          </div>

          {/* ── Campos dinâmicos ── */}
          {form.participantType === 'outra_escola' && (
            <div className={styles.extraFields}>
              <div className={styles.field}>
                <label className={styles.label}>Nome da escola</label>
                <input
                  className={[styles.input, errors.escola ? styles.inputError : ''].join(' ')}
                  type="text"
                  placeholder="Ex: E.E. João Silva"
                  value={form.escola}
                  onChange={(e) => handle('escola', e.target.value)}
                />
                {errors.escola && <span className={styles.error}>{errors.escola}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Você é:</label>
                <div className={styles.typeGrid}>
                  {OUTRA_ESCOLA_SUBTIPOS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={[
                        styles.typeCard,
                        form.outraEscolaSubtipo === t.id ? styles.typeCardSelected : '',
                      ].join(' ')}
                      onClick={() => selectOutraEscolaSubtipo(t.id)}
                    >
                      <span className={styles.typeLabel}>{t.label}</span>
                    </button>
                  ))}
                </div>
                {errors.outraEscolaSubtipo && (
                  <span className={styles.error}>{errors.outraEscolaSubtipo}</span>
                )}
              </div>

              {(form.outraEscolaSubtipo === 'aluno' || form.outraEscolaSubtipo === 'professor') && (
                <div className={styles.field}>
                  <label className={styles.label}>
                    Turma
                    {form.outraEscolaSubtipo === 'professor' && (
                      <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.75rem', marginLeft: 6 }}>
                        (opcional)
                      </span>
                    )}
                  </label>
                  <input
                    className={[styles.input, errors.classGroup ? styles.inputError : ''].join(' ')}
                    type="text"
                    placeholder="Ex: 9A"
                    value={form.classGroup}
                    onChange={(e) => handle('classGroup', e.target.value)}
                  />
                  {errors.classGroup && <span className={styles.error}>{errors.classGroup}</span>}
                </div>
              )}
            </div>
          )}

          {form.participantType !== 'outra_escola' && extraFields.length > 0 && (
            <div className={styles.extraFields}>
              {extraFields.map(({ key, label, placeholder }) => (
                <div key={key} className={styles.field}>
                  <label className={styles.label}>{label}</label>
                  <input
                    className={[styles.input, errors[key] ? styles.inputError : ''].join(' ')}
                    type="text"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => handle(key, e.target.value)}
                  />
                  {errors[key] && <span className={styles.error}>{errors[key]}</span>}
                </div>
              ))}
            </div>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? 'Cadastrando…' : 'Criar conta'}
          </Button>
        </form>

        <p className={styles.switch}>
          Já tem conta?{' '}
          <Link to="/login" className={styles.link}>Entrar</Link>
        </p>
      </div>
    </div>
  );
}
