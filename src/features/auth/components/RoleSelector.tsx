type RoleName = 'trainer' | 'student';

type RoleSelectorProps = {
  value: RoleName;
  onChange: (role: RoleName) => void;
};

const roleOptions: Array<{
  description: string;
  icon: string;
  label: string;
  value: RoleName;
}> = [
  {
    description: 'Gerenciar alunos, treinos e dietas',
    icon: 'ph-barbell',
    label: 'Entrar como Treinador',
    value: 'trainer'
  },
  {
    description: 'Acessar treino, dieta e acompanhamento',
    icon: 'ph-user-focus',
    label: 'Entrar como Aluno',
    value: 'student'
  }
];

export function RoleSelector({ onChange, value }: RoleSelectorProps) {
  return (
    <div className="authx-role-group" role="radiogroup" aria-label="Tipo de acesso">
      {roleOptions.map((option) => {
        const selected = option.value === value;

        return (
          <button
            aria-checked={selected}
            aria-label={option.label}
            className="authx-role-option"
            data-selected={selected ? 'true' : 'false'}
            key={option.value}
            onClick={() => onChange(option.value)}
            role="radio"
            type="button"
          >
            <span className="authx-role-icon" aria-hidden="true">
              <i className={`ph-bold ${option.icon}`} />
            </span>
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
