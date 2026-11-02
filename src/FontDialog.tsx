import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/core'

type Props = {
  editor: Editor
  onClose: () => void
}

export function FontDialog({ editor, onClose }: Props) {
  const [fontFamily, setFontFamily] = useState('Times New Roman')
  const [fontSize, setFontSize] = useState('14')
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrike, setIsStrike] = useState(false)
  const [isSuperscript, setIsSuperscript] = useState(false)
  const [isSubscript, setIsSubscript] = useState(false)
  const [color, setColor] = useState('#000000')

  useEffect(() => {
    if (!editor) return
    setFontFamily(editor.getAttributes('textStyle').fontFamily || 'Times New Roman')
    setFontSize(editor.getAttributes('textStyle').fontSize?.replace('pt', '') || '14')
    setIsBold(editor.isActive('bold'))
    setIsItalic(editor.isActive('italic'))
    setIsUnderline(editor.isActive('underline'))
    setIsStrike(editor.isActive('strike'))
    setIsSuperscript(editor.isActive('superscript'))
    setIsSubscript(editor.isActive('subscript'))
    setColor(editor.getAttributes('textStyle').color || '#000000')
  }, [editor])

  const apply = () => {
    const chain = editor.chain().focus()
    chain.setFontFamily(fontFamily)
    chain.setFontSize(`${fontSize}pt`)
    chain.setColor(color)
    
    if (isBold) chain.setBold() ; else chain.unsetBold()
    if (isItalic) chain.setItalic() ; else chain.unsetItalic()
    if (isUnderline) chain.setUnderline() ; else chain.unsetUnderline()
    if (isStrike) chain.setStrike() ; else chain.unsetStrike()
    if (isSuperscript) chain.setSuperscript() ; else chain.unsetSuperscript()
    if (isSubscript) chain.setSubscript() ; else chain.unsetSubscript()

    chain.run()
    onClose()
  }

  return (
    <div className="word-dialog-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="word-dialog" style={{ width: '500px' }}>
        <div className="word-dialog-header">
          <span>Шрифт</span>
          <button onClick={onClose}>×</button>
        </div>
        
        <div className="word-dialog-tabs">
          <button className="active">Шрифт</button>
          <button disabled>Дополнительно</button>
        </div>

        <div className="word-dialog-content" style={{ display: 'flex', gap: '15px' }}>
          {}
          <div style={{ flex: 1 }}>
            <label className="word-label">Шрифт:</label>
            <select size={5} value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="word-listbox">
              <option>Times New Roman</option><option>Arial</option><option>Calibri</option>
              <option>Georgia</option><option>Verdana</option><option>Tahoma</option>
            </select>

            <label className="word-label" style={{ marginTop: '10px' }}>Цвет текста:</label>
            <select className="word-select" onChange={e => setColor(e.target.value)}>
              <option value="auto">Авто</option>
              <option value="#000000">Черный</option>
              <option value="#ff0000">Красный</option>
              <option value="#0000ff">Синий</option>
            </select>

            <div style={{ marginTop: '15px' }}>
              <label className="word-checkbox"><input type="checkbox" checked={isStrike} onChange={e => setIsStrike(e.target.checked)} /> зачеркнутый</label>
              <label className="word-checkbox"><input type="checkbox" checked={isSuperscript} onChange={e => setIsSuperscript(e.target.checked)} /> надстрочный</label>
              <label className="word-checkbox"><input type="checkbox" checked={isSubscript} onChange={e => setIsSubscript(e.target.checked)} /> подстрочный</label>
            </div>
          </div>

          {}
          <div style={{ flex: 1 }}>
            <label className="word-label">Начертание:</label>
            <select size={5} className="word-listbox">
              <option onClick={() => { setIsBold(false); setIsItalic(false) }}>обычный</option>
              <option onClick={() => { setIsBold(true); setIsItalic(false) }}>курсив</option>
              <option onClick={() => { setIsBold(true); setIsItalic(false) }}>полужирный</option>
              <option onClick={() => { setIsBold(true); setIsItalic(true) }}>полужирный курсив</option>
            </select>

            <label className="word-label" style={{ marginTop: '10px' }}>Размер:</label>
            <select size={5} value={fontSize} onChange={e => setFontSize(e.target.value)} className="word-listbox">
              {['8','9','10','11','12','14','16','18','20','22','24','26','28','36','48','72'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <div style={{ marginTop: '15px' }}>
              <label className="word-checkbox"><input type="checkbox" disabled /> все прописные</label>
              <label className="word-checkbox"><input type="checkbox" disabled /> скрытый</label>
            </div>
          </div>
        </div>

        <div className="word-dialog-preview">
          <label className="word-label">Образец</label>
          <div className="word-preview-box" style={{ 
            fontFamily, 
            fontSize: `${fontSize}pt`,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            textDecoration: `${isUnderline ? 'underline' : ''} ${isStrike ? 'line-through' : ''}`,
            color
          }}>
            AaBbCcYyZz
          </div>
        </div>

        <div className="word-dialog-footer">
          <button className="word-btn" onClick={() => {  }}>По умолчанию</button>
          <div style={{ flex: 1 }}></div>
          <button className="word-btn primary" onClick={apply}>ОК</button>
          <button className="word-btn" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  )
}