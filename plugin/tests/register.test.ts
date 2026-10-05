import { expect, test } from 'claude-code/testing'

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
