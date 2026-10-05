import { expect, test } from 'claude-code/testing'
import { temizle, kisalt, dosyaAdi, uzanti, ekle, komutAdi, eylemOku, hataMi, bittiMetni } from '../hooks/olay.js'

test('temizle boşlukları sadeleştirir ve çok genişlikli karakteri ? yapar', async () => {
  expect(temizle('  a\t b\n c ')).toBe('a b c')
  expect(temizle('😀x')).toBe('?x')
  expect(temizle('ğüşıöç İ')).toBe('ğüşıöç İ')
  expect(temizle(undefined)).toBe('')
})

test('kisalt uzun metni üç noktayla keser', async () => {
  expect(kisalt('kısa', 10)).toBe('kısa')
  expect(kisalt('abcdefghij', 5)).toBe('abcd…')
})

test('dosyaAdi ve uzanti yolun son parçasını alır', async () => {
  expect(dosyaAdi('/a/b/README.md')).toBe('README.md')
  expect(dosyaAdi('C:\\x\\y.ts')).toBe('y.ts')
  expect(dosyaAdi(undefined)).toBe('dosya')
  expect(uzanti('/a/b/Sahne.JS')).toBe('js')
  expect(uzanti('/a/.env')).toBe('')
  expect(uzanti(undefined)).toBe('')
})

test('ekle Türkçe belirtme ve yönelme eklerini okunuşa göre seçer', async () => {
  expect(ekle('README.md', 'belirtme')).toBe("README.md'yi")
  expect(ekle('register.js', 'belirtme')).toBe("register.js'yi")
  expect(ekle('main.py', 'belirtme')).toBe("main.py'yi")
  expect(ekle('ölçek.ts', 'belirtme')).toBe("ölçek.ts'yi")
  expect(ekle('app.tsx', 'belirtme')).toBe("app.tsx'i")
  expect(ekle('data.json', 'belirtme')).toBe("data.json'u")
  expect(ekle('config.yaml', 'belirtme')).toBe("config.yaml'ı")
  expect(ekle('Makefile', 'belirtme')).toBe("Makefile'yi")
  expect(ekle('v2', 'belirtme')).toBe("v2'yi")
  expect(ekle('.env', 'belirtme')).toBe(".env'i")
  expect(ekle('klasör', 'belirtme')).toBe("klasör'ü")
  expect(ekle('dolap.js', 'yonelme')).toBe("dolap.js'ye")
  expect(ekle('data.json', 'yonelme')).toBe("data.json'a")
})

test('komutAdi asıl komutu ve alt komutunu bulur', async () => {
  expect(komutAdi('cd x && npm test')).toBe('npm test')
  expect(komutAdi('FOO=1 node a.js')).toBe('node')
  expect(komutAdi('/usr/bin/git status --short')).toBe('git status')
  expect(komutAdi('ls -la')).toBe('ls')
  expect(komutAdi('')).toBe('komut')
})

test('eylemOku iki zarf biçimini de tanır', async () => {
  expect(eylemOku({ tool: 'Read', file_path: '/w/README.md' })).toEqual({ tur: 'oku', metin: "README.md'yi okuyor" })
  expect(eylemOku({ tool_name: 'Read', tool_input: { file_path: '/w/README.md' } })).toEqual({ tur: 'oku', metin: "README.md'yi okuyor" })
  expect(eylemOku({ tool_name: 'Grep', tool_input: { pattern: 'TODO' } })).toEqual({ tur: 'oku', metin: '"TODO" arıyor' })
  expect(eylemOku({ tool_name: 'Edit', tool_input: { file_path: '/w/sahne.js' } })).toEqual({ tur: 'insa', metin: "sahne.js'yi karıştırıyor", uzanti: 'js' })
  expect(eylemOku({ tool_name: 'Bash', tool_input: { command: 'npm test' } })).toEqual({ tur: 'tnt', metin: 'npm test patlatıyor' })
  expect(eylemOku({ tool_name: 'Agent', tool_input: { description: 'testleri yaz' } })).toEqual({ tur: 'ajan', metin: 'çırak: testleri yaz' })
  expect(eylemOku({ tool_name: 'WebFetch', tool_input: { url: 'https://www.github.com/x' } })).toEqual({ tur: 'web', metin: 'kürede: github.com' })
  expect(eylemOku({ tool_name: 'WebSearch', tool_input: { query: 'iksir' } })).toEqual({ tur: 'web', metin: 'kürede arıyor: iksir' })
  expect(eylemOku({ tool_name: 'mcp__github__get_pr' }).tur).toBe('diger')
})

test('bozuk girdi güvenle karşılanır', async () => {
  const tek = /^[\x20-\x7e\u00a0-\u024f\u2026]*$/u
  const ornekler = [
    eylemOku({ tool_name: 'Bash', tool_input: { command: 123 } }),
    eylemOku({ tool_name: 'Read', tool_input: {} }),
    eylemOku({ tool_name: 'Agent', tool_input: { description: '🧪'.repeat(80) } }),
    eylemOku({ tool_name: 'mcp__' + 'x'.repeat(200) }),
    eylemOku({}),
    eylemOku(undefined),
  ]
  for (const e of ornekler) {
    expect(Array.from(e.metin).length <= 40).toBe(true)
    expect(tek.test(e.metin)).toBe(true)
  }
})

test('hataMi iki hata alanını da tanır, bittiMetni sayıyı yazar', async () => {
  expect(hataMi({ tool_response: { is_error: true } })).toBe(true)
  expect(hataMi({ tool_response: { isError: true } })).toBe(true)
  expect(hataMi({ tool_response: 'tamam' })).toBe(false)
  expect(hataMi({})).toBe(false)
  expect(bittiMetni(3)).toBe('Bitti! 3 iksir hazır')
  expect(bittiMetni(0)).toBe('Bitti!')
})
