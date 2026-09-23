// 👇 ИЗМЕНИ ЭТО на IP своего телефона с Termux
// Запусти start.sh — он покажет твой IP
export const SERVER_URL = 'http://192.168.1.100:3000';

export const SOCKET_URL = SERVER_URL;

export const SCHOOLS = [
  { id: 'n7', label: 'Школа №7', emoji: '🏫', color: '#4488FF' },
  { id: 'n4', label: 'Школа №4', emoji: '🏫', color: '#FF4488' },
];

export const SUBJECTS = [
  'Математика', 'Алгебра', 'Геометрия', 'Русский язык', 'Литература',
  'Физика', 'Химия', 'Биология', 'История', 'Обществознание',
  'География', 'Информатика', 'Английский язык', 'Физкультура', 'Другое'
];

export const ANNOUNCEMENT_CATEGORIES = [
  { id: 'found',    emoji: '🔵', label: 'Найдено',      color: '#4488FF' },
  { id: 'meeting',  emoji: '🟢', label: 'Собрание',     color: '#44BB66' },
  { id: 'team',     emoji: '🟡', label: 'Команда',      color: '#FFB800' },
  { id: 'lost',     emoji: '🔴', label: 'Потеряно',     color: '#FF4444' },
  { id: 'olympiad', emoji: '🟣', label: 'Олимпиада',    color: '#AA44FF' },
  { id: 'other',    emoji: '⚪', label: 'Другое',       color: '#888888' },
];

export const LEVELS = ['Начинающий', 'Средний', 'Продвинутый'];

export const CLASS_LETTERS = ['А', 'Б', 'В', 'Г', 'Д'];
export const CLASS_NUMBERS = ['5','6','7','8','9','10','11'];
