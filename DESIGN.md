# DESIGN.md - SmartPDV Omnichannel Design System

## 1. Visual Atmosphere & Philosophy
- **Style:** High-density, Industrial Retail Cashier, Dark Mode first (reduz fadiga ocular para operadores de turnos de 8 horas), alta taxa de contraste para leitura instantânea sob luz fluorescente de supermercado.
- **Audience:** Operadores de caixa de alta velocidade, supervisores de varejo e gerentes de loja.
- **Priority:** Legibilidade e ergonomia visual (Numpad dominance, tipografia monoespaçada tabular para valores e pesos).

## 2. Color Palette & Semantics
- **Background Root:** `#0B0F17` (Deep Obsidian / Slate 950)
- **Surface / Card:** `#111827` (Gray 900) com bordas em `#1F2937` (Gray 800)
- **Surface Highlight:** `#1E293B` (Slate 800)
- **Primary / Action (Enter / Finalizar):** `#10B981` (Emerald 500) | Hover: `#059669` (Emerald 600)
- **Warning / Atenção (Descontos / Sangria):** `#F59E0B` (Amber 500)
- **Danger / Bloqueio (Cancelamentos / Devoluções):** `#EF4444` (Red 500)
- **Info / Hardware (Balança / Impressora Online):** `#06B6D4` (Cyan 500)
- **Text Main:** `#F9FAFB` (Gray 50)
- **Text Muted:** `#9CA3AF` (Gray 400)
- **Price Display (Total Gigante):** `#34D399` (Emerald 400) em fundo de alto contraste `#064E3B` / `#022C22`

## 3. Typography & Numerical Representation
- **Fonts:** Inter ou Roboto para labels; `JetBrains Mono` ou `Fira Code` para preços, códigos de barras, pesagens e decimais.
- **Monetary Font:** `tabular-nums` ativo em todos os campos de preços para evitar desalinhamento visual durante digitação rápida.

## 4. Layout Architecture (1366x768 & 1920x1080 POS Optimized)
- **Top Header (Status Bar):**
  - Identificador da Empresa (Multi-tenant), Nº do Caixa (ex: `CAIXA 04`), Nome do Operador, Status Online/Offline (com contador de fila de sync pendente) e Indicador de Periféricos (Balança COM, Impressora ESC/POS).
- **Corpo Esquerdo (65% largura): Grid de Vendas & Leitura:**
  - Campo de leitura com foco permanente (Auto-focus resiliente).
  - Tabela densa de itens bipados: `#`, `Código`, `Descrição`, `Qtd`, `Un`, `Vl. Unit`, `Subtotal`.
- **Corpo Direito (35% largura): Totalizador & Feedback em Tempo Real:**
  - Card de último item bipado (foto miniatura, descrição e peso).
  - Painel de Total Geral em tamanho ultra-destacado (48px+).
  - Seletor rápido de Forma de Pagamento (F5 / Numpad).
- **Rodapé Fixo (Keyboard Legend Bar):**
  - Atalhos padronizados exibidos em badges visuais: `[F1] Buscar`, `[F2] Qtd *`, `[F3] Desconto`, `[F4] Consulta`, `[F5] Subtotal`, `[F7] Fidelidade/CPF`, `[F8] Cancela Item`, `[F12] Gaveta/Menu`, `[ESC] Sair`.
