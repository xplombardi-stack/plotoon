// Tipos de negócio do Atendente WhatsApp: cada um mostra os campos e exemplos que fazem sentido pra ele.
export type NichoId = 'alimentacao' | 'varejo' | 'fabrica' | 'servicos' | 'digital' | 'outro'

export type CampoExtra = { label: string; dica?: string; placeholder: string }

export type Nicho = {
  id: NichoId
  nome: string
  emoji: string
  exemplos: string
  fotoLabel: string // botão de ler foto
  produtosTitulo: string
  produtosPlaceholder: string
  entregaBairros: boolean // taxa e prazo por bairro
  frete?: { label: string; placeholder: string } // envio/frete em texto livre
  endereco: 'obrigatorio' | 'opcional' | 'nao' // mostra o bloco "onde fica"
  extras: CampoExtra[]
  perguntas: string[] // perguntas comuns pra adicionar com um toque
  perguntasPlaceholder: string
  regrasPlaceholder: string
  observacoesPlaceholder: string
}

export const NICHOS: Nicho[] = [
  {
    id: 'alimentacao',
    nome: 'Alimentação e delivery',
    emoji: '🍕',
    exemplos: 'Pizzaria, lanchonete, restaurante, doces, marmitas',
    fotoLabel: 'Mandar foto do cardápio',
    produtosTitulo: 'Cardápio e preços',
    produtosPlaceholder: 'Pizza grande calabresa: R$ 52,90\nBorda recheada: + R$ 10,00\nRefrigerante 2L: R$ 14,00',
    entregaBairros: true,
    endereco: 'obrigatorio',
    extras: [],
    perguntas: ['Qual o tempo de entrega?', 'Pode meio a meio?', 'Aceita Pix ou cartão na entrega?', 'Tem promoção hoje?', 'Pode retirar no balcão?', 'Tem opção sem lactose ou vegana?'],
    perguntasPlaceholder: 'Pode meio a meio? Pode, cobra o sabor mais caro.\nAceita cartão na entrega? Sim, levamos a maquininha.',
    regrasPlaceholder: 'Pra fechar pedido, pegue sabores, endereço e forma de pagamento, repita o pedido com o total e me chame.\nSe reclamarem de atraso, me chame na hora.',
    observacoesPlaceholder: 'Sexta e sábado o movimento é grande, avisa que pode atrasar uns 15 min.\nSempre ofereça bebida se o cliente não pedir.',
  },
  {
    id: 'varejo',
    nome: 'Loja e varejo',
    emoji: '🛍️',
    exemplos: 'Roupas, calçados, perfumes, acessórios, eletrônicos',
    fotoLabel: 'Mandar foto da tabela de preços ou catálogo',
    produtosTitulo: 'Produtos, tamanhos e preços',
    produtosPlaceholder: 'Camiseta oversized: R$ 89,90 (P ao GG, preta e branca)\nTênis runner: R$ 249,90 (34 ao 43)\nKit 3 meias: R$ 39,90',
    entregaBairros: true,
    frete: { label: 'Envio pra outras cidades', placeholder: 'Enviamos pelos Correios pra todo o Brasil. PAC de 5 a 10 dias, Sedex de 2 a 4. Frete grátis acima de R$ 299.' },
    endereco: 'opcional',
    extras: [{ label: 'Trocas e devoluções', placeholder: 'Troca em até 7 dias com etiqueta. O cliente paga o frete da troca.' }],
    perguntas: ['Tem no meu tamanho?', 'Qual o valor do frete?', 'Em quanto tempo chega?', 'Posso trocar se não servir?', 'Parcela no cartão?', 'É original?'],
    perguntasPlaceholder: 'Parcela? Sim, em até 3x sem juros no cartão.\nÉ original? Sim, todos com nota fiscal.',
    regrasPlaceholder: 'Não dar desconto além do Pix sem falar comigo.\nSe pedirem troca, me chame.',
    observacoesPlaceholder: 'A forma é pequena, sempre sugira um número acima.\nFoto real do produto eu mando quando o cliente pedir.',
  },
  {
    id: 'fabrica',
    nome: 'Fábrica e encomendas',
    emoji: '🏭',
    exemplos: 'Uniformes, brindes, confecção, móveis sob medida, gráfica',
    fotoLabel: 'Mandar foto da tabela de preços',
    produtosTitulo: 'Produtos e preços por quantidade',
    produtosPlaceholder: 'Camiseta polo com bordado: R$ 45 (até 50 un.), R$ 39 (51 a 200 un.), R$ 34 (acima de 200)\nCamiseta dry fit com silk: R$ 32 / R$ 27 / R$ 23\nJaleco: R$ 79',
    entregaBairros: false,
    frete: { label: 'Entrega e frete', placeholder: 'Entregamos na região sem custo acima de 100 peças. Outras cidades por transportadora, frete por conta do cliente.' },
    endereco: 'opcional',
    extras: [
      { label: 'Pedido mínimo', placeholder: 'Mínimo de 20 peças por modelo.' },
      { label: 'Prazo de produção', placeholder: '15 a 20 dias úteis depois da aprovação da arte e do sinal.' },
      { label: 'Personalização e arte', placeholder: 'Bordado, silk e sublimação. Criamos a arte sem custo, o cliente aprova antes de produzir.' },
      { label: 'Pagamento', placeholder: '50% de sinal pra começar e 50% na entrega. Pix ou boleto.' },
    ],
    perguntas: ['Qual o pedido mínimo?', 'Qual o prazo de produção?', 'Vocês fazem a arte?', 'Tem amostra ou mostruário?', 'Tem tabela de medidas?', 'Como funciona o pagamento?'],
    perguntasPlaceholder: 'Tem amostra? Temos mostruário na fábrica, pode agendar uma visita.\nTem tabela de medidas? Tem, eu mando por aqui.',
    regrasPlaceholder: 'Orçamento fechado: pegue quantidade, modelo, tamanhos e prazo desejado, e me chame.\nNunca prometa prazo menor que o de produção.',
    observacoesPlaceholder: 'Empresa grande costuma pedir nota fiscal, a gente emite.\nPra escola, o pico é janeiro e fevereiro, avisar que o prazo aumenta.',
  },
  {
    id: 'servicos',
    nome: 'Serviços com horário',
    emoji: '💈',
    exemplos: 'Salão, barbearia, estética, clínica, oficina, academia',
    fotoLabel: 'Mandar foto da tabela de serviços',
    produtosTitulo: 'Serviços, duração e preços',
    produtosPlaceholder: 'Corte masculino: R$ 45 (40 min)\nCorte + barba: R$ 70 (1h)\nSobrancelha: R$ 20 (15 min)',
    entregaBairros: false,
    endereco: 'obrigatorio',
    extras: [
      { label: 'Como agendar', dica: 'Link da agenda ou como ele deve marcar', placeholder: 'Agendamento pelo link https://… ou eu confirmo o horário por aqui. Precisa de 2h de antecedência.' },
      { label: 'Cancelamento e atraso', placeholder: 'Cancelar com até 3h de antecedência. Atraso de mais de 15 min pode precisar remarcar.' },
    ],
    perguntas: ['Tem horário hoje?', 'Quanto tempo demora?', 'Precisa agendar antes?', 'Tem estacionamento?', 'Atende por convênio?', 'Aceita cartão?'],
    perguntasPlaceholder: 'Tem estacionamento? Tem, na frente do salão.\nAtende sem agendar? Atende se tiver horário livre, mas o ideal é marcar.',
    regrasPlaceholder: 'Nunca confirme horário sem eu ver a agenda: diga que vai verificar e me chame.\nNão dar desconto em pacote sem falar comigo.',
    observacoesPlaceholder: 'Sábado lota rápido, ofereça sexta à tarde.\nCliente novo ganha 10% no primeiro corte.',
  },
  {
    id: 'digital',
    nome: 'Digital e infoprodutos',
    emoji: '💻',
    exemplos: 'Cursos, mentorias, agências, marketing digital, assinaturas',
    fotoLabel: 'Mandar foto da tabela de planos',
    produtosTitulo: 'Produtos, planos e preços',
    produtosPlaceholder: 'Curso de tráfego pago: R$ 497 ou 12x de R$ 49,70 (acesso por 1 ano)\nMentoria individual: R$ 1.500 (4 encontros)\nGestão de tráfego: a partir de R$ 1.200/mês',
    entregaBairros: false,
    endereco: 'nao',
    extras: [
      { label: 'Links de compra', dica: 'Ele manda quando o cliente quiser comprar', placeholder: 'Curso: https://pay.exemplo.com/curso\nMentoria: https://pay.exemplo.com/mentoria' },
      { label: 'Garantia e acesso', placeholder: 'Garantia de 7 dias. O acesso chega no e-mail logo depois da compra.' },
    ],
    perguntas: ['Como recebo o acesso?', 'Tem garantia?', 'Parcela no cartão?', 'Serve pra iniciante?', 'Tem certificado?', 'Quanto tempo de acesso?'],
    perguntasPlaceholder: 'Serve pra iniciante? Sim, começa do zero.\nTem certificado? Tem, ao terminar as aulas.',
    regrasPlaceholder: 'Não prometa resultado garantido de faturamento.\nSe a pessoa quiser falar de proposta pra empresa, me chame.',
    observacoesPlaceholder: 'Quem pergunta preço sem contexto, primeiro entenda o momento dela antes de mandar o link.\nTem bônus de aula ao vivo até sexta.',
  },
  {
    id: 'outro',
    nome: 'Outro',
    emoji: '✍️',
    exemplos: 'Escreva qual é o seu negócio',
    fotoLabel: 'Mandar foto da tabela de preços',
    produtosTitulo: 'Produtos, serviços e preços',
    produtosPlaceholder: 'O que você vende e quanto custa, um por linha.',
    entregaBairros: false,
    frete: { label: 'Entrega, envio ou atendimento', placeholder: 'Como o cliente recebe o produto ou o serviço, prazos e custos.' },
    endereco: 'opcional',
    extras: [],
    perguntas: ['Quanto custa?', 'Como funciona?', 'Qual o prazo?', 'Aceita Pix?', 'Onde fica?'],
    perguntasPlaceholder: 'Pergunta? Resposta, do jeito que você responderia.',
    regrasPlaceholder: 'O que ele nunca deve fazer e quando deve chamar você.',
    observacoesPlaceholder: 'Qualquer coisa que um funcionário novo precisaria saber.',
  },
]

export const nichoPor = (id: string) => NICHOS.find((n) => n.id === id) ?? null
