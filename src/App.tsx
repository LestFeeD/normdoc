import { useCallback, useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import { Extension } from '@tiptap/core'
import type { JSONContent } from '@tiptap/core'
import type { CSSProperties } from 'react'
import {
  Clipboard, Scissors, Copy, Type, Bold, Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Palette, Highlighter, Eraser,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Indent, Outdent, ArrowUpDown, Pilcrow,
  Table as TableIcon,
  Link as LinkIcon,
  Minus, Calendar, ChevronDown, PaintBucket,
  FilePlus, FileDigit, Grid3X3, Image as ImageIcon, Shapes,
  PieChart, AlignStartVertical, FileText, PenTool, Clock, BadgeCheck, PenLine
} from 'lucide-react'

import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'

import { FontSize } from './FontSize'
import type { Template } from './templates'
import { EMPTY_HTML, TEMPLATES, fillTemplate, getTemplate } from './templates'
import { TemplateDialog } from './TemplateDialog'
import { FontDialog } from './FontDialog'
import { ParagraphDialog } from './ParagraphDialog'
import './App.css'

type PageSettings = {
  format: 'A4' | 'A3' | 'Letter'
  orientation: 'portrait' | 'landscape'
  top: number
  right: number
  bottom: number
  left: number
  columns: number 
}

type DocItem = {
  id: string
  title: string
  type: string
  content: string
  updatedAt: string
  page: PageSettings
}

const DEFAULT_PAGE: PageSettings = {
  format: 'A4',
  orientation: 'portrait',
  top: 20,   
  right: 15, 
  bottom: 20,
  left: 30, 
  columns: 1 
}

const uid = () => crypto.randomUUID()

function createDocumentFromTemplate(
  templateId: string,
  values: Record<string, string> = {},
): DocItem {
  const tpl = getTemplate(templateId)
  return {
    id: uid(),
    title: tpl.id === 'Пустой документ' ? 'Новый документ' : tpl.name,
    type: tpl.id,
    content: fillTemplate(tpl.html, values),
    updatedAt: new Date().toISOString(),
    page: { ...DEFAULT_PAGE },
  }
}

const ParagraphFormatting = Extension.create({
  name: 'paragraphFormatting',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          marginTop: {
            default: null,
            parseHTML: element => element.style.marginTop || null,
            renderHTML: attributes => attributes.marginTop ? { style: `margin-top:${attributes.marginTop}` } : {},
          },
          marginBottom: {
            default: null,
            parseHTML: element => element.style.marginBottom || null,
            renderHTML: attributes => attributes.marginBottom ? { style: `margin-bottom:${attributes.marginBottom}` } : {},
          },
          marginLeft: {
            default: null,
            parseHTML: element => element.style.marginLeft || null,
            renderHTML: attributes => attributes.marginLeft ? { style: `margin-left:${attributes.marginLeft}` } : {},
          },
          marginRight: {
            default: null,
            parseHTML: element => element.style.marginRight || null,
            renderHTML: attributes => attributes.marginRight ? { style: `margin-right:${attributes.marginRight}` } : {},
          },
          lineHeight: {
            default: null,
            parseHTML: element => element.style.lineHeight || null,
            renderHTML: attributes => attributes.lineHeight ? { style: `line-height:${attributes.lineHeight}` } : {},
          },
          textIndent: {
            default: null,
            parseHTML: element => element.style.textIndent || null,
            renderHTML: attributes => attributes.textIndent ? { style: `text-indent:${attributes.textIndent}` } : {},
          },
          backgroundColor: {
            default: null,
            parseHTML: element => element.style.backgroundColor || null,
            renderHTML: attributes => attributes.backgroundColor ? { style: `background-color:${attributes.backgroundColor}` } : {},
          },
        },
      },
    ]
  },
})

function readDocuments(): DocItem[] {
  try {
    const value = localStorage.getItem('normdoc-documents')
    if (!value) return [createDocumentFromTemplate('Пустой документ')]
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed) || parsed.length === 0) return [createDocumentFromTemplate('Пустой документ')]

    return parsed.map((item: any) => {
      const savedPage = item?.page ?? {}
      return {
        id: item?.id || uid(),
        title: typeof item?.title === 'string' ? item.title : 'Новый документ',
        type: typeof item?.type === 'string' ? item.type : 'Пустой документ',
        content: typeof item?.content === 'string' ? item.content : EMPTY_HTML,
        updatedAt: typeof item?.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
        page: {
          ...DEFAULT_PAGE,
          ...savedPage,
          format: ['A4', 'A3', 'Letter'].includes(savedPage.format) ? savedPage.format : DEFAULT_PAGE.format,
          orientation: ['portrait', 'landscape'].includes(savedPage.orientation) ? savedPage.orientation : DEFAULT_PAGE.orientation,
          top: Number.isFinite(Number(savedPage.top)) ? Number(savedPage.top) : DEFAULT_PAGE.top,
          right: Number.isFinite(Number(savedPage.right)) ? Number(savedPage.right) : DEFAULT_PAGE.right,
          bottom: Number.isFinite(Number(savedPage.bottom)) ? Number(savedPage.bottom) : DEFAULT_PAGE.bottom,
          left: Number.isFinite(Number(savedPage.left)) ? Number(savedPage.left) : DEFAULT_PAGE.left,
        },
      }
    })
  } catch (error) {
    console.error('Ошибка загрузки документов:', error)
    return [createDocumentFromTemplate('Пустой документ')]
  }
}

function TableGridPicker({ onSelect }: { onSelect: (rows: number, cols: number) => void }) {
  const [hoverRow, setHoverRow] = useState(0)
  const [hoverCol, setHoverCol] = useState(0)

  return (
    <div className="table-grid-picker" onMouseLeave={() => { setHoverRow(0); setHoverCol(0) }}>
      <div className="table-grid-title">
        {hoverRow > 0 && hoverCol > 0 ? `Таблица ${hoverRow}x${hoverCol}` : 'Вставка таблицы'}
      </div>
      <div className="table-grid">
        {Array.from({ length: 8 }).map((_, r) => (
          <div key={r} className="table-grid-row">
            {Array.from({ length: 10 }).map((_, c) => (
              <div
                key={c}
                className={`table-grid-cell ${r < hoverRow && c < hoverCol ? 'active' : ''}`}
                onMouseEnter={() => { setHoverRow(r + 1); setHoverCol(c + 1) }}
                onClick={() => onSelect(r + 1, c + 1)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [documents, setDocuments] = useState<DocItem[]>(readDocuments)
  const [activeId, setActiveId] = useState(() => readDocuments()[0]?.id ?? '')
  const [activeTab, setActiveTab] = useState('Главная')
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showMarks, setShowMarks] = useState(false)
  const [showStyles, setShowStyles] = useState(false)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [showPageSettings, setShowPageSettings] = useState(false)
  const [showDocumentList, setShowDocumentList] = useState(true)
  const [fontSize, setFontSize] = useState('14')
  const [fontFamily, setFontFamily] = useState('Times New Roman')
  const [textColor, setTextColor] = useState('#222222')
  const [highlightColor, setHighlightColor] = useState('#fff176')
  const [lineSpacing, setLineSpacing] = useState('1.5')
  const [status, setStatus] = useState('Сохранено')
  const [layoutMenu, setLayoutMenu] = useState<'margins' | 'orientation' | 'size' | 'columns' | null>(null)

  const [dialog, setDialog] = useState<'table' | 'font' | 'paragraph' | 'bulletList' | 'numberList' | null>(null)
  const [tableRows, setTableRows] = useState('3')
  const [tableCols, setTableCols] = useState('3')
  const [templateDialog, setTemplateDialog] = useState<Template | null>(null)

  const activeDocument = useMemo(() => {
    const document = documents.find(doc => doc.id === activeId) ?? documents[0]
    if (!document) return undefined
    return { ...document, page: { ...DEFAULT_PAGE, ...(document.page ?? {}) } }
  }, [documents, activeId])

  const editor = useEditor({
    extensions: [
      StarterKit, Underline, TextStyle, FontSize, FontFamily, Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell, Superscript, Subscript, ParagraphFormatting,
    ],
    content: activeDocument?.content ?? EMPTY_HTML,
    onUpdate: ({ editor: currentEditor }) => {
      const content = currentEditor.getHTML()
      setStatus('Есть изменения')
      setDocuments(previous =>
        previous.map(doc => doc.id === activeId ? { ...doc, content, updatedAt: new Date().toISOString() } : doc)
      )
    },
    editorProps: { attributes: { class: 'document-editor', spellcheck: 'true' } },
  })

  useEffect(() => {
    try {
      localStorage.setItem('normdoc-documents', JSON.stringify(documents))
      setStatus('Сохранено')
    } catch { setStatus('Не удалось сохранить') }
  }, [documents])

  useEffect(() => {
    if (!editor || !activeDocument) return
    if (editor.getHTML() !== activeDocument.content) {
      editor.commands.setContent(activeDocument.content, { emitUpdate: false })
    }
  }, [activeId, editor])

  const updateActiveDocument = useCallback((updates: Partial<DocItem>) => {
    setDocuments(previous => previous.map(doc => doc.id === activeId ? { ...doc, ...updates } : doc))
  }, [activeId])

  const updatePage = (updates: Partial<PageSettings>) => {
    if (!activeDocument) return
    updateActiveDocument({ page: { ...DEFAULT_PAGE, ...(activeDocument.page ?? {}), ...updates } })
  }

  const addDocument = (doc: DocItem) => {
    setDocuments(previous => [doc, ...previous])
    setActiveId(doc.id)
    setActiveTab('Главная')
    setTemplateDialog(null)
  }

  const openTemplatePicker = (templateId: string) => {
    const tpl = getTemplate(templateId)
    if (tpl.variables.length === 0) addDocument(createDocumentFromTemplate(tpl.id))
    else setTemplateDialog(tpl)
  }

  const deleteDocument = (id: string) => {
    if (!window.confirm('Удалить этот документ?')) return
    const remaining = documents.filter(doc => doc.id !== id)
    if (!remaining.length) {
      const replacement = createDocumentFromTemplate('Пустой документ')
      setDocuments([replacement]); setActiveId(replacement.id); return
    }
    setDocuments(remaining)
    if (activeId === id) setActiveId(remaining[0].id)
  }

  const renameDocument = () => {
    if (!activeDocument) return
    const title = window.prompt('Название документа', activeDocument.title)
    if (title?.trim()) updateActiveDocument({ title: title.trim() })
  }

  const run = (command: () => void) => {
    if (!editor) return
    command()
    editor.commands.focus()
  }

  const setFont = (value: string) => {
    setFontFamily(value)
    run(() => editor?.chain().focus().setFontFamily(value).run())
  }

  const setSize = (value: string) => {
    setFontSize(value)
    editor?.chain().focus().setFontSize(`${value}pt`).run()
  }

  const increaseSize = () => {
    const current = parseInt(editor.getAttributes('textStyle').fontSize || '14')
    setSize((current + 2).toString())
  }

  const decreaseSize = () => {
    const current = parseInt(editor.getAttributes('textStyle').fontSize || '14')
    setSize((Math.max(8, current - 2)).toString())
  }

  const insertLink = () => {
    if (!editor) return
    const previous = editor.getAttributes('link').href
    const url = window.prompt('Введите адрес ссылки', previous || 'https://')
    if (url === null) return
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run(); return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const insertTable = () => {
    setTableRows('3'); setTableCols('3'); setDialog('table')
  }

  const confirmInsertTable = () => {
    const rows = Number(tableRows); const cols = Number(tableCols)
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 30 || cols > 15) return
    editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    setDialog(null)
  }

  const pastePlainText = async () => {
    if (!editor) return
    try {
      const text = await navigator.clipboard.readText()
      editor.chain().focus().insertContent(text.replace(/\n/g, '<br>')).run()
    } catch { window.alert('Браузер не разрешил доступ к буферу обмена.') }
  }

  const copySelection = async (cut = false) => {
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) return
    const text = editor.state.doc.textBetween(from, to, '\n')
    try {
      await navigator.clipboard.writeText(text)
      if (cut) editor.chain().focus().deleteSelection().run()
    } catch { window.alert('Не удалось получить доступ к буферу обмена.') }
  }

  const sortSelection = () => {
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) { window.alert('Сначала выдели несколько строк.'); return }
    const text = editor.state.doc.textBetween(from, to, '\n')
    const sorted = text.split('\n').sort((a, b) => a.localeCompare(b, 'ru')).join('\n')
    editor.chain().focus().insertContentAt({ from, to }, sorted).run()
  }

  const replaceAll = () => {
    if (!editor || !searchText) return
    const text = editor.getText()
    if (!text.includes(searchText)) { window.alert('Совпадений не найдено.'); return }
    const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const replaced = text.replace(new RegExp(escaped, 'g'), replaceText)
    editor.commands.setContent(`<p>${replaced.split('\n').map(line => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('</p><p>')}</p>`)
  }

  const findNext = () => {
    if (!editor || !searchText) return
    const fullText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n')
    const position = fullText.toLocaleLowerCase().indexOf(searchText.toLocaleLowerCase())
    if (position < 0) { window.alert('Совпадений не найдено.'); return }
    editor.chain().focus().setTextSelection({
      from: Math.min(position + 1, editor.state.doc.content.size),
      to: Math.min(position + searchText.length + 1, editor.state.doc.content.size),
    }).run()
  }

  const exportHtml = () => {
    if (!editor || !activeDocument) return
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${activeDocument.title}</title><style>
@page { size: ${activeDocument.page.format} ${activeDocument.page.orientation}; margin: ${activeDocument.page.top}mm ${activeDocument.page.right}mm ${activeDocument.page.bottom}mm ${activeDocument.page.left}mm; }
body { font-family: "Times New Roman", serif; font-size: 14pt; line-height: 1.5; color: #000; }
table { width: 100%; border-collapse: collapse; } td, th { border: 1px solid #000; padding: 5px; } img { max-width: 100%; }
</style></head><body>${editor.getHTML()}</body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `${activeDocument.title}.html`; anchor.click(); URL.revokeObjectURL(url)
  }

  const exportText = () => {
    if (!editor || !activeDocument) return
    const blob = new Blob([editor.getText()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `${activeDocument.title}.txt`; anchor.click(); URL.revokeObjectURL(url)
  }

  const applyStyle = (style: string) => {
    if (!editor) return
    switch (style) {
      case 'Обычный': editor.chain().focus().setParagraph().run(); break
      case 'Заголовок 1': editor.chain().focus().setHeading({ level: 1 }).run(); break
      case 'Заголовок 2': editor.chain().focus().setHeading({ level: 2 }).run(); break
      case 'Заголовок 3': editor.chain().focus().setHeading({ level: 3 }).run(); break
      case 'Название': editor.chain().focus().setHeading({ level: 1 }).setTextAlign('center').run(); break
      case 'Цитата': editor.chain().focus().toggleBlockquote().run(); break
    }
    setShowStyles(false)
  }

  if (!editor || !activeDocument) return <div className="loading">Загрузка редактора…</div>

  const wordCount = editor.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0

  const wordStyles: { name: string, css: CSSProperties }[] = [
    { name: 'Обычный', css: { fontSize: '14px', fontFamily: 'serif' } },
    { name: 'Заголовок 1', css: { fontSize: '24px', fontWeight: 'bold', fontFamily: 'sans-serif', color: '#2c3e50' } },
    { name: 'Заголовок 2', css: { fontSize: '18px', fontWeight: 'bold', fontFamily: 'sans-serif', color: '#2c3e50' } },
    { name: 'Заголовок 3', css: { fontSize: '16px', fontWeight: 'bold', fontFamily: 'sans-serif', color: '#2c3e50' } },
    { name: 'Название', css: { fontSize: '28px', fontWeight: 'normal', fontFamily: 'sans-serif', textAlign: 'center' } },
    { name: 'Цитата', css: { fontSize: '14px', fontStyle: 'italic', borderLeft: '3px solid #ccc', paddingLeft: '10px' } },
  ]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">Н</div>
          <div><strong>НормДок</strong><span>Редактор официальных документов</span></div>
        </div>
        <div className="topbar-actions">
          <span className="save-status">{status}</span>
          <button onClick={() => openTemplatePicker('Пустой документ')}>＋ Новый</button>
          <button onClick={renameDocument}>Переименовать</button>
          <button onClick={exportHtml}>Экспорт HTML</button>
          <button onClick={exportText}>Экспорт TXT</button>
          <button className="primary" onClick={() => window.print()}>Печать / PDF</button>
        </div>
      </header>

      <nav className="tabs">
        {['Главная', 'Вставка', 'Макет', 'Ссылки', 'Рецензирование', 'Вид'].map(tab => (
          <button key={tab} className={activeTab === tab ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </nav>

      <section className="ribbon word-ribbon">
        {activeTab === 'Главная' && (
          <>
            {}
            <div className="rgroup">
              <div className="rgroup-body">
                <button className="rbtn rbtn-large" onClick={pastePlainText} title="Вставить">
                  <Clipboard size={26} /><span>Вставить</span>
                </button>
                <div className="rcol">
                  <button className="rbtn" onClick={() => copySelection()} title="Копировать"><Copy size={16} /><span>Копировать</span></button>
                  <button className="rbtn" onClick={() => copySelection(true)} title="Вырезать"><Scissors size={16} /><span>Вырезать</span></button>
                </div>
              </div>
              <span className="group-title">Буфер обмена</span>
            </div>

            {}
            <div className="rgroup">
              <div className="rgroup-body">
                <div className="rcol">
                  <div className="rrow">
                    <select value={fontFamily} onChange={e => setFont(e.target.value)}>
                      <option>Times New Roman</option><option>Arial</option><option>Calibri</option><option>Georgia</option><option>Verdana</option>
                    </select>
                    <select value={fontSize} onChange={e => setSize(e.target.value)}>
                      {['8','9','10','11','12','14','16','18','20','22','24','26','28','36','48','72'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button className="rbtn" onClick={increaseSize} title="Увеличить размер шрифта"><span style={{ fontSize: '14px' }}>A</span><span style={{ fontSize: '10px', verticalAlign: 'top' }}>▲</span></button>
                    <button className="rbtn" onClick={decreaseSize} title="Уменьшить размер шрифта"><span style={{ fontSize: '14px' }}>A</span><span style={{ fontSize: '10px', verticalAlign: 'bottom' }}>▼</span></button>
                  </div>
                  <div className="rrow">
                    <button className={editor.isActive('bold') ? 'rbtn pressed' : 'rbtn'} onClick={() => run(() => editor.chain().toggleBold().run())}><Bold size={16} /></button>
                    <button className={editor.isActive('italic') ? 'rbtn pressed' : 'rbtn'} onClick={() => run(() => editor.chain().toggleItalic().run())}><Italic size={16} /></button>
                    <button className={editor.isActive('underline') ? 'rbtn pressed' : 'rbtn'} onClick={() => run(() => editor.chain().toggleUnderline().run())}><UnderlineIcon size={16} /></button>
                    <button className={editor.isActive('strike') ? 'rbtn pressed' : 'rbtn'} onClick={() => run(() => editor.chain().toggleStrike().run())}><Strikethrough size={16} /></button>
                  </div>
                  <div className="rrow">
                    <button className="rbtn" onClick={() => run(() => editor.chain().toggleSuperscript().run())}><SuperscriptIcon size={16} /></button>
                    <button className="rbtn" onClick={() => run(() => editor.chain().toggleSubscript().run())}><SubscriptIcon size={16} /></button>
                    <label className="rbtn color-tool" title="Цвет текста"><Palette size={16} /><input type="color" value={textColor} onChange={e => { setTextColor(e.target.value); run(() => editor.chain().setColor(e.target.value).run()) }} /></label>
                    <label className="rbtn color-tool" title="Цвет выделения"><Highlighter size={16} /><input type="color" value={highlightColor} onChange={e => { setHighlightColor(e.target.value); run(() => editor.chain().toggleHighlight({ color: e.target.value }).run()) }} /></label>
                    <button className="rbtn" onClick={() => run(() => editor.chain().unsetAllMarks().clearNodes().run())}><Eraser size={16} /></button>
                  </div>
                </div>
              </div>
              <span className="group-title">Шрифт</span>
              <button className="rgroup-launcher" onClick={() => setDialog('font')} title="Дополнительные параметры шрифта"><ChevronDown size={12} /></button>
            </div>

            {}
            <div className="rgroup">
              <div className="rgroup-body">
                <div className="rcol" style={{ position: 'relative' }}>
                  <button className="rbtn" onClick={() => setDialog('bulletList')}><List size={16} /><ChevronDown size={12} /></button>
                  <button className="rbtn" onClick={() => setDialog('numberList')}><ListOrdered size={16} /><ChevronDown size={12} /></button>
                  <button className={showMarks ? 'rbtn pressed' : 'rbtn'} onClick={() => setShowMarks(v => !v)}><Pilcrow size={16} /></button>
                </div>
                <div className="rcol">
                  <button className="rbtn" onClick={() => run(() => editor.chain().sinkListItem('listItem').run())}><Indent size={16} /></button>
                  <button className="rbtn" onClick={() => run(() => editor.chain().liftListItem('listItem').run())}><Outdent size={16} /></button>
                  <button className="rbtn" onClick={sortSelection}><ArrowUpDown size={16} /></button>
                </div>
                <div className="rcol">
                  <div className="rrow">
                    <button className={editor.isActive({ textAlign: 'left' }) ? 'rbtn pressed' : 'rbtn'} onClick={() => run(() => editor.chain().setTextAlign('left').run())}><AlignLeft size={16} /></button>
                    <button className={editor.isActive({ textAlign: 'center' }) ? 'rbtn pressed' : 'rbtn'} onClick={() => run(() => editor.chain().setTextAlign('center').run())}><AlignCenter size={16} /></button>
                    <button className={editor.isActive({ textAlign: 'right' }) ? 'rbtn pressed' : 'rbtn'} onClick={() => run(() => editor.chain().setTextAlign('right').run())}><AlignRight size={16} /></button>
                    <button className={editor.isActive({ textAlign: 'justify' }) ? 'rbtn pressed' : 'rbtn'} onClick={() => run(() => editor.chain().setTextAlign('justify').run())}><AlignJustify size={16} /></button>
                  </div>
                  <div className="rrow">
                    <select value={lineSpacing} onChange={e => { setLineSpacing(e.target.value); run(() => editor.chain().updateAttributes('paragraph', { lineHeight: e.target.value }).run()) }}>
                      <option value="1">1.0</option><option value="1.15">1.15</option><option value="1.5">1.5</option><option value="2">2.0</option>
                    </select>
                    <label className="rbtn" title="Заливка (цвет фона)"><PaintBucket size={16} /><input type="color" onChange={e => run(() => editor.chain().updateAttributes('paragraph', { backgroundColor: e.target.value }).run())} style={{ width: 14, height: 14, padding: 0, border: 0 }} /></label>
                  </div>
                </div>
                <div className="rcol">
                  <button className="rbtn" onClick={insertTable}><TableIcon size={16} /><span>Таблица</span></button>
                  <button className="rbtn" onClick={() => run(() => editor.chain().insertTable({ rows: 2, cols: 2 }).run())}><PenTool size={16} /><span>Нарисовать</span></button>
                </div>
              </div>
              <span className="group-title">Абзац</span>
              <button className="rgroup-launcher" onClick={() => setDialog('paragraph')} title="Дополнительные параметры абзаца"><ChevronDown size={12} /></button>
            </div>

            {}
            <div className="rgroup">
              <div className="rgroup-body" style={{ overflowX: 'auto', maxWidth: '300px', paddingBottom: '4px' }}>
                {wordStyles.map((s) => (
                  <button key={s.name} className="style-gallery-item" onClick={() => applyStyle(s.name)} title={s.name}>
                    <div style={s.css}>{s.name}</div>
                  </button>
                ))}
              </div>
              <span className="group-title">Стили</span>
              <button className="rgroup-launcher" onClick={() => alert('Полная галерея стилей в разработке')}><ChevronDown size={12} /></button>
            </div>
          </>
        )}

        {activeTab === 'Вставка' && (
          <>
            {}
            <div className="rgroup">
              <div className="rgroup-body">
                <button className="rbtn" onClick={() => run(() => editor.chain().insertContent('<p></p><p></p><div class="page-break"></div>').run())}>
                  <FilePlus size={16} /><span>Пустая страница</span>
                </button>
                <button className="rbtn" onClick={() => run(() => editor.chain().insertContent('<div class="page-break"></div><p></p>').run())}>
                  <FileDigit size={16} /><span>Разрыв страницы</span>
                </button>
              </div>
              <span className="group-title">Страницы</span>
            </div>

            {}
            <div className="rgroup">
              <div className="rgroup-body" style={{ position: 'relative' }}>
                <div className="word-dropdown-container">
                  <button className="rbtn rbtn-large" onClick={() => {
                    const el = document.getElementById('table-picker-popup')
                    if (el) el.classList.toggle('show')
                  }}>
                    <Grid3X3 size={26} /><span>Таблица</span>
                  </button>
                  <div id="table-picker-popup" className="word-dropdown-popup">
                    <TableGridPicker onSelect={(r, c) => {
                      run(() => editor.chain().insertTable({ rows: r, cols: c, withHeaderRow: true }).run())
                      document.getElementById('table-picker-popup')?.classList.remove('show')
                    }} />
                  </div>
                </div>
                <div className="rcol">
                  <button className="rbtn" onClick={() => run(() => editor.chain().insertTable({ rows: 2, cols: 2 }).run())}><PenTool size={16} /><span>Нарисовать</span></button>
                  <button className="rbtn" onClick={() => setDialog('table')}><TableIcon size={16} /><span>Вставить таблицу</span></button>
                </div>
              </div>
              <span className="group-title">Таблицы</span>
            </div>

            {}
            <div className="rgroup">
              <div className="rgroup-body">
                <div className="word-dropdown-container">
                  <button className="rbtn rbtn-large" onClick={() => {
                    const el = document.getElementById('picture-menu')
                    if (el) el.classList.toggle('show')
                  }}>
                    <ImageIcon size={26} /><span>Рисунки</span>
                  </button>
                  <div id="picture-menu" className="word-dropdown-popup">
                    <button className="word-menu-item" onClick={() => {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    openDialog({ multiple: false, filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }] })
      .then(async (path: string | string[] | null) => {
        if (typeof path === 'string') {
          const contents = await readFile(path)
          const blob = new Blob([contents as unknown as BlobPart])
          const reader = new FileReader()
          reader.onload = (e) => {
            if (e.target?.result) {
              editor.chain().focus().setImage({ src: e.target.result as string }).run()
            }
          }
          reader.readAsDataURL(blob)
        }
      })
.catch((err: unknown) => console.error('Ошибка выбора файла:', err))
  } else {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          if (ev.target?.result) editor.chain().focus().setImage({ src: ev.target.result as string }).run()
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }
  document.getElementById('picture-menu')?.classList.remove('show')
}}>
  <ImageIcon size={16} /> С устройства
</button>
                    <button className="word-menu-item" onClick={() => {
                      const url = window.prompt('URL изображения')
                      if (url) editor.chain().focus().setImage({ src: url }).run()
                      document.getElementById('picture-menu')?.classList.remove('show')
                    }}>
                      <LinkIcon size={16} /> Из интернета
                    </button>
                  </div>
                </div>
                <div className="rcol">
                  {}
                  <button className="rbtn" onClick={() => run(() => editor.chain().insertContent('<div style="width:100px; height:100px; background:blue; border:1px solid black; display:inline-block; margin: 10px;"></div><p></p>').run())}>
                    <Shapes size={16} /><span>Фигуры</span>
                  </button>
                  <button className="rbtn" onClick={() => run(() => editor.chain().insertContent('<div class="chart-placeholder">📊 Диаграмма (в разработке)</div>').run())}>
                    <PieChart size={16} /><span>Диаграмма</span>
                  </button>
                </div>
              </div>
              <span className="group-title">Иллюстрации</span>
            </div>

            {}
            <div className="rgroup">
              <div className="rgroup-body">
                <button className="rbtn" onClick={() => run(() => editor.chain().insertContent('<p style="text-align: right; font-size: 10pt; border-bottom: 1px solid #ccc;">[Верхний колонтитул]</p>').run())}>
                  <AlignStartVertical size={16} /><span>Верхний</span>
                </button>
                <button className="rbtn" onClick={() => run(() => editor.chain().insertContent('<p style="text-align: right; font-size: 10pt; border-top: 1px solid #ccc;">[Нижний колонтитул]</p>').run())}>
                  <AlignStartVertical size={16} style={{ transform: 'rotate(180deg)' }} /><span>Нижний</span>
                </button>
              </div>
              <span className="group-title">Колонтитулы</span>
            </div>

            {}
            <div className="rgroup">
              <div className="rgroup-body">
                <div className="rcol">
                  <button className="rbtn" onClick={() => run(() => editor.chain().insertContent('<div style="border: 1px solid #000; padding: 10px; min-width: 150px; display: inline-block;">Текстовое поле</div><p></p>').run())}>
                    <FileText size={16} /><span>Текстовое поле</span>
                  </button>
                  <button className="rbtn" onClick={() => run(() => editor.chain().insertContent('<div class="express-block">Экспресс-блок</div>').run())}>
                    <Grid3X3 size={16} /><span>Экспресс-блоки</span>
                  </button>
                </div>
                <div className="rcol">
                  <button className="rbtn" onClick={() => run(() => editor.chain().insertContent('<p>_______________________ /_________________/</p>').run())}>
                    <PenLine size={16} /><span>Строка подписи</span>
                  </button>
                  <button className="rbtn" onClick={() => run(() => editor.chain().insertContent(`<p>${new Date().toLocaleDateString('ru-RU')}</p>`).run())}>
                    <Clock size={16} /><span>Дата и время</span>
                  </button>
                </div>
                <div className="rcol">
                  <button className="rbtn" onClick={() => run(() => editor.chain().insertContent('<div style="border: 1px dashed #000; padding: 15px; text-align: center; background: #f9f9f9; margin: 10px 0;">🔒 Место для электронной подписи<br/><small>(ФИО, Должность, Сертификат)</small></div>').run())}>
                    <BadgeCheck size={16} /><span>Эл. подпись</span>
                  </button>
                </div>
              </div>
              <span className="group-title">Текст</span>
            </div>
          </>
        )}

               {activeTab === 'Макет' && (
          <>
            {}
            <div className="rgroup">
              <div className="rgroup-body">
                
                {}
                <div className="word-dropdown-container">
                  <button className="rbtn rbtn-large" onClick={() => setLayoutMenu(layoutMenu === 'margins' ? null : 'margins')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" strokeDasharray="2 2"/></svg>
                    <span>Поля</span>
                  </button>
                  {layoutMenu === 'margins' && (
                    <div className="word-dropdown-popup show" style={{ width: '240px' }}>
                      {[
                        { name: 'Обычные', top: 20, right: 15, bottom: 20, left: 30 },
                        { name: 'Узкие', top: 12.7, right: 12.7, bottom: 12.7, left: 12.7 },
                        { name: 'Средние', top: 25.4, right: 19.1, bottom: 25.4, left: 19.1 },
                        { name: 'Широкие', top: 25.4, right: 50.8, bottom: 25.4, left: 50.8 },
                      ].map(preset => (
                        <button key={preset.name} className="word-menu-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderBottom: '1px solid #eee' }} onClick={() => {
                          updatePage({ top: preset.top, right: preset.right, bottom: preset.bottom, left: preset.left });
                          setLayoutMenu(null);
                        }}>
                          <strong>{preset.name}</strong>
                          <span style={{ fontSize: '10px', color: '#666' }}>
                            Верх: {preset.top/10} см; Низ: {preset.bottom/10} см<br/>
                            Лево: {preset.left/10} см; Право: {preset.right/10} см
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {}
                <div className="word-dropdown-container">
                  <button className="rbtn rbtn-large" onClick={() => setLayoutMenu(layoutMenu === 'orientation' ? null : 'orientation')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/></svg>
                    <span>Ориентация</span>
                  </button>
                  {layoutMenu === 'orientation' && (
                    <div className="word-dropdown-popup show">
                      <button className="word-menu-item" onClick={() => { updatePage({ orientation: 'portrait' }); setLayoutMenu(null); }}>Книжная</button>
                      <button className="word-menu-item" onClick={() => { updatePage({ orientation: 'landscape' }); setLayoutMenu(null); }}>Альбомная</button>
                    </div>
                  )}
                </div>

                {}
                <div className="word-dropdown-container">
                  <button className="rbtn rbtn-large" onClick={() => setLayoutMenu(layoutMenu === 'size' ? null : 'size')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>
                    <span>Размер</span>
                  </button>
                  {layoutMenu === 'size' && (
                    <div className="word-dropdown-popup show" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {['A4', 'A3', 'Letter'].map(f => (
                        <button key={f} className={`word-menu-item ${activeDocument.page.format === f ? 'active' : ''}`} onClick={() => { updatePage({ format: f as any }); setLayoutMenu(null); }}>
                          {f} {f === 'A4' ? '(21 x 29.7 см)' : f === 'A3' ? '(29.7 x 42 см)' : '(21.6 x 27.9 см)'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {}
                <div className="word-dropdown-container">
                  <button className="rbtn rbtn-large" onClick={() => setLayoutMenu(layoutMenu === 'columns' ? null : 'columns')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                    <span>Колонки</span>
                  </button>
                  {layoutMenu === 'columns' && (
                    <div className="word-dropdown-popup show">
                      <button className="word-menu-item" onClick={() => { updatePage({ columns: 1 }); setLayoutMenu(null); }}>Один</button>
                      <button className="word-menu-item" onClick={() => { updatePage({ columns: 2 }); setLayoutMenu(null); }}>Два</button>
                      <button className="word-menu-item" onClick={() => { updatePage({ columns: 3 }); setLayoutMenu(null); }}>Три</button>
                    </div>
                  )}
                </div>

              </div>
              <span className="group-title">Параметры страницы</span>
              <button className="rgroup-launcher" onClick={() => setDialog('paragraph')}><ChevronDown size={12}/></button>
            </div>

            {}
            <div className="rgroup">
              <div className="rgroup-body" style={{ display: 'flex', gap: '20px', padding: '0 10px' }}>
                
                {}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Отступ</div>
                  <div className="rrow">
                    <span style={{ fontSize: '11px', width: '45px' }}>Слева:</span>
                    <input type="number" style={{ width: '50px', fontSize: '11px' }} 
                      value={Math.round(activeDocument.page.left / 10)} 
                      onChange={e => updatePage({ left: Number(e.target.value) * 10 })} /> см
                  </div>
                  <div className="rrow">
                    <span style={{ fontSize: '11px', width: '45px' }}>Справа:</span>
                    <input type="number" style={{ width: '50px', fontSize: '11px' }} 
                      value={Math.round(activeDocument.page.right / 10)} 
                      onChange={e => updatePage({ right: Number(e.target.value) * 10 })} /> см
                  </div>
                </div>

                {}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Интервал</div>
                  <div className="rrow">
                    <span style={{ fontSize: '11px', width: '45px' }}>Перед:</span>
                    <input type="number" style={{ width: '50px', fontSize: '11px' }} defaultValue={0} 
                      onChange={e => run(() => editor.chain().updateAttributes('paragraph', { marginTop: `${e.target.value}pt` }).run())} /> пт
                  </div>
                  <div className="rrow">
                    <span style={{ fontSize: '11px', width: '45px' }}>После:</span>
                    <input type="number" style={{ width: '50px', fontSize: '11px' }} defaultValue={8} 
                      onChange={e => run(() => editor.chain().updateAttributes('paragraph', { marginBottom: `${e.target.value}pt` }).run())} /> пт
                  </div>
                </div>

              </div>
              <span className="group-title">Абзац</span>
              <button className="rgroup-launcher" onClick={() => setDialog('paragraph')}><ChevronDown size={12}/></button>
            </div>
          </>
        )}
      </section>

      <main className="workspace">
        {showDocumentList && (
          <aside className="document-sidebar">
            <div className="sidebar-heading">
              <strong>Документы</strong>
              <button onClick={() => openTemplatePicker('Пустой документ')}>＋</button>
            </div>
            <label className="template-label" htmlFor="template-select">Создать по шаблону</label>
            <select id="template-select" defaultValue="" onChange={e => { if (e.target.value) { openTemplatePicker(e.target.value); e.target.value = '' } }}>
              <option value="">Выбрать шаблон…</option>
              {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="document-list">
              {documents.map(doc => (
                <div key={doc.id} className={doc.id === activeId ? 'document-item selected' : 'document-item'}>
                  <button className="document-select" onClick={() => setActiveId(doc.id)}>
                    <span className="document-icon">DOC</span>
                    <span className="document-meta">
                      <strong>{doc.title}</strong><small>{new Date(doc.updatedAt).toLocaleString('ru-RU')}</small>
                    </span>
                  </button>
                  <button className="delete-document" onClick={() => deleteDocument(doc.id)}>×</button>
                </div>
              ))}
            </div>
          </aside>
        )}

        <section className="editor-area">
          <div className="document-heading">
            <div>
              <input className="document-title" value={activeDocument.title} onChange={e => updateActiveDocument({ title: e.target.value })} />
              <p>{activeDocument.type} · Изменён {new Date(activeDocument.updatedAt).toLocaleString('ru-RU')}</p>
            </div>
            <div className="document-actions">
              <button onClick={() => run(() => editor.chain().undo().run())} title="Отменить">↶</button>
              <button onClick={() => run(() => editor.chain().redo().run())} title="Повторить">↷</button>
              <button onClick={() => window.print()}>PDF / печать</button>
            </div>
          </div>

          <div className={`paper ${showMarks ? 'show-marks' : ''}`} 
          style={{ width: activeDocument.page.format === 'A3' ? '297mm' :
           activeDocument.page.format === 'Letter' ? '216mm' : '210mm', 
           minHeight: '297mm', maxWidth: '100%', paddingTop: `${activeDocument.page.top}mm`,
           paddingRight: `${activeDocument.page.right}mm`, paddingBottom: `${activeDocument.page.bottom}mm`,
            paddingLeft: `${activeDocument.page.left}mm`, 
             columnCount: activeDocument.page.columns || 1, 
    columnGap: '20mm',
            ...(activeDocument.page.orientation === 'landscape' ? { width: '297mm', minHeight: '210mm' } : {}) }}>
            <EditorContent editor={editor} />
          </div>

          <footer className="statusbar">
            <span>Слов: {wordCount}</span><span>Символов: {editor.getText().length}</span><span>{status}</span>
          </footer>
        </section>
      </main>

      {templateDialog && <TemplateDialog template={templateDialog} onCancel={() => setTemplateDialog(null)} onCreate={(html, title) => addDocument({ id: uid(), title, type: templateDialog.id, content: html, updatedAt: new Date().toISOString(), page: { ...DEFAULT_PAGE } })} />}
      
      {dialog === 'font' && <FontDialog editor={editor} onClose={() => setDialog(null)} />}
      {dialog === 'paragraph' && <ParagraphDialog editor={editor} onClose={() => setDialog(null)} />}

      {}
      {dialog === 'bulletList' && (
        <div className="word-dialog-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setDialog(null) }}>
          <div className="word-dialog" style={{ width: '250px' }}>
            <div className="word-dialog-header"><span>Маркеры</span><button onClick={() => setDialog(null)}>×</button></div>
            <div className="word-dialog-content" style={{ padding: '10px', display: 'flex', gap: '10px' }}>
              <button className="list-preview-btn" onClick={() => { editor.chain().focus().toggleBulletList().run(); setDialog(null); }}>
                <ul><li>Текст</li></ul>
              </button>
              <button className="list-preview-btn" onClick={() => { editor.chain().focus().toggleBulletList().run(); setDialog(null); }}>
                <ul style={{ listStyleType: 'circle' }}><li>Текст</li></ul>
              </button>
              <button className="list-preview-btn" onClick={() => { editor.chain().focus().toggleBulletList().run(); setDialog(null); }}>
                <ul style={{ listStyleType: 'square' }}><li>Текст</li></ul>
              </button>
            </div>
          </div>
        </div>
      )}

      {dialog === 'numberList' && (
        <div className="word-dialog-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setDialog(null) }}>
          <div className="word-dialog" style={{ width: '250px' }}>
            <div className="word-dialog-header"><span>Нумерация</span><button onClick={() => setDialog(null)}>×</button></div>
            <div className="word-dialog-content" style={{ padding: '10px', display: 'flex', gap: '10px' }}>
              <button className="list-preview-btn" onClick={() => { editor.chain().focus().toggleOrderedList().run(); setDialog(null); }}>
                <ol><li>Текст</li></ol>
              </button>
              <button className="list-preview-btn" onClick={() => { editor.chain().focus().toggleOrderedList().run(); setDialog(null); }}>
                <ol style={{ listStyleType: 'upper-roman' }}><li>Текст</li></ol>
              </button>
              <button className="list-preview-btn" onClick={() => { editor.chain().focus().toggleOrderedList().run(); setDialog(null); }}>
                <ol style={{ listStyleType: 'lower-alpha' }}><li>Текст</li></ol>
              </button>
            </div>
          </div>
        </div>
      )}

      {dialog === 'table' && (
        <div className="nd-dialog-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setDialog(null) }}>
          <div className="nd-dialog" role="dialog" aria-modal="true">
            <div className="nd-dialog-header"><strong>Вставка таблицы</strong><button className="nd-dialog-close" onClick={() => setDialog(null)}>×</button></div>
            <div className="nd-dialog-content">
              <label className="nd-dialog-field">Количество строк <input type="number" min="1" max="30" value={tableRows} onChange={e => setTableRows(e.target.value)} /></label>
              <label className="nd-dialog-field">Количество столбцов <input type="number" min="1" max="15" value={tableCols} onChange={e => setTableCols(e.target.value)} /></label>
            </div>
            <div className="nd-dialog-footer">
              <button className="nd-dialog-button" onClick={() => setDialog(null)}>Отмена</button>
              <button className="nd-dialog-button primary" onClick={confirmInsertTable}>Вставить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}