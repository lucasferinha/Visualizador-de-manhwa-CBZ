# Visualizador de Manhwa

## Descrição do Projeto
Um visualizador de arquivos CBZ para leitura de manhwas e quadrinhos diretamente no navegador, com interface otimizada e carregamento eficiente usando Web Workers.

## Como Usar

1. **Abrir o Projeto**: Abra o arquivo `index.html` em um navegador moderno
2. **Carregar Arquivos**: Clique em "Escolha os arquivos" para selecionar um ou mais arquivos CBZ
3. **Navegação**: Use o seletor de capítulos ou os botões de navegação para alternar entre os arquivos
4. **Leitura**: Role para baixo para visualizar todas as páginas do capítulo carregado

## Tecnologias Utilizadas

- **HTML5** - Estrutura da aplicação
- **CSS3** - Estilização com design responsivo
- **JavaScript ES6+** - Lógica da aplicação
- **JSZip** - Extração de arquivos CBZ
- **Web Workers** - Processamento em segundo plano
- **Intersection Observer API** - Carregamento lazy de imagens

## Estrutura de Arquivos

```
visualizador-manhwa/
├── index.html          # Página principal
├── style.css           # Estilos da aplicação
├── script.js           # Lógica JavaScript principal
├── frog.svg            # Logo do aplicativo
├── file-plus.svg       # Ícone de upload
├── grain.gif           # Textura de fundo
└── README.md           # Este arquivo
```

## Funcionalidades

- Suporte a múltiplos arquivos CBZ
- Navegação entre capítulos
- Carregamento lazy de imagens
- Interface responsiva
- Progresso de carregamento
- Extração em background com Web Workers
- Ordenação inteligente de páginas
- Design otimizado para leitura

## Otimizações Implementadas
- **Web Workers**: Processamento de arquivos em thread separada
- **Lazy Loading**: Imagens carregadas sob demanda
- **Gerenciamento de Memória**: Limpeza automática de URLs
- **Throttling**: Controle de frequência de navegação
- **Intersection Observer**: Carregamento eficiente de imagens


## Limitações Conhecidas
- Requer navegadores modernos com suporte a Web Workers
- Arquivos muito grandes podem demorar para processar
- Não suporta arquivos CBR (somente CBZ)

## Privacidade
- Todo processamento ocorre localmente no navegador
- Nenhum arquivo é enviado para servidores externos
- Dados são mantidos apenas durante a sessão

## Licença
Este projeto é open source e está disponível sob a licença MIT.

---

**Nota**: Para melhor performance, recomenda-se o uso de arquivos CBZ otimizados e conexão estável com a internet para carregamento das bibliotecas externas.