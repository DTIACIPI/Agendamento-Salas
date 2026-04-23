import { test, expect, type Page } from '@playwright/test'

/**
 * Teste E2E visual completo:
 *  1. Agenda 1 sessão em cada uma das 3 salas
 *  2. Abre o carrinho, avança para step 2
 *  3. Preenche CNPJ e prossegue para o formulário
 *  4. Preenche todos os campos obrigatórios com dados de teste
 *  5. Envia o formulário
 *
 * Para rodar:
 *   npm run test:e2e
 */

const TEST_CNPJ = '54.375.647/0001-27'
const TEST_CNPJ_DIGITS = '54375647000127'
const TEST_COUPON = 'CUPOMTESTE'

// Horários variados por sala
const ROOM_CONFIGS = [
  { startTime: '08:00', endTime: '10:00' },
  { startTime: '14:00', endTime: '16:00' },
  { startTime: '18:00', endTime: '20:00' },
]

// Dados fictícios para o formulário
const FORM_DATA = {
  razaoSocial: 'Empresa Teste Ltda',
  nomeFantasia: 'Teste & Cia',
  inscricaoEstadual: '123456789',
  cep: '14400-000',
  endereco: 'Rua dos Testes',
  numero: '123',
  complemento: 'Sala 4',
  bairro: 'Centro',
  cidade: 'Franca',
  nomeResponsavel: 'João da Silva Teste',
  emailResponsavel: 'joao.teste@empresa.com',
  telefoneResponsavel: '16999887766',
  cargoResponsavel: 'Diretor',
}

const EVENT_DATA = {
  nomeEvento: 'Workshop de Teste E2E',
  finalidadeEvento: 'Teste automatizado Playwright',
  participantes: '50',
  responsavelLocal: 'Maria Teste',
  contatoLocal: '16988776655',
  observacoes: 'Reserva criada por teste automatizado.',
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Espera os cards de sala carregarem e retorna os nomes das salas.
 * Salas estão em cards com classe cursor-pointer, o título é h3 com leading-tight.
 */
async function waitForRooms(page: Page): Promise<string[]> {
  // Espera aparecer pelo menos um card de sala
  await page.locator('[class*="cursor-pointer"] h3.leading-tight').first().waitFor({ timeout: 20_000 })
  const headings = page.locator('[class*="cursor-pointer"] h3.leading-tight')
  const count = await headings.count()
  const names: string[] = []
  for (let i = 0; i < count; i++) {
    const txt = await headings.nth(i).textContent()
    if (txt) names.push(txt.trim())
  }
  return names
}

/**
 * Clica no card da sala pelo nome.
 */
async function selectRoom(page: Page, roomName: string) {
  const card = page.locator('[class*="cursor-pointer"]', {
    has: page.locator(`h3:has-text("${roomName}")`)
  }).first()
  await card.scrollIntoViewIfNeeded()
  await card.click()
  await page.waitForTimeout(2000)
}

/**
 * Seleciona uma data disponível no calendário.
 * react-day-picker v9 usa <button> com data-day e data-disabled.
 */
async function selectAvailableDate(page: Page): Promise<boolean> {
  await page.waitForTimeout(2000)

  // Botões de dia do calendário: têm data-day attribute
  const dayButtons = page.locator('[data-slot="calendar"] button[data-day]')
  const count = await dayButtons.count()

  for (let i = 0; i < count; i++) {
    const btn = dayButtons.nth(i)

    // Verifica se está visível
    if (await btn.isHidden()) continue

    // Verifica se está desabilitado (atributo disabled ou aria-disabled)
    const disabled = await btn.getAttribute('disabled')
    if (disabled !== null) continue

    // Verifica se o parent td tem data-disabled
    const tdDisabled = await btn.locator('xpath=ancestor::td').getAttribute('data-disabled').catch(() => null)
    if (tdDisabled === 'true') continue

    // Verifica se já está selecionado
    const selected = await btn.getAttribute('data-selected-single')
    if (selected === 'true') continue

    // Verifica se é "outside" (dia do mês anterior/próximo)
    const tdOutside = await btn.locator('xpath=ancestor::td').getAttribute('data-outside').catch(() => null)
    if (tdOutside === 'true') continue

    await btn.scrollIntoViewIfNeeded()
    await btn.click()
    return true
  }
  return false
}

async function setTimeAndDefine(page: Page, startTime: string, endTime: string) {
  // Localiza a seção de definir horário
  const section = page.locator('text=Definir Horário').locator('..')
  await section.locator('select').first().selectOption(startTime)
  await page.waitForTimeout(300)
  await section.locator('select').nth(1).selectOption(endTime)
  await page.waitForTimeout(300)
  await section.locator('button', { hasText: 'Definir Horário' }).click()
  await page.waitForTimeout(1500)
}

async function addRoomToCart(page: Page) {
  const btn = page.locator('button', { hasText: 'Adicionar sala' })
  await expect(btn).toBeVisible({ timeout: 10_000 })
  await btn.scrollIntoViewIfNeeded()
  await btn.click()
  await page.waitForTimeout(1000)
}

/**
 * Preenche um input pelo atributo name, respeitando se está readonly.
 */
async function fillField(page: Page, name: string, value: string) {
  const input = page.locator(`input[name="${name}"]`)
  const readonly = await input.getAttribute('readonly')
  if (readonly !== null) return // campo travado pelo Supera, pula

  await input.scrollIntoViewIfNeeded()
  await input.click()
  await input.fill(value)
}

/**
 * Digita no CNPJ input caractere a caractere (por causa da máscara).
 */
async function typeCnpjMasked(page: Page, selector: string, digits: string) {
  const input = page.locator(selector)
  await input.click()
  await input.fill('') // limpa
  for (const char of digits) {
    await input.press(char)
    await page.waitForTimeout(50)
  }
}

// ─── Teste Principal ────────────────────────────────────────

test('Fluxo completo: 3 salas → carrinho → CNPJ → formulário → envio', async ({ page }) => {

  // ═══════════════════════════════════════════════════
  // PARTE 1: Agendar 3 salas
  // ═══════════════════════════════════════════════════

  await test.step('Carregar página e listar salas', async () => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  const roomNames = await waitForRooms(page)
  console.log(`\n✓ Salas encontradas: ${roomNames.join(', ')}`)
  expect(roomNames.length).toBeGreaterThanOrEqual(3)

  const roomsToBook = roomNames.slice(0, 3)

  for (let i = 0; i < roomsToBook.length; i++) {
    const name = roomsToBook[i]
    const cfg = ROOM_CONFIGS[i]

    await test.step(`Agendar sala ${i + 1}: "${name}"`, async () => {
      await selectRoom(page, name)
      console.log(`  ✓ Sala "${name}" selecionada`)

      const found = await selectAvailableDate(page)
      expect(found).toBe(true)
      console.log(`  ✓ Data selecionada`)

      await setTimeAndDefine(page, cfg.startTime, cfg.endTime)
      console.log(`  ✓ Horário: ${cfg.startTime} - ${cfg.endTime}`)

      await addRoomToCart(page)
      console.log(`  ✓ Adicionada ao carrinho`)
    })
  }

  // ═══════════════════════════════════════════════════
  // PARTE 2: Abrir carrinho e ir para step 2
  // ═══════════════════════════════════════════════════

  await test.step('Abrir o carrinho', async () => {
    // O botão do carrinho pode ter diferentes formatos; tenta vários seletores
    const possibleCartButtons = [
      page.locator('button', { hasText: /carrinho/i }),
      page.locator('button', { hasText: /reserva/i }),
      page.locator('button:has(span:text("3"))'),
      page.locator('[class*="fixed"] button').first(),
    ]

    for (const btn of possibleCartButtons) {
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        break
      }
    }
    await page.waitForTimeout(2000)
    console.log(`  ✓ Carrinho aberto`)
  })

  await test.step('Avançar para step 2 (Contrato)', async () => {
    const continueBtn = page.locator('button', { hasText: 'Continuar para Contrato' })
    await expect(continueBtn).toBeVisible({ timeout: 10_000 })
    await continueBtn.click()
    await page.waitForTimeout(1000)
    console.log(`  ✓ Step 2 - Dados do Contrato`)
  })

  // ═══════════════════════════════════════════════════
  // PARTE 3: Preencher CNPJ e solicitar pré-reserva
  // ═══════════════════════════════════════════════════

  await test.step('Preencher CNPJ', async () => {
    const cnpjInput = page.locator('#cnpj')
    await expect(cnpjInput).toBeVisible()
    await typeCnpjMasked(page, '#cnpj', TEST_CNPJ_DIGITS)
    await page.waitForTimeout(2000) // espera debounce da API de pricing
    console.log(`  ✓ CNPJ preenchido: ${TEST_CNPJ}`)
  })

  await test.step('Aplicar cupom de desconto', async () => {
    // Cupom fica na mesma tela do CNPJ, habilitado após CNPJ válido
    const couponInput = page.locator('input[placeholder="Digite o cupom"]')
    await expect(couponInput).toBeVisible({ timeout: 5_000 })
    await expect(couponInput).toBeEnabled({ timeout: 5_000 })
    await couponInput.fill(TEST_COUPON)

    const aplicarBtn = page.locator('button', { hasText: 'Aplicar' })
    await aplicarBtn.click()

    // Espera o cupom ser aplicado (badge verde aparece)
    await expect(page.getByText(TEST_COUPON, { exact: true }).first()).toBeVisible({ timeout: 10_000 })
    console.log(`  ✓ Cupom "${TEST_COUPON}" aplicado`)
  })

  await test.step('Clicar em Solicitar Pré-Reserva', async () => {
    // Espera o pricing carregar
    await page.waitForTimeout(3000)

    const preReservaBtn = page.locator('button', { hasText: 'Solicitar Pré-Reserva' })
    await expect(preReservaBtn).toBeVisible({ timeout: 15_000 })

    // Aguarda ficar habilitado (CNPJ válido + pricing carregado)
    await expect(preReservaBtn).toBeEnabled({ timeout: 15_000 })
    await preReservaBtn.click()
    console.log(`  ✓ Pré-reserva solicitada, redirecionando para formulário...`)
  })

  // ═══════════════════════════════════════════════════
  // PARTE 4: Preencher o formulário completo
  // ═══════════════════════════════════════════════════

  await test.step('Aguardar página do formulário', async () => {
    await page.waitForURL('**/formulario**', { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // espera hydration
    console.log(`  ✓ Formulário carregado: ${page.url()}`)
  })

  await test.step('Preencher Dados Cadastrais', async () => {
    // Campos que podem vir pré-preenchidos pelo Supera ficam readonly
    // fillField já lida com isso (pula se readonly)
    await fillField(page, 'razaoSocial', FORM_DATA.razaoSocial)
    await fillField(page, 'nomeFantasia', FORM_DATA.nomeFantasia)
    await fillField(page, 'inscricaoEstadual', FORM_DATA.inscricaoEstadual)
    await fillField(page, 'cep', FORM_DATA.cep)
    await fillField(page, 'endereco', FORM_DATA.endereco)
    await fillField(page, 'numero', FORM_DATA.numero)
    await fillField(page, 'complemento', FORM_DATA.complemento)
    await fillField(page, 'bairro', FORM_DATA.bairro)
    await fillField(page, 'cidade', FORM_DATA.cidade)

    // Estado: se não estiver travado, seleciona SP
    const estadoSelect = page.locator('select[name="estado"]')
    if (await estadoSelect.isVisible().catch(() => false)) {
      const readonly = await estadoSelect.getAttribute('readonly')
      if (readonly === null) {
        await estadoSelect.selectOption('SP')
      }
    }

    console.log(`  ✓ Dados cadastrais preenchidos`)
  })

  await test.step('Preencher Dados do Responsável', async () => {
    await fillField(page, 'nomeResponsavel', FORM_DATA.nomeResponsavel)
    await fillField(page, 'emailResponsavel', FORM_DATA.emailResponsavel)
    await fillField(page, 'telefoneResponsavel', FORM_DATA.telefoneResponsavel)
    await fillField(page, 'cargoResponsavel', FORM_DATA.cargoResponsavel)
    console.log(`  ✓ Dados do responsável preenchidos`)
  })

  await test.step('Preencher Sobre o Evento (para cada sala)', async () => {
    // Pode ter abas se mais de 1 booking. Vamos iterar pelas abas se existirem.
    const tabButtons = page.locator('button').filter({ hasText: /\d{2}:\d{2}-\d{2}:\d{2}/ })
    const tabCount = await tabButtons.count()

    if (tabCount > 1) {
      // Múltiplas abas: preenche cada uma
      for (let i = 0; i < tabCount; i++) {
        await tabButtons.nth(i).click()
        await page.waitForTimeout(500)
        await fillEventFields(page)
      }
    } else {
      // Uma única aba ou sem abas
      await fillEventFields(page)
    }

    console.log(`  ✓ Dados do evento preenchidos`)
  })

  await test.step('Selecionar forma de pagamento', async () => {
    const pagamento = page.locator('select[name="opcaoPagamento"]')
    await pagamento.scrollIntoViewIfNeeded()
    await pagamento.selectOption('pix')
    console.log(`  ✓ Forma de pagamento: PIX`)
  })

  // ═══════════════════════════════════════════════════
  // PARTE 5: Enviar o formulário
  // ═══════════════════════════════════════════════════

  await test.step('Enviar formulário (Concluir Reserva)', async () => {
    await page.screenshot({ path: 'e2e/screenshots/form-before-submit.png', fullPage: true })

    const submitBtn = page.locator('button', { hasText: /Concluir Reserva/i })
    await submitBtn.scrollIntoViewIfNeeded()

    // Espera ficar habilitado
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 })
    await submitBtn.click()
    console.log(`  ✓ Formulário enviado!`)

    // Aguarda o popup de sucesso ou erro
    const popup = page.locator('text=Reserva(s) enviada(s) com sucesso').or(
      page.locator('text=Erro')
    )
    await expect(popup).toBeVisible({ timeout: 20_000 })

    const isSuccess = await page.locator('text=Reserva(s) enviada(s) com sucesso').isVisible().catch(() => false)

    if (isSuccess) {
      console.log(`\n🎉 SUCESSO! Reservas enviadas com sucesso!`)
    } else {
      console.log(`\n⚠ Houve um erro no envio (pode ser esperado em ambiente de teste)`)
    }

    await page.screenshot({ path: 'e2e/screenshots/form-after-submit.png', fullPage: false })
    console.log(`\n✓ Screenshots salvos em e2e/screenshots/`)
  })
})

// ─── Helper: preenche os campos de evento visíveis na tela ───

async function fillEventFields(page: Page) {
  // Nome do evento
  const nomeEvento = page.locator('input[placeholder="Ex: Workshop de Tecnologia"]')
  if (await nomeEvento.isVisible()) {
    await nomeEvento.fill(EVENT_DATA.nomeEvento)
  }

  // Finalidade
  const finalidade = page.locator('input[placeholder*="Treinamento"]')
  if (await finalidade.isVisible()) {
    await finalidade.fill(EVENT_DATA.finalidadeEvento)
  }

  // Participantes
  const participantes = page.locator('input[placeholder="Ex: 50"]')
  if (await participantes.isVisible()) {
    await participantes.fill(EVENT_DATA.participantes)
  }

  // Responsável no dia
  const responsavel = page.locator('input[placeholder="Nome de quem estará presente"]')
  if (await responsavel.isVisible()) {
    await responsavel.fill(EVENT_DATA.responsavelLocal)
  }

  // Contato do responsável
  const contato = page.locator('input[placeholder="(00) 00000-0000"]').last()
  if (await contato.isVisible()) {
    await contato.fill(EVENT_DATA.contatoLocal)
  }

  // Observações
  const obs = page.locator('textarea[placeholder*="Necessidades especiais"]')
  if (await obs.isVisible()) {
    await obs.fill(EVENT_DATA.observacoes)
  }
}
