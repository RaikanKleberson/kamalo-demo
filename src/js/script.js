// ===== CONFIGURAÇÃO DO SUPABASE =====
const SUPABASE_URL = "https://hvskcvrudpuqwpvoyxrk.supabase.co";
const SUPABASE_KEY = "sb_publishable_JQ2wiXMsvXgdvYGbnfS1Gw_sYGNndgK";

const clienteSupabase = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const CHAVE_CARRINHO = "carrinho_kamalo";

// ===== CATEGORIAS =====
const CATEGORIAS = [
  "acai",
  "combos",
  "sorvetes",
  "sucosnaturais",
  "bebidas"
];

let produtos = [];
let slideAtual = 0;
let intervaloCarrossel = null;

// ===== NORMALIZA TEXTO =====
function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// ===== FORMATA PREÇO =====
function formatarPreco(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// ===== PEGA O NOME =====
function obterNome(produto) {
  const valor = produto.nome;

  if (typeof valor === "object" && valor !== null) {
    return valor.pt || valor.br || valor.name || valor.nome || "Produto";
  }

  return String(valor ?? "Produto");
}

// ===== PEGA O PREÇO =====
function obterPreco(produto) {
  const valor = produto.preco;

  if (typeof valor === "object" && valor !== null) {
    return Number(
      valor.valor ??
      valor.price ??
      valor.preco ??
      0
    );
  }

  return Number(valor ?? 0);
}

// ===== PEGA A IMAGEM (USA O FOTO_URL DO BANCO) =====
function obterImagem(produto) {

  // USA O FOTO_URL DO BANCO
  if (
    produto.foto_url &&
    produto.foto_url.startsWith("http")
  ) {
    return produto.foto_url;
  }

  // Fallback: placeholder
  return "https://via.placeholder.com/300x300/6a1b9a/FFFFFF?text=Produto";
}

// ===== SALVA CARRINHO =====
function salvarDados() {
  const quantidades = {};

  produtos.forEach((produto) => {
    const qtd = Number(produto.qtd || 0);

    if (qtd > 0) {
      quantidades[String(produto.id)] = qtd;
    }
  });

  localStorage.setItem(
    CHAVE_CARRINHO,
    JSON.stringify(quantidades)
  );
}

// ===== CARREGA CARRINHO SALVO =====
function carregarDadosSalvos() {
  try {
    return JSON.parse(
      localStorage.getItem(CHAVE_CARRINHO)
    ) || {};
  } catch {
    return {};
  }
}

// ===== MOSTRA ERRO =====
function mostrarErroCatalogo(mensagem) {
  CATEGORIAS.forEach((categoria) => {

    const container = document.getElementById(
      `${categoria}-produtos`
    );

    if (!container) return;

    container.innerHTML = `
      <p style="
        grid-column: 1 / -1;
        text-align: center;
        padding: 30px 15px;
        color: #c0392b;
        font-weight: 600;
      ">
        ⚠️ ${mensagem}
      </p>
    `;
  });
}

// ===== CARREGA PRODUTOS DO SUPABASE =====
async function carregarProdutosDoSupabase() {

  console.log("🚀 Kamalo: carregando do Supabase...");

  const { data, error } = await clienteSupabase
    .from("produtos_kamalo_demo")
    .select("*");

  if (error) {

    console.error("Erro:", error);

    mostrarErroCatalogo(
      "Erro ao carregar produtos."
    );

    return;
  }

  if (!Array.isArray(data) || data.length === 0) {

    console.warn("Nenhum produto encontrado.");

    mostrarErroCatalogo(
      "Nenhum produto cadastrado."
    );

    return;
  }

  console.log(
    `${data.length} produtos carregados!`
  );

  const quantidadesSalvas =
    carregarDadosSalvos();

  // CRIA OS PRODUTOS USANDO O FOTO_URL DO BANCO
  produtos = data.map((produto) => {

    const id = String(produto.id);

    return {
      id: id,
      nome: obterNome(produto),
      preco: obterPreco(produto),
      categoria: normalizarTexto(
        produto.categoria
      ),
      imagem: obterImagem(produto),

      // IMPORTANTE:
      // cada produto possui sua própria quantidade
      qtd: Number(
        quantidadesSalvas[id] || 0
      )
    };
  });

  console.log(
    `${produtos.length} produtos processados`
  );

  inicializarCatalogo();

  atualizarCarrinho();

  mostrarCategoria("acai");
}

// ===== INICIALIZA CATÁLOGO =====
function inicializarCatalogo() {

  CATEGORIAS.forEach((categoria) => {

    const container = document.getElementById(
      `${categoria}-produtos`
    );

    if (!container) return;

    container.innerHTML = "";

    const filtrados = produtos.filter(
      (p) => p.categoria === categoria
    );

    if (filtrados.length === 0) {

      container.innerHTML = `
        <p style="
          grid-column: 1 / -1;
          text-align: center;
          padding: 20px;
          color: #999;
        ">
          Nenhum produto disponível
        </p>
      `;

      return;
    }

    filtrados.forEach((produto) => {

      const card =
        document.createElement("div");

      card.className = "produto-card";

      // Guarda o ID como string
      // para evitar problemas com UUID/texto
      card.dataset.id =
        String(produto.id);

      card.innerHTML = `
        <img
          src="${produto.imagem}"
          class="produto-imagem"
          alt="${produto.nome}"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/300x300/6a1b9a/FFFFFF?text=Erro'"
        />

        <h3 class="produto-nome">
          ${produto.nome}
        </h3>

        <p class="produto-preco">
          ${formatarPreco(produto.preco)}
        </p>

        <div class="controles">

          <button
            type="button"
            class="btn-quantidade btn-diminuir"
            data-id="${String(produto.id)}"
          >
            −
          </button>

          <span
            class="quantidade"
            id="qtd-${String(produto.id)}"
          >
            ${produto.qtd}
          </span>

          <button
            type="button"
            class="btn-quantidade btn-aumentar"
            data-id="${String(produto.id)}"
          >
            +
          </button>

        </div>
      `;

      // ===== BOTÃO + =====
      const btnAumentar =
        card.querySelector(".btn-aumentar");

      btnAumentar.addEventListener(
        "click",
        () => {
          aumentar(String(produto.id));
        }
      );

      // ===== BOTÃO - =====
      const btnDiminuir =
        card.querySelector(".btn-diminuir");

      btnDiminuir.addEventListener(
        "click",
        () => {
          diminuir(String(produto.id));
        }
      );

      container.appendChild(card);
    });
  });
}

// ===== MOSTRA CATEGORIA =====
function mostrarCategoria(categoria) {

  document
    .querySelectorAll(".categoria")
    .forEach((secao) => {
      secao.classList.remove("ativa");
    });

  const secaoAlvo =
    document.getElementById(categoria);

  if (secaoAlvo) {
    secaoAlvo.classList.add("ativa");
  }

  document
    .querySelectorAll(".menu-categorias a")
    .forEach((link) => {
      link.classList.remove("ativo");
    });

  const linkAlvo =
    document.querySelector(
      `.menu-categorias a[data-categoria="${categoria}"]`
    );

  if (linkAlvo) {
    linkAlvo.classList.add("ativo");
  }
}

// ===== MENU DE CATEGORIAS =====
function iniciarMenuCategorias() {

  document
    .querySelectorAll(".menu-categorias a")
    .forEach((link) => {

      link.addEventListener(
        "click",
        (evento) => {

          evento.preventDefault();

          const categoria =
            link.dataset.categoria;

          if (categoria) {
            mostrarCategoria(categoria);
          }
        }
      );
    });
}

// ===== ABRE CARRINHO =====
function abrirCarrinho() {

  const carrinho =
    document.querySelector(".carrinho");

  if (!carrinho) return;

  carrinho.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// ===== AUMENTAR =====
function aumentar(id) {

  id = String(id);

  // Procura SOMENTE o produto clicado
  const produto = produtos.find(
    (item) =>
      String(item.id) === id
  );

  if (!produto) {

    console.error(
      "Produto não encontrado:",
      id
    );

    return;
  }

  // IMPORTANTE:
  // aumenta somente a quantidade deste produto.
  //
  // Exemplo:
  // Produto A = 1
  // clicar + = 2
  // clicar + = 3
  //
  // Isso NÃO altera nenhum outro produto.
  produto.qtd =
    Number(produto.qtd || 0) + 1;

  const el =
    document.getElementById(`qtd-${id}`);

  if (el) {
    el.textContent = produto.qtd;
  }

  salvarDados();

  atualizarCarrinho();
}

// ===== DIMINUIR =====
function diminuir(id) {
  id = String(id);

  const produto = produtos.find(
    (item) => String(item.id) === id
  );

  if (!produto) {
    console.error("Produto não encontrado:", id);
    return;
  }

  // TRAVA NO 1
  // O botão - nunca remove o produto.
  if (Number(produto.qtd) <= 1) {
    produto.qtd = 1;

    const el = document.getElementById(`qtd-${id}`);

    if (el) {
      el.textContent = "1";
    }

    return;
  }

  // Diminui somente 1 unidade
  produto.qtd = Number(produto.qtd) - 1;

  const el = document.getElementById(`qtd-${id}`);

  if (el) {
    el.textContent = produto.qtd;
  }

  salvarDados();
  atualizarCarrinho();
}


// ===== REMOVE PRODUTO DO CARRINHO =====
function removerDoCarrinho(id) {
  id = String(id);

  const produto = produtos.find(
    (item) => String(item.id) === id
  );

  if (!produto) {
    console.error("Produto não encontrado:", id);
    return;
  }

  // Remove o produto INDEPENDENTE da quantidade.
  // Funciona com 1, 2, 10, 100...
  produto.qtd = 0;

  // Atualiza o contador no card do produto
  const quantidadeCard = document.getElementById(`qtd-${id}`);

  if (quantidadeCard) {
    quantidadeCard.textContent = "0";
  }

  // Remove do localStorage
  salvarDados();

  // Atualiza o carrinho
  atualizarCarrinho();
}

// ===== ATUALIZA CARRINHO =====
function atualizarCarrinho() {
  const lista = document.getElementById("lista-produtos");
  const totalDisplay = document.getElementById("total-pedido");
  const contador = document.getElementById("carrinho-contador");

  if (!lista || !totalDisplay) return;

  lista.innerHTML = "";

  let total = 0;
  let produtosNoCarrinho = 0;

  produtos.forEach((produto) => {
    const qtd = Number(produto.qtd || 0);

    if (qtd <= 0) return;

    const preco = Number(produto.preco || 0);
    const subtotal = preco * qtd;

    total += subtotal;
    produtosNoCarrinho++;

    const id = String(produto.id);

    const item = document.createElement("div");
    item.className = "carrinho-item";

    item.innerHTML = `
      <span class="carrinho-produto-nome">
        ${qtd}x ${produto.nome}
      </span>

      <div class="carrinho-controles">
        <button
          type="button"
          class="carrinho-btn quantidade-menos"
          data-id="${id}"
        >
          −
        </button>

        <span class="carrinho-quantidade">
          ${qtd}
        </span>

        <button
          type="button"
          class="carrinho-btn quantidade-mais"
          data-id="${id}"
        >
          +
        </button>
      </div>

      <div class="carrinho-item-direita">
        <span class="carrinho-preco">
          ${formatarPreco(subtotal)}
        </span>

        <button
          type="button"
          class="btn-remover"
          data-id="${id}"
          title="Remover produto"
        >
          ×
        </button>
      </div>
    `;

    // BOTÃO -
    item
      .querySelector(".quantidade-menos")
      .addEventListener("click", () => {
        diminuir(id);
      });

    // BOTÃO +
    item
      .querySelector(".quantidade-mais")
      .addEventListener("click", () => {
        aumentar(id);
      });

    // BOTÃO X - REMOVE O PRODUTO INTEIRO
    item
      .querySelector(".btn-remover")
      .addEventListener("click", () => {
        removerDoCarrinho(id);
      });

    lista.appendChild(item);
  });

  // Carrinho vazio
  if (produtosNoCarrinho === 0) {
    lista.innerHTML =
      '<p class="carrinho-vazio">Seu carrinho está vazio</p>';
  }

  // Total
  totalDisplay.textContent = formatarPreco(total);

  // Contador de produtos diferentes
  if (contador) {
    contador.textContent = produtosNoCarrinho;
  }
}

// ===== FINALIZAR PEDIDO =====
function finalizarPedido() {

  const nome =
    document
      .getElementById("nome-cliente")
      ?.value
      .trim() || "";

  const endereco =
    document
      .getElementById("endereco-cliente")
      ?.value
      .trim() || "";

  const observacao =
    document
      .getElementById("observacao-cliente")
      ?.value
      .trim() || "";

  if (!nome || !endereco) {

    alert(
      "Preencha seu NOME e ENDEREÇO!"
    );

    return;
  }

  const itens =
    produtos.filter(
      (p) =>
        Number(p.qtd || 0) > 0
    );

  if (itens.length === 0) {

    alert(
      "Seu carrinho está vazio!"
    );

    return;
  }

  let mensagem =
    `Olá! Meu nome é ${nome}.\n`;

  mensagem +=
    `Endereço para entrega: ${endereco}\n`;

  if (observacao) {

    mensagem +=
      `Observação: ${observacao}\n`;
  }

  mensagem +=
    `\nMEU PEDIDO:\n\n`;

  let totalPedido = 0;

  itens.forEach((p) => {

    const qtd =
      Number(p.qtd || 0);

    const preco =
      Number(p.preco || 0);

    const subtotal =
      preco * qtd;

    mensagem +=
      `${qtd}x ${p.nome} - ${formatarPreco(subtotal)}\n`;

    totalPedido += subtotal;
  });

  mensagem +=
    `\nTOTAL: ${formatarPreco(totalPedido)}`;

  const numeroWhatsApp =
    "5563999665779";

  const urlWhatsApp =
    `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;

  window.open(
    urlWhatsApp,
    "_blank"
  );
}

// ===== CARROSSEL =====
function iniciarCarrossel() {

  const slides =
    document.querySelectorAll(
      ".slide"
    );

  if (!slides.length) {
    return;
  }

  slides.forEach(
    (slide, index) => {

      if (index === 0) {
        slide.classList.add("active");
      }
    }
  );

  intervaloCarrossel =
    setInterval(() => {

      slides.forEach(
        (s) =>
          s.classList.remove("active")
      );

      slideAtual =
        (slideAtual + 1) %
        slides.length;

      slides[
        slideAtual
      ].classList.add("active");

    }, 3000);
}

// ===== INICIA SISTEMA =====
document.addEventListener(
  "DOMContentLoaded",
  function () {

    console.log(
      "🚀 Kamalo iniciado!"
    );

    iniciarMenuCategorias();

    iniciarCarrossel();

    document
      .getElementById("btn-finalizar")
      ?.addEventListener(
        "click",
        finalizarPedido
      );

    document
      .getElementById("btn-carrinho-flutuante")
      ?.addEventListener(
        "click",
        abrirCarrinho
      );

    document
      .getElementById("btn-topo")
      ?.addEventListener(
        "click",
        function () {

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        }
      );

    carregarProdutosDoSupabase();
  }
);