import type {
  CalendarEvent,
  Note,
  Reminder,
  UtilitiesMap,
} from '../types';

export const utilitiesMock: UtilitiesMap = {
  electricity: {
    type: 'electricity',
    label: 'Электричество',
    unit: 'кВт·ч',
    currentConsumption: 342,
    currentCost: 2840,
    readings: [
      { month: 'Фев', consumption: 298, cost: 2470 },
      { month: 'Мар', consumption: 275, cost: 2280 },
      { month: 'Апр', consumption: 260, cost: 2150 },
      { month: 'Май', consumption: 285, cost: 2360 },
      { month: 'Июн', consumption: 310, cost: 2570 },
      { month: 'Июл', consumption: 342, cost: 2840 },
    ],
  },
  water: {
    type: 'water',
    label: 'Вода',
    unit: 'м³',
    currentConsumption: 12.4,
    currentCost: 1860,
    readings: [
      { month: 'Фев', consumption: 10.2, cost: 1530 },
      { month: 'Мар', consumption: 9.8, cost: 1470 },
      { month: 'Апр', consumption: 11.1, cost: 1665 },
      { month: 'Май', consumption: 10.5, cost: 1575 },
      { month: 'Июн', consumption: 11.8, cost: 1770 },
      { month: 'Июл', consumption: 12.4, cost: 1860 },
    ],
  },
  gas: {
    type: 'gas',
    label: 'Газ',
    unit: 'м³',
    currentConsumption: 48,
    currentCost: 1920,
    readings: [
      { month: 'Фев', consumption: 72, cost: 2880 },
      { month: 'Мар', consumption: 65, cost: 2600 },
      { month: 'Апр', consumption: 42, cost: 1680 },
      { month: 'Май', consumption: 28, cost: 1120 },
      { month: 'Июн', consumption: 22, cost: 880 },
      { month: 'Июл', consumption: 48, cost: 1920 },
    ],
  },
};

export const calendarMock: CalendarEvent[] = [
  {
    id: '1',
    title: 'Оплата коммунальных',
    start: '2026-07-05T10:00:00',
    end: '2026-07-05T10:30:00',
    source: 'apple',
  },
  {
    id: '2',
    title: 'Проверка счётчиков',
    start: '2026-07-08T14:00:00',
    end: '2026-07-08T15:00:00',
    source: 'apple',
  },
  {
    id: '3',
    title: 'Встреча с управляющей компанией',
    start: '2026-07-12T11:00:00',
    end: '2026-07-12T12:00:00',
    source: 'apple',
  },
  {
    id: '4',
    title: 'Техобслуживание котла',
    start: '2026-07-18T09:00:00',
    end: '2026-07-18T11:00:00',
    source: 'apple',
  },
  {
    id: '5',
    title: 'Семейный ужин',
    start: '2026-07-20T19:00:00',
    end: '2026-07-20T21:00:00',
    source: 'apple',
  },
];

export const remindersMock: Reminder[] = [
  {
    id: '1',
    title: 'Оплатить электричество',
    dueDate: '2026-07-10',
    priority: 'high',
    completed: false,
  },
  {
    id: '2',
    title: 'Передать показания воды',
    dueDate: '2026-07-15',
    priority: 'medium',
    completed: false,
  },
  {
    id: '3',
    title: 'Проверить счётчики газа',
    dueDate: '2026-07-08',
    priority: 'high',
    completed: false,
  },
  {
    id: '4',
    title: 'Заказать фильтр для воды',
    dueDate: '2026-07-22',
    priority: 'low',
    completed: false,
  },
  {
    id: '5',
    title: 'Сравнить тарифы на отопление',
    dueDate: '2026-07-30',
    priority: 'medium',
    completed: true,
  },
];

export const notesMock: Note[] = [
  {
    id: '1',
    title: 'Тарифы 2026',
    content: 'Электричество: 8.31 ₽/кВт·ч. Вода: 45.2 ₽/м³. Газ: 7.23 ₽/м³.',
    color: 'yellow',
    updatedAt: '2026-07-01',
  },
  {
    id: '2',
    title: 'Номер управляющей',
    content: 'Диспетчерская: +7 (495) 123-45-67. Аварийная: +7 (495) 987-65-43.',
    color: 'blue',
    updatedAt: '2026-06-15',
  },
  {
    id: '3',
    title: 'Показания счётчиков',
    content: 'Эл: 12458 кВт·ч, Вода: 342 м³, Газ: 1890 м³ — на 01.07.2026',
    color: 'green',
    updatedAt: '2026-07-01',
  },
];
