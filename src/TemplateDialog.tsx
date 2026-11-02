import { useState } from 'react'
import type { Template } from './templates'
import { fillTemplate, validateTemplate } from './templates'

type Props = {
  template: Template
  onCancel: () => void
  onCreate: (html: string, title: string) => void
}

export function TemplateDialog({ template, onCancel, onCreate }: Props) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const set = (key: string, val: string) =>
    setValues(prev => ({ ...prev, [key]: val }))

  const submit = () => {
    const { ok, missing } = validateTemplate(template, values)
    if (!ok) {
      setError('Заполните обязательные поля: ' + missing.join(', '))
      return
    }
    onCreate(fillTemplate(template.html, values), template.name)
  }

  return (
    <div
      className="nd-dialog-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="nd-dialog" role="dialog" aria-modal="true">
        <div className="nd-dialog-header">
          <strong>Создать документ: {template.name}</strong>
          <button className="nd-dialog-close" onClick={onCancel} aria-label="Закрыть">×</button>
        </div>

        <div className="nd-dialog-content">
          {template.variables.map(v => (
            <label key={v.key} className="nd-dialog-field">
              {v.label}
              {v.required && <span style={{ color: 'crimson' }}> *</span>}
              {v.type === 'textarea' ? (
                <textarea
                  rows={3}
                  placeholder={v.placeholder}
                  value={values[v.key] ?? ''}
                  onChange={e => set(v.key, e.target.value)}
                />
              ) : (
                <input
                  type={v.type === 'date' ? 'date' : 'text'}
                  placeholder={v.placeholder}
                  value={values[v.key] ?? ''}
                  onChange={e => set(v.key, e.target.value)}
                />
              )}
            </label>
          ))}

          {error && (
            <div className="nd-dialog-hint" style={{ color: 'crimson' }}>
              {error}
            </div>
          )}
        </div>

        <div className="nd-dialog-footer">
          <button className="nd-dialog-button" onClick={onCancel}>Отмена</button>
          <button className="nd-dialog-button primary" onClick={submit}>
            Создать документ
          </button>
        </div>
      </div>
    </div>
  )
}