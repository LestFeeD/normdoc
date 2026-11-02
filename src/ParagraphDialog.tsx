import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/core'

type Props = {
  editor: Editor
  onClose: () => void
}

export function ParagraphDialog({ editor, onClose }: Props) {
  const [align, setAlign] = useState('left')
  const [indentLeft, setIndentLeft] = useState('0')
  const [indentRight, setIndentRight] = useState('0')
  const [indentFirst, setIndentFirst] = useState('0')
  const [spacingBefore, setSpacingBefore] = useState('0')
  const [spacingAfter, setSpacingAfter] = useState('8')
  const [lineHeight, setLineHeight] = useState('1.5')

  useEffect(() => {
    if (!editor) return
    const attrs = editor.getAttributes('paragraph')
    setAlign(attrs.textAlign || 'left')
    setSpacingBefore(attrs.marginTop?.replace('pt', '') || '0')
    setSpacingAfter(attrs.marginBottom?.replace('pt', '') || '8')
    setLineHeight(attrs.lineHeight || '1.5')
    setIndentLeft(attrs.marginLeft?.replace('cm', '') || '0')
    setIndentFirst(attrs.textIndent?.replace('cm', '') || '0')
  }, [editor])

  const apply = () => {
    editor.chain().focus()
      .setTextAlign(align)
      .updateAttributes('paragraph', {
        marginTop: `${spacingBefore}pt`,
        marginBottom: `${spacingAfter}pt`,
        lineHeight: lineHeight,
        marginLeft: `${indentLeft}cm`,
        marginRight: `${indentRight}cm`,
        textIndent: `${indentFirst}cm`
      })
      .run()
    onClose()
  }

  return (
    <div className="word-dialog-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="word-dialog" style={{ width: '520px' }}>
        <div className="word-dialog-header">
          <span>Абзац</span>
          <button onClick={onClose}>×</button>
        </div>
        
        <div className="word-dialog-tabs">
          <button className="active">Отступы и интервалы</button>
          <button disabled>Положение на странице</button>
        </div>

        <div className="word-dialog-content">
          <fieldset className="word-fieldset">
            <legend>Общие</legend>
            <div className="word-form-row">
              <label>Выравнивание:</label>
              <select value={align} onChange={e => setAlign(e.target.value)} className="word-select">
                <option value="left">По левому краю</option>
                <option value="center">По центру</option>
                <option value="right">По правому краю</option>
                <option value="justify">По ширине</option>
              </select>
            </div>
            <div className="word-form-row">
              <label>Уровень:</label>
              <select className="word-select"><option>Основной текст</option></select>
            </div>
          </fieldset>

          <fieldset className="word-fieldset">
            <legend>Отступы</legend>
            <div className="word-form-row">
              <label>Слева:</label>
              <input type="number" value={indentLeft} onChange={e => setIndentLeft(e.target.value)} /> см
              <label style={{ marginLeft: '15px' }}>Первая строка:</label>
              <input type="number" value={indentFirst} onChange={e => setIndentFirst(e.target.value)} /> см
            </div>
            <div className="word-form-row">
              <label>Справа:</label>
              <input type="number" value={indentRight} onChange={e => setIndentRight(e.target.value)} /> см
            </div>
          </fieldset>

          <fieldset className="word-fieldset">
            <legend>Интервал</legend>
            <div className="word-form-row">
              <label>Перед:</label>
              <input type="number" value={spacingBefore} onChange={e => setSpacingBefore(e.target.value)} /> пт
              <label style={{ marginLeft: '15px' }}>Междустрочный:</label>
              <select className="word-select" value={lineHeight} onChange={e => setLineHeight(e.target.value)}>
                <option value="1">Одинарный</option>
                <option value="1.5">Полуторный</option>
                <option value="2">Двойной</option>
                <option value="1.15">1.15</option>
              </select>
            </div>
            <div className="word-form-row">
              <label>После:</label>
              <input type="number" value={spacingAfter} onChange={e => setSpacingAfter(e.target.value)} /> пт
            </div>
          </fieldset>
        </div>

        <div className="word-dialog-footer">
          <button className="word-btn" disabled>Табуляция...</button>
          <div style={{ flex: 1 }}></div>
          <button className="word-btn primary" onClick={apply}>ОК</button>
          <button className="word-btn" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  )
}