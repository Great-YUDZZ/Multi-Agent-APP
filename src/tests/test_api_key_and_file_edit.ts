import { globalProviderRegistry } from '../llm/ProviderRegistry';
import { OpenAIProvider } from '../llm/OpenAIProvider';
import { AnthropicProvider } from '../llm/AnthropicProvider';
import { ApiKeyMissingError, ApiKeyInvalidError } from '../llm/errors';
import { selectFileDialog, selectFolderDialog, selectSaveFileDialog } from '../tauri/fsBridge';

async function runTests() {
  console.log('=== MEMULAI TEST VALIDASI API KEY & FITUR FILE/EDIT ===\n');

  // Test 1: OpenAI Provider tanpa API key harus melempar ApiKeyMissingError
  console.log('[1/4] Menguji OpenAIProvider tanpa API key...');
  const emptyOpenAI = new OpenAIProvider({
    id: 'test-openai-empty',
    providerType: 'openai-compatible',
    label: 'Test OpenAI',
    model: 'gpt-4o',
    apiKey: '',
  });

  try {
    await emptyOpenAI.sendMessage([{ role: 'user', content: 'Halo' }]);
    throw new Error('FAILED: OpenAI tanpa API key tidak melempar error!');
  } catch (err) {
    if (err instanceof ApiKeyMissingError) {
      console.log(`- Berhasil menangkap ApiKeyMissingError: "${err.message}"`);
      if (err.message !== 'Silakan masukkan API key Anda terlebih dahulu untuk memulai percakapan.') {
        throw new Error(`Pesan error tidak sesuai: ${err.message}`);
      }
    } else {
      throw new Error(`Error bukan instance ApiKeyMissingError: ${err}`);
    }
  }

  // Test 3: Anthropic Provider tanpa API key harus melempar ApiKeyMissingError
  console.log('\n[3/5] Menguji AnthropicProvider tanpa API key...');
  const emptyAnthropic = new AnthropicProvider({
    id: 'test-anthropic-empty',
    providerType: 'anthropic',
    label: 'Test Anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: '',
  });

  try {
    await emptyAnthropic.sendMessage([{ role: 'user', content: 'Halo' }]);
    throw new Error('FAILED: Anthropic tanpa API key tidak melempar error!');
  } catch (err) {
    if (err instanceof ApiKeyMissingError) {
      console.log(`- Berhasil menangkap ApiKeyMissingError: "${err.message}"`);
    } else {
      throw new Error(`Error bukan instance ApiKeyMissingError: ${err}`);
    }
  }

  // Test 4: Simulasi ApiKeyInvalidError (401 / bad key)
  console.log('\n[4/5] Menguji pesan ApiKeyInvalidError (401 / Invalid Key)...');
  const invalidKeyError = new ApiKeyInvalidError('prov-openai', 'HTTP 401 Unauthorized', 'OpenAI');
  console.log(`- Pesan ApiKeyInvalidError: "${invalidKeyError.message}"`);
  if (invalidKeyError.message !== 'Ada sesuatu yang salah pada API key Anda. Silakan periksa kembali API key atau kuota Anda di Pengaturan.') {
    throw new Error(`Pesan ApiKeyInvalidError tidak sesuai: ${invalidKeyError.message}`);
  }

  // Test 5: sendMessageWithFallback tanpa allowMock tidak boleh mengembalikan respons mock
  console.log('\n[5/5] Menguji sendMessageWithFallback tanpa respons palsu/mock...');
  try {
    await globalProviderRegistry.sendMessageWithFallback(
      'prov-openai', // provider tanpa key di environment uji
      [],
      [{ role: 'user', content: 'Uji respons' }],
      false // allowMock = false
    );
    throw new Error('FAILED: sendMessageWithFallback menghasilkan respons palsu bukannya melempar ApiKey error!');
  } catch (err) {
    if (err instanceof ApiKeyMissingError || err instanceof ApiKeyInvalidError) {
      console.log(`- Berhasil memblokir respons palsu dan melempar error resmi: "${(err as Error).message}"`);
    } else {
      throw new Error(`Error yang dilempar tidak terduga: ${err}`);
    }
  }

  // Test 4: Memeriksa ketersediaan fungsi dialog FS Bridge
  console.log('\n[4/4] Menguji fungsi dialog non-blocking di fsBridge...');
  if (typeof selectFileDialog !== 'function' || typeof selectFolderDialog !== 'function' || typeof selectSaveFileDialog !== 'function') {
    throw new Error('Fungsi dialog fsBridge tidak lengkap.');
  }
  const sampleFilePath = await selectFileDialog();
  console.log(`- selectFileDialog default: ${sampleFilePath}`);
  const sampleFolderPath = await selectFolderDialog();
  console.log(`- selectFolderDialog default: ${sampleFolderPath}`);
  const sampleSavePath = await selectSaveFileDialog('test.txt');
  console.log(`- selectSaveFileDialog default: ${sampleSavePath}`);

  console.log('\n=== SEMUA 4 PENGUJIAN VALIDASI BERHASIL (PASSED) ===');
}

runTests().catch((err) => {
  console.error('\nTEST GAGAL:', err);
  throw err;
});
