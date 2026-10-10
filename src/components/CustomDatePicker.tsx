import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // Formato YYYY-MM-DD
  onChange: (newDateStr: string) => void;
  id?: string;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  id = 'custom-date-picker',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse da data selecionada
  const parseSelectedDate = () => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth(),
        day: now.getDate(),
      };
    }
    const [y, m, d] = value.split('-').map(Number);
    return {
      year: y,
      month: m - 1, // 0-indexed
      day: d,
    };
  };

  const selectedDate = parseSelectedDate();

  // Mês e ano em exibição no calendário
  const [viewYear, setViewYear] = useState<number>(selectedDate.year);
  const [viewMonth, setViewMonth] = useState<number>(selectedDate.month);

  // Sincroniza visualização com a data selecionada caso o valor mude externamente
  useEffect(() => {
    const s = parseSelectedDate();
    setViewYear(s.year);
    setViewMonth(s.month);
  }, [value]);

  // Fecha o popup ao clicar fora ou pressionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Navegação de mês
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Selecionar dia
  const handleSelectDay = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const newDateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;
    onChange(newDateStr);
    setIsOpen(false);
  };

  // Selecionar hoje
  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    onChange(todayStr);
    setViewYear(y);
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Cálculos da grade do calendário
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Domingo
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Dias do mês anterior para preenchimento
  const prevMonthDays: number[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevMonthDays.push(daysInPrevMonth - i);
  }

  // Dias do mês atual
  const currentMonthDays: number[] = [];
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    currentMonthDays.push(i);
  }

  // Dias do próximo mês para completar 35 ou 42 células
  const totalSlots = Math.ceil((firstDayOfWeek + daysInCurrentMonth) / 7) * 7;
  const nextMonthDaysCount = totalSlots - (prevMonthDays.length + currentMonthDays.length);
  const nextMonthDays: number[] = [];
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    nextMonthDays.push(i);
  }

  // Formatação para exibição no campo principal: DD/MM/AAAA
  const formattedDisplayDate = () => {
    const d = String(selectedDate.day).padStart(2, '0');
    const m = String(selectedDate.month + 1).padStart(2, '0');
    const y = selectedDate.year;
    return `${d}/${m}/${y}`;
  };

  // Verifica se é hoje
  const now = new Date();
  const isToday = (day: number) =>
    now.getFullYear() === viewYear &&
    now.getMonth() === viewMonth &&
    now.getDate() === day;

  // Verifica se é a data selecionada
  const isSelected = (day: number) =>
    selectedDate.year === viewYear &&
    selectedDate.month === viewMonth &&
    selectedDate.day === day;

  return (
    <div className="custom-datepicker-container" ref={containerRef}>
      {/* Botão de disparo com aparência de input premium */}
      <button
        type="button"
        id={id}
        className={`custom-datepicker-trigger ${isOpen ? 'active-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="datepicker-trigger-left">
          <CalendarIcon size={18} className="text-gold" />
          <span className="datepicker-display-date">{formattedDisplayDate()}</span>
        </div>
        <ChevronDown size={18} className={`datepicker-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {/* Popup / Modal do Calendário */}
      {isOpen && (
        <div className="custom-datepicker-popup" role="dialog" aria-label="Seletor de Calendário">
          {/* Cabeçalho do Mês e Navegação */}
          <div className="datepicker-header">
            <button
              type="button"
              className="datepicker-nav-btn"
              onClick={handlePrevMonth}
              title="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="datepicker-current-month">
              <span className="month-name">{MONTH_NAMES[viewMonth]}</span>
              <span className="year-number">{viewYear}</span>
            </div>
            <button
              type="button"
              className="datepicker-nav-btn"
              onClick={handleNextMonth}
              title="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="datepicker-weekdays-row">
            {WEEKDAY_NAMES.map((name) => (
              <span key={name} className="datepicker-weekday-cell">
                {name}
              </span>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="datepicker-days-grid">
            {/* Dias do mês anterior */}
            {prevMonthDays.map((d) => (
              <span key={`prev-${d}`} className="datepicker-day-cell outside-month">
                {d}
              </span>
            ))}

            {/* Dias do mês atual */}
            {currentMonthDays.map((d) => {
              const selected = isSelected(d);
              const today = isToday(d);

              return (
                <button
                  type="button"
                  key={`day-${d}`}
                  className={`datepicker-day-cell current-month ${
                    selected ? 'selected-day' : ''
                  } ${today ? 'today-day' : ''}`}
                  onClick={() => handleSelectDay(d)}
                >
                  {d}
                </button>
              );
            })}

            {/* Dias do próximo mês */}
            {nextMonthDays.map((d) => (
              <span key={`next-${d}`} className="datepicker-day-cell outside-month">
                {d}
              </span>
            ))}
          </div>

          {/* Barra inferior com atalhos */}
          <div className="datepicker-footer">
            <button
              type="button"
              className="btn-datepicker-today"
              onClick={handleSelectToday}
            >
              Hoje
            </button>
            <button
              type="button"
              className="btn-datepicker-close"
              onClick={() => setIsOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
