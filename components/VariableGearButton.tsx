import React from 'react';
import { IntegrationCategory } from '../types';

interface VariableGearButtonProps {
  category?: IntegrationCategory;
  variableId?: string;
  onClick: (category?: IntegrationCategory, variableId?: string) => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VariableGearButton: React.FC<VariableGearButtonProps> = ({
  category,
  variableId,
  onClick,
  title = 'Configurar Variáveis e Credenciais (⚙️)',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs p-1 rounded-lg',
    md: 'w-8 h-8 text-sm p-1.5 rounded-xl',
    lg: 'w-10 h-10 text-base p-2 rounded-2xl'
  }[size];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(category, variableId);
      }}
      title={title}
      className={`bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center justify-center shadow-sm active:scale-90 cursor-pointer ${sizeClasses} ${className}`}
    >
      <span className="transition-transform hover:rotate-90 duration-300">⚙️</span>
    </button>
  );
};
