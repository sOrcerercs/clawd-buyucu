import { expect, mock, test } from 'claude-code/testing'

test('/buyucu modu kapatıp açar ve tercihi saklar', async ($, on) => {
  const depo = new Map<string, unknown>()
  on('store.get', ($: any, e: any) => ({ value: depo.get(e.key) }))
  on('store.set', ($: any, e: any) => {
    depo.set(e.key, e.value)
    return { value: undefined }
  })
  on('command.register', () => ({ value: undefined }))
  on('session.start', () => ({ cwd: '/work' }))

  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  const kapali = await $.command.run({ command: 'buyucu', args: '' })
  expect(kapali.text).toBe('Clawd Büyücü kapalı.')
  expect(depo.get('acik')).toBe(false)

  const acik = await $.command.run({ command: 'buyucu', args: '' })
  expect(acik.text).toBe('Clawd Büyücü açık: Claude çalışırken kazanı karıştırır.')
  expect(depo.get('acik')).toBe(true)
})

const BANT = {
  plugin: 'clawd-buyucu', component: 'AbovePrompt', requestId: 'above-prompt',
  viewport: { columns: 120, rows: 40 },
  props: { hasSurvey: false, isWorking: true, maxRows: 12, bodyColumns: 120, scroll: { offset: 0, bodyRows: 12 }, view: {} },
} as const
const SPINNER = {
  plugin: 'clawd-buyucu', component: 'Spinner', requestId: 'main',
  viewport: { columns: 120, rows: 40 },
  props: { word: 'Thinking', message: '', suffix: '', mode: 'normal' },
} as const
const TUR = { turnId: 't1', answer: '', durationMs: 1, isAborted: false, usage: null }

// Her testin ilk $ çağrısından önce kurulur
function hazirla(on: any, secenek: { depo?: Map<string, unknown>, render?: (e: any) => void, storeBozuk?: boolean } = {}) {
  const depo = secenek.depo ?? new Map<string, unknown>()
  const kayitlar: any[] = []
  const blitler: any[] = []
  if (secenek.storeBozuk) on('store.get', () => ({ deny: 'store okunamadı' }))
  else on('store.get', ($: any, e: any) => ({ value: depo.get(e.key) }))
  on('store.set', ($: any, e: any) => {
    depo.set(e.key, e.value)
    return { value: undefined }
  })
  on('command.register', ($: any, e: any) => {
    kayitlar.push(e)
    return { value: undefined }
  })
  on('ui.blit', ($: any, e: any) => {
    blitler.push(e)
    return { value: undefined }
  })
  on('session.start', () => ({ cwd: '/work' }))
  on('turn.start', ($: any, e: any) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', ($: any, e: any) => {
    if (String(e.file_path ?? '').includes('reddet')) return { deny: 'kullanıcı reddetti' }
    if (String(e.file_path ?? '').includes('bozuk')) return { result: 'hata', isError: true }
    return { result: 'tamam' }
  })
  on('classic.PostToolUse', () => ({}))
  on('classic.PostToolUseFailure', () => ({}))
  on('ui.render', ($: any, e: any) => {
    secenek.render?.(e)
    return { type: 'Text', props: {}, children: ['Claude Code çizdi'] }
  })
  return { depo, kayitlar, blitler, saat: mock.clock(on) }
}

async function oturumAc($: any) {
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
}

test('tur başlayınca bant açılır, Raster ve düğmeler çizilir, kareler blit edilir', async ($, on) => {
  const { blitler, saat } = hazirla(on)
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  const raster = await ui.find({ key: 'sahne' })
  expect(raster.props.columns).toBe(120)
  expect(raster.props.rows).toBe(10)
  expect(await ui.find({ key: 'oyna-zipla' })).toBeDefined()
  expect(await ui.find({ key: 'oyna-iksir' })).toBeDefined()
  await $.tool.call({ tool: 'Read', file_path: '/w/README.md' })
  await saat.advance(90 * 3)
  const desktop = await $.ui.mount({ ...BANT, surface: 'desktop' })
  expect(await desktop.find({ type: 'Text', text: /README\.md'yi okuyor/ })).toBeDefined()
  await desktop.unmount()
  expect(blitler.length >= 2).toBe(true)
  expect(blitler[0].key).toBe('sahne')
  expect(blitler[0].columns).toBe(120)
  await ui.unmount()
})

test('tur bitince bant iki saniye sonra kapanır', async ($, on) => {
  const { saat } = hazirla(on)
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  await $.turn.complete(TUR)
  let ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeDefined()
  await ui.unmount()
  await saat.advance(2100)
  ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'Claude Code çizdi' })).toBeDefined()
  await ui.unmount()
})

test('alt ajanın turu bandı kapatmaz', async ($, on) => {
  const { saat } = hazirla(on)
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  await $.turn.complete({ ...TUR, agentId: 'alt-1' })
  await saat.advance(3000)
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeDefined()
  await ui.unmount()
})

test('düzenleme bitince iksir store\'a yazılır, spinner sayacı gösterir', async ($, on) => {
  let sonSpinner: any = null
  const { depo, saat } = hazirla(on, { render: (e) => { if (e.component === 'Spinner') sonSpinner = e } })
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  const girdi = { file_path: '/w/sahne.js' }
  await $.tool.call({ tool: 'Edit', ...girdi })
  await saat.advance(90 * 12)
  await saat.advance(90)
  expect(depo.get('dolap')).toEqual({ sayi: 1, siseler: [{ renk: 0xf2c12e, parlak: 0 }] })
  const ui = await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  expect(sonSpinner.props.suffix.includes('⚗ 1 iksir')).toBe(true)
  await ui.unmount()
})

test('kayıtlı dolap oturum açılışında yüklenir', async ($, on) => {
  let sonSpinner: any = null
  const depo = new Map<string, unknown>([['dolap', { sayi: 5, siseler: [{ renk: 0x4f8fe8, parlak: 1 }] }]])
  hazirla(on, { depo, render: (e) => { if (e.component === 'Spinner') sonSpinner = e } })
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  const ui = await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  expect(sonSpinner.props.suffix).toBe(' · ⚗ 5 iksir · ✦ 0')
  await ui.unmount()
})

test('Desktop\'ta tek satır metin çizilir', async ($, on) => {
  hazirla(on)
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  const ui = await $.ui.mount({ ...BANT, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Clawd: düşünüyor… · ⚗ 0/ })).toBeDefined()
  await ui.unmount()
})

test('kapalıyken tur başlasa da bant açılmaz', async ($, on) => {
  hazirla(on, { depo: new Map([['acik', false]]) })
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeUndefined()
  await ui.unmount()
})

test('store okunamazsa varsayılanlarla açılır', async ($, on) => {
  const { kayitlar } = hazirla(on, { storeBozuk: true })
  await oturumAc($)
  expect(kayitlar.map((k) => k.name)).toEqual(['buyucu'])
  await $.turn.start({ turnId: 't1' })
  const ui = await $.ui.mount({ ...BANT, surface: 'terminal' })
  expect(await ui.find({ key: 'sahne' })).toBeDefined()
  await ui.unmount()
})

test('oyna düğmesi Clawd\'u oyuncuya verir', async ($, on) => {
  hazirla(on)
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  const terminal = await $.ui.mount({ ...BANT, surface: 'terminal' })
  await terminal.press({ key: 'oyna-buyu' })
  await terminal.unmount()
  const desktop = await $.ui.mount({ ...BANT, surface: 'desktop' })
  expect(await desktop.find({ type: 'Text', text: /Kontrol sende!/ })).toBeDefined()
  await desktop.unmount()
})

test('reddedilen araç sahneyi o modda bırakmaz', async ($, on) => {
  const { saat } = hazirla(on)
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  await $.tool.call({ tool: 'Edit', file_path: '/w/reddet.js' })
  await saat.advance(90 * 30)
  const ui = await $.ui.mount({ ...BANT, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /düşünüyor…/ })).toBeDefined()
  await ui.unmount()
})

test('hata döndüren araç creeper getirir', async ($, on) => {
  hazirla(on)
  await oturumAc($)
  await $.turn.start({ turnId: 't1' })
  await $.tool.call({ tool: 'Edit', file_path: '/w/bozuk.js' })
  const ui = await $.ui.mount({ ...BANT, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Eyvah, büyü tutmadı!/ })).toBeDefined()
  await ui.unmount()
})
