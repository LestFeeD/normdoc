export type TemplateVariable = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'date'
  required?: boolean
  placeholder?: string
}

export type Template = {
  id: string
  name: string
  variables: TemplateVariable[]
  html: string
}

export const EMPTY_HTML = '<h1>Новый документ</h1><p></p>'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function fillTemplate(
  html: string,
  values: Record<string, string>,
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const raw = (values[key] ?? '').trim()
    if (!raw) return ''
    return escapeHtml(raw)
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>')
  })
}

export function validateTemplate(
  tpl: Template,
  values: Record<string, string>,
): { ok: boolean; missing: string[] } {
  const missing = tpl.variables
    .filter(v => v.required && !(values[v.key] ?? '').trim())
    .map(v => v.label)
  return { ok: missing.length === 0, missing }
}

export const TEMPLATES: Template[] = [
  {
    id: 'Пустой документ',
    name: 'Пустой документ',
    variables: [],
    html: EMPTY_HTML,
  },
  {
    id: 'Приказ',
    name: 'Приказ',
    variables: [
      { key: 'org', label: 'Наименование организации', type: 'text', required: true },
      { key: 'date', label: 'Дата', type: 'date', required: true },
      { key: 'number', label: 'Номер', type: 'text', required: true },
      { key: 'city', label: 'Город', type: 'text' },
      { key: 'title', label: 'О чём (кратко)', type: 'text', required: true },
      { key: 'preamble', label: 'Преамбула (В целях…)', type: 'textarea' },
      { key: 'body', label: 'Пункты приказа', type: 'textarea', required: true },
      { key: 'basis', label: 'Основание', type: 'text' },
      { key: 'signer', label: 'Подписант (должность, ФИО)', type: 'text', required: true },
    ],
    html: `
      <p style="text-align:center"><strong>{{org}}</strong></p>
      <h1 style="text-align:center">ПРИКАЗ</h1>
      <p>от «{{date}}» № {{number}}</p>
      <p>{{city}}</p>
      <h2 style="text-align:center">О {{title}}</h2>
      <p>{{preamble}}</p>
      <p><strong>ПРИКАЗЫВАЮ:</strong></p>
      <p>{{body}}</p>
      <p>Основание: {{basis}}</p>
      <p style="text-align:right">{{signer}}</p>
    `,
  },
  {
    id: 'Распоряжение',
    name: 'Распоряжение',
    variables: [
      { key: 'org', label: 'Наименование организации', type: 'text', required: true },
      { key: 'date', label: 'Дата', type: 'date', required: true },
      { key: 'number', label: 'Номер', type: 'text', required: true },
      { key: 'city', label: 'Город', type: 'text' },
      { key: 'title', label: 'О чём (кратко)', type: 'text', required: true },
      { key: 'preamble', label: 'Преамбула (В целях…)', type: 'textarea' },
      { key: 'body', label: 'Пункты распоряжения', type: 'textarea', required: true },
      { key: 'deadline', label: 'Срок исполнения', type: 'text' },
      { key: 'signer', label: 'Подписант', type: 'text', required: true },
    ],
    html: `
      <p style="text-align:center"><strong>{{org}}</strong></p>
      <h1 style="text-align:center">РАСПОРЯЖЕНИЕ</h1>
      <p>от «{{date}}» № {{number}}</p>
      <p>{{city}}</p>
      <h2 style="text-align:center">О {{title}}</h2>
      <p>{{preamble}}</p>
      <p><strong>ОБЯЗЫВАЮ:</strong></p>
      <p>{{body}}</p>
      <p>Срок исполнения: {{deadline}}</p>
      <p style="text-align:right">{{signer}}</p>
    `,
  },
  {
    id: 'Служебная записка',
    name: 'Служебная записка',
    variables: [
      { key: 'to', label: 'Кому', type: 'text', required: true },
      { key: 'from', label: 'От кого', type: 'text', required: true },
      { key: 'date', label: 'Дата', type: 'date', required: true },
      { key: 'topic', label: 'Тема', type: 'text', required: true },
      { key: 'reason', label: 'В связи с', type: 'textarea' },
      { key: 'request', label: 'Прошу', type: 'textarea', required: true },
      { key: 'appendix', label: 'Приложение', type: 'text' },
      { key: 'signer', label: 'Подпись', type: 'text' },
    ],
    html: `
      <p style="text-align:right">Кому: {{to}}</p>
      <p style="text-align:right">От кого: {{from}}</p>
      <h1 style="text-align:center">СЛУЖЕБНАЯ ЗАПИСКА</h1>
      <p>Дата: {{date}}</p>
      <p>Тема: {{topic}}</p>
      <p>В связи с {{reason}}</p>
      <p>Прошу {{request}}</p>
      <p>Приложение: {{appendix}}</p>
      <p style="text-align:right">{{signer}}</p>
    `,
  },
  {
    id: 'Официальное письмо',
    name: 'Официальное письмо',
    variables: [
      { key: 'addressee', label: 'Адресат', type: 'text', required: true },
      { key: 'address', label: 'Адрес', type: 'text' },
      { key: 'outNumber', label: 'Исх. №', type: 'text', required: true },
      { key: 'outDate', label: 'Дата исходящего', type: 'date', required: true },
      { key: 'name', label: 'Обращение (Уважаемый…)', type: 'text' },
      { key: 'body', label: 'Текст письма', type: 'textarea', required: true },
      { key: 'signer', label: 'Подпись', type: 'text' },
    ],
    html: `
      <p style="text-align:right">Адресат: {{addressee}}</p>
      <p style="text-align:right">Адрес: {{address}}</p>
      <p>Исх. № {{outNumber}} от {{outDate}}</p>
      <p>{{name}}</p>
      <p>{{body}}</p>
      <p>С уважением,</p>
      <p style="text-align:right">{{signer}}</p>
    `,
  },
  {
    id: 'Протокол',
    name: 'Протокол',
    variables: [
      { key: 'org', label: 'Наименование организации', type: 'text', required: true },
      { key: 'number', label: 'Номер протокола', type: 'text', required: true },
      { key: 'subject', label: 'Совещания / заседания (о чём)', type: 'text' },
      { key: 'date', label: 'Дата', type: 'date', required: true },
      { key: 'place', label: 'Место проведения', type: 'text' },
      { key: 'chair', label: 'Председатель', type: 'text', required: true },
      { key: 'secretary', label: 'Секретарь', type: 'text', required: true },
      { key: 'present', label: 'Присутствовали', type: 'textarea' },
      { key: 'agenda', label: 'Повестка дня', type: 'textarea', required: true },
      { key: 'heard', label: 'СЛУШАЛИ', type: 'textarea', required: true },
      { key: 'decided', label: 'РЕШИЛИ', type: 'textarea', required: true },
    ],
    html: `
      <p style="text-align:center"><strong>{{org}}</strong></p>
      <h1 style="text-align:center">ПРОТОКОЛ № {{number}}</h1>
      <p style="text-align:center">{{subject}}</p>
      <p>Дата: {{date}}</p>
      <p>Место проведения: {{place}}</p>
      <p>Председатель: {{chair}}</p>
      <p>Секретарь: {{secretary}}</p>
      <p>Присутствовали: {{present}}</p>
      <h2>ПОВЕСТКА ДНЯ</h2>
      <p>{{agenda}}</p>
      <h2>СЛУШАЛИ</h2>
      <p>{{heard}}</p>
      <h2>РЕШИЛИ</h2>
      <p>{{decided}}</p>
      <p>Председатель: {{chair}}</p>
      <p>Секретарь: {{secretary}}</p>
    `,
  },
  {
    id: 'Акт',
    name: 'Акт',
    variables: [
      { key: 'org', label: 'Наименование организации', type: 'text', required: true },
      { key: 'number', label: 'Номер акта', type: 'text', required: true },
      { key: 'about', label: 'О чём акт', type: 'text', required: true },
      { key: 'city', label: 'Город', type: 'text' },
      { key: 'date', label: 'Дата', type: 'date', required: true },
      { key: 'commission', label: 'Состав комиссии', type: 'textarea', required: true },
      { key: 'body', label: 'Содержание акта', type: 'textarea', required: true },
      { key: 'conclusion', label: 'Выводы комиссии', type: 'textarea' },
      { key: 'appendix', label: 'Приложения', type: 'text' },
      { key: 'chair', label: 'Председатель комиссии', type: 'text', required: true },
      { key: 'members', label: 'Члены комиссии', type: 'textarea' },
    ],
    html: `
      <p style="text-align:center"><strong>{{org}}</strong></p>
      <h1 style="text-align:center">АКТ № {{number}}</h1>
      <p style="text-align:center">о {{about}}</p>
      <p>{{city}}</p>
      <p>{{date}}</p>
      <p>Комиссия в составе:</p>
      <p>{{commission}}</p>
      <p>составила настоящий акт о нижеследующем:</p>
      <p>{{body}}</p>
      <p><strong>Выводы комиссии:</strong> {{conclusion}}</p>
      <p>Приложения: {{appendix}}</p>
      <p>Председатель комиссии: {{chair}}</p>
      <p>Члены комиссии:</p>
      <p>{{members}}</p>
    `,
  },
  {
    id: 'Постановление',
    name: 'Постановление',
    variables: [
      { key: 'org', label: 'Наименование органа', type: 'text', required: true },
      { key: 'date', label: 'Дата', type: 'date', required: true },
      { key: 'number', label: 'Номер', type: 'text', required: true },
      { key: 'city', label: 'Город', type: 'text' },
      { key: 'title', label: 'О чём (кратко)', type: 'text', required: true },
      { key: 'legal', label: 'Руководствуясь…', type: 'textarea' },
      { key: 'body', label: 'Постановляю (пункты)', type: 'textarea', required: true },
      { key: 'effective', label: 'Вступает в силу', type: 'text' },
      { key: 'signer', label: 'Подписант', type: 'text', required: true },
    ],
    html: `
      <p style="text-align:center"><strong>{{org}}</strong></p>
      <h1 style="text-align:center">ПОСТАНОВЛЕНИЕ</h1>
      <p>от «{{date}}» № {{number}}</p>
      <p>{{city}}</p>
      <h2 style="text-align:center">О {{title}}</h2>
      <p>Руководствуясь {{legal}},</p>
      <p><strong>ПОСТАНОВЛЯЕТ:</strong></p>
      <p>{{body}}</p>
      <p>Настоящее постановление вступает в силу {{effective}}.</p>
      <p style="text-align:right">{{signer}}</p>
    `,
  },
]

const TEMPLATES_BY_ID: Record<string, Template> = Object.fromEntries(
  TEMPLATES.map(t => [t.id, t]),
)

export function getTemplate(id: string): Template {
  return TEMPLATES_BY_ID[id] ?? TEMPLATES[0]
}