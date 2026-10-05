// Clawd Büyücü — Claude çalışırken istemin üstündeki bantta büyücü Clawd sahnesi.
// $ kullanan tek dosya; diğer modüller saftır.

const ACIK_ANAHTARI = 'acik'

let acik = true

export function register(on) {
  on('session.start', async ($, e, next) => {
    acik = (await $.store.get(ACIK_ANAHTARI)) !== false
    await $.command.register({ name: 'buyucu', description: 'Clawd Büyücü bandını aç/kapat', immediate: true })
    return next(e)
  })

  on('command.run', { command: 'buyucu' }, async ($) => {
    acik = !acik
    await $.store.set(ACIK_ANAHTARI, acik)
    return { text: acik ? 'Clawd Büyücü açık: Claude çalışırken kazanı karıştırır.' : 'Clawd Büyücü kapalı.' }
  })
}
